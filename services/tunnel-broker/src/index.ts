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

/**
 * Parse /app/:deploymentId from a URL path.
 * Returns null for any other path shape.
 */
function parseAppPath(pathname: string): { deploymentId: string; rest: string } | null {
  const match = pathname.match(/^\/app\/([^/]+)(\/.*)?$/);
  if (!match) return null;
  return {
    deploymentId: decodeURIComponent(match[1]),
    rest: match[2] ?? "/",
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

  const token = url.searchParams.get("token");
  if (!token) {
    res.writeHead(401, { "Content-Type": "text/plain" });
    res.end("Missing ?token=");
    return;
  }

  const target = await extractTarget(token, parsed.deploymentId);
  if ("error" in target) {
    log("warn", "token validation failed", { error: target.error, path: url.pathname });
    res.writeHead(target.status, { "Content-Type": "text/plain" });
    res.end(target.error);
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

    const token = url.searchParams.get("token");
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const target = await extractTarget(token, parsed.deploymentId);
    if ("error" in target) {
      log("warn", "WS token validation failed", { error: target.error });
      socket.write(`HTTP/1.1 ${target.status} ${target.error}\r\n\r\n`);
      socket.destroy();
      return;
    }

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
