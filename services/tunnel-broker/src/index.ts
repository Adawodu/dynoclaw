/**
 * DynoClaw Tunnel Broker — Cloud Run entry point.
 *
 * Routes:
 *   GET /health                → 200 OK
 *   GET /app/:deploymentId     → proxies HTTP to the VM's OpenClaw dashboard
 *   WS  /app/:deploymentId     → proxies WebSocket to the VM's OpenClaw dashboard
 *   (any other path)           → 404
 *
 * Auth: JWT in ?token= query param (short-lived, signed by the dashboard with
 * TUNNEL_BROKER_SECRET).
 */

import http from "node:http";
import { URL } from "node:url";
import { verifyTunnelJwt } from "./jwt.js";
import { proxyHttpRequest, proxyWebSocketUpgrade, type ProxyTarget } from "./http-proxy.js";

const PORT = parseInt(process.env.PORT ?? "8080", 10);
const BROKER_SECRET = process.env.TUNNEL_BROKER_SECRET;
const OPENCLAW_GATEWAY_PORT = 18789;

if (!BROKER_SECRET) {
  console.error("FATAL: TUNNEL_BROKER_SECRET environment variable is not set");
  process.exit(1);
}

function log(level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) {
  const entry = { severity: level.toUpperCase(), message: msg, ...extra };
  console.log(JSON.stringify(entry));
}

// Known static path prefixes that the OpenClaw gateway serves directly.
// When the browser resolves relative URLs from /app/<id>/, paths like
// ./assets/foo.js become /app/assets/foo.js — "assets" is NOT a deploymentId.
const STATIC_PREFIXES = new Set(["assets", "favicon.svg", "favicon-32.png", "apple-touch-icon.png"]);

/**
 * Parse /app/:deploymentId from a URL path.
 * Returns null for any other path shape.
 * Handles static asset paths: /app/assets/foo.js → rest="/assets/foo.js"
 */
function parseAppPath(pathname: string): { deploymentId: string; rest: string; isAsset: boolean } | null {
  const match = pathname.match(/^\/app\/([^/]+)(\/.*)?$/);
  if (!match) return null;

  const firstSegment = decodeURIComponent(match[1]);
  const remainder = match[2] ?? "";

  // If the first segment after /app/ is a static prefix, it's an asset request
  // not a real deploymentId. Reconstruct the full upstream path.
  if (STATIC_PREFIXES.has(firstSegment) || firstSegment.includes(".")) {
    return {
      deploymentId: "__asset__",
      rest: `/${firstSegment}${remainder}`,
      isAsset: true,
    };
  }

  return {
    deploymentId: firstSegment,
    rest: remainder || "/",
    isAsset: false,
  };
}

async function extractTarget(
  token: string,
  expectedDeploymentId: string,
): Promise<ProxyTarget | { error: string; status: number }> {
  try {
    const claims = await verifyTunnelJwt(token, BROKER_SECRET!);
    // Defense in depth: the deploymentId in the URL must match the JWT claim
    if (claims.deploymentId !== expectedDeploymentId) {
      return { error: "Deployment ID mismatch between URL and token", status: 403 };
    }
    return {
      project: claims.gcpProjectId,
      zone: claims.gcpZone,
      instance: claims.vmName,
      port: OPENCLAW_GATEWAY_PORT,
    };
  } catch (err) {
    return {
      error: `Invalid tunnel token: ${err instanceof Error ? err.message : String(err)}`,
      status: 401,
    };
  }
}

// In-memory session store: maps session ID → { target, expiresAt }
// Sessions are short-lived (5 min, matching JWT TTL) and auto-cleaned.
const sessions = new Map<string, { target: ProxyTarget; expiresAt: number }>();
// Deployment target cache: maps deploymentId → target (for asset requests)
// Populated when a JWT-authenticated request comes in. Assets use this as fallback.
const deploymentTargets = new Map<string, { target: ProxyTarget; expiresAt: number }>();

// ── Rate Limiter ──────────────────────────────────────────────────
// Sliding window per IP: max 60 authenticated requests per minute,
// 200 asset requests per minute. Prevents abuse without impacting normal use.
const RATE_LIMIT_AUTH = 60;    // JWT-bearing requests per window
const RATE_LIMIT_ASSET = 200;  // Asset requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute window

const rateBuckets = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(ip: string, bucket: string, limit: number): boolean {
  const key = `${ip}:${bucket}`;
  const now = Date.now();
  const entry = rateBuckets.get(key);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

function cleanExpiredCaches() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (session.expiresAt < now) sessions.delete(id);
  }
  for (const [id, entry] of deploymentTargets) {
    if (entry.expiresAt < now) deploymentTargets.delete(id);
  }
  for (const [key, entry] of rateBuckets) {
    if (now - entry.windowStart > RATE_WINDOW_MS) rateBuckets.delete(key);
  }
}
// Clean every 60s
setInterval(cleanExpiredCaches, 60_000);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  // Health check
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  // Root for smoke testing
  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("DynoClaw Tunnel Broker");
    return;
  }

  const parsed = parseAppPath(url.pathname);
  if (!parsed) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  // Rate limit by client IP
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";

  // Auth strategy:
  // 1. JWT in ?token= → validate, cache target by deploymentId, proxy
  // 2. Asset requests (/assets/, favicon, .js, .css) → use cached deployment target (no auth needed)
  //    Assets are static files — the HTML page is token-protected, assets are useless without it.
  // 3. No token + no cache → 401
  const token = url.searchParams.get("token");
  const isAssetRequest = parsed.isAsset ||
    /\/(assets|favicon|apple-touch|manifest)\b/.test(parsed.rest) ||
    /\.(js|css|png|jpg|jpeg|svg|woff2?|ico|json|map)$/i.test(parsed.rest);
  let target: ProxyTarget | null = null;

  // Apply rate limiting
  const rateBucket = token ? "auth" : "asset";
  const rateLimit = token ? RATE_LIMIT_AUTH : RATE_LIMIT_ASSET;
  if (!checkRateLimit(clientIp, rateBucket, rateLimit)) {
    log("warn", "rate limited", { ip: clientIp, bucket: rateBucket, path: url.pathname });
    res.writeHead(429, { "Content-Type": "text/plain", "Retry-After": "60" });
    res.end("Too many requests. Try again in a minute.");
    return;
  }

  if (token) {
    // JWT-authenticated request — validate and cache
    const result = await extractTarget(token, parsed.deploymentId);
    if ("error" in result) {
      log("warn", "token validation failed", { error: result.error, path: url.pathname });
      res.writeHead(result.status, { "Content-Type": "text/plain" });
      res.end(result.error);
      return;
    }
    target = result;
    // Cache this deployment's target for subsequent asset requests
    deploymentTargets.set(parsed.deploymentId, {
      target,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 min cache
    });
  } else if (isAssetRequest) {
    // Asset requests (e.g. /app/assets/foo.js) have deploymentId="__asset__" because
    // the browser resolves relative URLs from the page. We can only serve them if
    // exactly ONE deployment is cached (single-tenant invariant for now).
    // Multi-tenant: when the broker serves multiple users simultaneously, assets
    // will need a cookie or referrer-based lookup to route correctly.
    if (parsed.deploymentId === "__asset__" && deploymentTargets.size === 1) {
      const [, entry] = deploymentTargets.entries().next().value as [string, { target: ProxyTarget; expiresAt: number }];
      if (entry.expiresAt > Date.now()) {
        target = entry.target;
      }
    } else {
      const cached = deploymentTargets.get(parsed.deploymentId);
      if (cached && cached.expiresAt > Date.now()) {
        target = cached.target;
      }
    }
  }

  if (!target) {
    res.writeHead(401, { "Content-Type": "text/plain" });
    res.end("Missing ?token= or session expired. Reload the page.");
    return;
  }

  log("info", "proxying HTTP request", {
    deploymentId: parsed.deploymentId,
    project: target.project,
    zone: target.zone,
    instance: target.instance,
    method: req.method,
    path: parsed.rest,
  });

  try {
    await proxyHttpRequest(req, res, target, parsed.rest);
  } catch (err) {
    log("error", "proxyHttpRequest threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal error");
    }
  }
});

server.on("upgrade", async (req, socket, head) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const parsed = parseAppPath(url.pathname);
    if (!parsed) {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }

    // WS auth: token from query param OR cached deployment target
    const wsToken = url.searchParams.get("token");
    let wsTarget: ProxyTarget | null = null;

    if (wsToken) {
      const result = await extractTarget(wsToken, parsed.deploymentId);
      if ("error" in result) {
        log("warn", "WS token validation failed", { error: result.error });
        socket.write(`HTTP/1.1 ${result.status} ${result.error}\r\n\r\n`);
        socket.destroy();
        return;
      }
      wsTarget = result;
    } else {
      // Try cached deployment target (WS opened from the already-authenticated page)
      const cached = deploymentTargets.get(parsed.deploymentId);
      if (cached && cached.expiresAt > Date.now()) {
        wsTarget = cached.target;
      }
    }

    if (!wsTarget) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const target = wsTarget;

    log("info", "proxying WebSocket upgrade", {
      deploymentId: parsed.deploymentId,
      project: target.project,
      instance: target.instance,
      path: parsed.rest,
    });

    await proxyWebSocketUpgrade(req, socket, head, target, parsed.rest);
  } catch (err) {
    log("error", "upgrade handler threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    socket.destroy();
  }
});

server.listen(PORT, () => {
  log("info", `tunnel-broker listening on :${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  log("info", "SIGTERM received, shutting down");
  server.close(() => process.exit(0));
});
