/**
 * HTTP + WebSocket proxy that streams traffic through an IAP-for-TCP tunnel.
 *
 * Uses raw Node http/ws + net.Duplex (the IAP tunnel socket). We parse the
 * minimum needed to rewrite response headers so the OpenClaw UI can be
 * iframed inside DynoClaw.
 */

import http, { type IncomingMessage, type ServerResponse } from "node:http";
import type { Duplex } from "node:stream";
import WebSocket from "ws";
import { openIapTunnelSocket } from "./iap-tunnel.js";
import { GoogleAuth } from "google-auth-library";

const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

async function getAccessToken(): Promise<string> {
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) {
    throw new Error("Failed to get GCP access token from metadata server");
  }
  return token.token;
}

export interface ProxyTarget {
  project: string;
  zone: string;
  instance: string;
  port: number;
}

/**
 * Handle an inbound HTTP request: open a tunnel, forward the request,
 * stream the response back with X-Frame-Options/CSP stripped.
 */
export async function proxyHttpRequest(
  clientReq: IncomingMessage,
  clientRes: ServerResponse,
  target: ProxyTarget,
  upstreamPath: string,
): Promise<void> {
  let tunnel: Duplex | null = null;
  try {
    const accessToken = await getAccessToken();
    tunnel = await openIapTunnelSocket({
      project: target.project,
      zone: target.zone,
      instance: target.instance,
      port: target.port,
      accessToken,
    });
  } catch (err) {
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { "Content-Type": "text/plain" });
      clientRes.end(
        `Tunnel broker: failed to open IAP tunnel: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return;
  }

  // Build an http.request that uses our tunnel as the transport
  const method = clientReq.method ?? "GET";
  const forwardedHeaders = sanitizeRequestHeaders(clientReq.headers);
  // Preserve Host header pointing at loopback (OpenClaw binds to 127.0.0.1)
  forwardedHeaders.host = `127.0.0.1:${target.port}`;

  const upstreamReq = http.request({
    createConnection: () => tunnel as unknown as import("node:net").Socket,
    method,
    path: upstreamPath,
    headers: forwardedHeaders,
  });

  upstreamReq.on("response", (upstreamRes) => {
    const rewrittenHeaders = rewriteResponseHeaders(upstreamRes.headers);
    clientRes.writeHead(upstreamRes.statusCode ?? 502, rewrittenHeaders);
    upstreamRes.pipe(clientRes);
    upstreamRes.on("end", () => {
      tunnel?.destroy();
    });
  });

  upstreamReq.on("error", (err) => {
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { "Content-Type": "text/plain" });
      clientRes.end(`Tunnel broker: upstream error: ${err.message}`);
    } else {
      clientRes.destroy();
    }
    tunnel?.destroy();
  });

  // Pipe the client request body through
  clientReq.pipe(upstreamReq);
}

/**
 * Handle an inbound WebSocket upgrade: open a tunnel, upgrade upstream on
 * the OpenClaw gateway, pipe frames in both directions.
 */
export async function proxyWebSocketUpgrade(
  clientReq: IncomingMessage,
  clientSocket: Duplex,
  head: Buffer,
  target: ProxyTarget,
  upstreamPath: string,
): Promise<void> {
  let tunnel: Duplex | null = null;
  try {
    const accessToken = await getAccessToken();
    tunnel = await openIapTunnelSocket({
      project: target.project,
      zone: target.zone,
      instance: target.instance,
      port: target.port,
      accessToken,
    });
  } catch (err) {
    writeSocketError(
      clientSocket,
      502,
      `Tunnel broker failed to open IAP tunnel: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return;
  }

  // Open an upstream WebSocket using our tunnel as the transport
  const forwardedHeaders = sanitizeRequestHeaders(clientReq.headers);
  delete forwardedHeaders["sec-websocket-key"];
  delete forwardedHeaders["sec-websocket-version"];
  delete forwardedHeaders["sec-websocket-extensions"];
  delete forwardedHeaders["upgrade"];
  delete forwardedHeaders["connection"];
  forwardedHeaders.host = `127.0.0.1:${target.port}`;

  const upstreamWs = new WebSocket(
    `ws://127.0.0.1:${target.port}${upstreamPath}`,
    {
      headers: forwardedHeaders as Record<string, string>,
      perMessageDeflate: false,
      createConnection: () => tunnel as unknown as import("node:net").Socket,
    } as WebSocket.ClientOptions,
  );

  upstreamWs.on("open", () => {
    // Complete the client-side upgrade by hijacking with a fresh WS server
    const wss = new WebSocket.Server({ noServer: true });
    wss.handleUpgrade(clientReq, clientSocket, head, (clientWs) => {
      // Bidirectional pipe
      clientWs.on("message", (data, isBinary) => {
        if (upstreamWs.readyState === WebSocket.OPEN) {
          upstreamWs.send(data, { binary: isBinary });
        }
      });
      upstreamWs.on("message", (data, isBinary) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data, { binary: isBinary });
        }
      });

      clientWs.on("close", (code, reason) => {
        try {
          upstreamWs.close(code, reason);
        } catch {
          // ignore
        }
        tunnel?.destroy();
      });
      upstreamWs.on("close", (code, reason) => {
        try {
          clientWs.close(code, reason);
        } catch {
          // ignore
        }
        tunnel?.destroy();
      });

      clientWs.on("error", () => {
        try {
          upstreamWs.terminate();
        } catch {
          // ignore
        }
        tunnel?.destroy();
      });
      upstreamWs.on("error", () => {
        try {
          clientWs.terminate();
        } catch {
          // ignore
        }
        tunnel?.destroy();
      });
    });
  });

  upstreamWs.on("error", (err) => {
    writeSocketError(
      clientSocket,
      502,
      `Upstream WebSocket error: ${err.message}`,
    );
    tunnel?.destroy();
  });
}

/**
 * Remove hop-by-hop and disallowed headers from the inbound request before
 * forwarding to the VM.
 */
function sanitizeRequestHeaders(
  headers: http.IncomingHttpHeaders,
): Record<string, string | string[] | undefined> {
  const out: Record<string, string | string[] | undefined> = {};
  const blocked = new Set([
    "connection",
    "proxy-connection",
    "keep-alive",
    "transfer-encoding",
    "te",
    "trailer",
    "upgrade",
    "proxy-authorization",
    "proxy-authenticate",
    // Don't leak broker's own auth token
    "authorization",
    // Don't leak the JWT
    "x-tunnel-token",
  ]);
  for (const [k, v] of Object.entries(headers)) {
    if (!blocked.has(k.toLowerCase())) {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Rewrite response headers so the OpenClaw UI can be embedded in an iframe.
 * Strips X-Frame-Options and removes frame-ancestors from CSP.
 */
function rewriteResponseHeaders(
  headers: http.IncomingHttpHeaders,
): http.OutgoingHttpHeaders {
  const out: http.OutgoingHttpHeaders = {};
  for (const [k, v] of Object.entries(headers)) {
    const lower = k.toLowerCase();

    // Remove X-Frame-Options entirely (so iframe works)
    if (lower === "x-frame-options") continue;

    // Rewrite CSP to remove frame-ancestors restriction
    if (lower === "content-security-policy") {
      if (typeof v === "string") {
        out[k] = stripFrameAncestors(v);
      } else if (Array.isArray(v)) {
        out[k] = v.map((s) => stripFrameAncestors(s));
      }
      continue;
    }

    // Strip hop-by-hop headers
    if (
      lower === "connection" ||
      lower === "keep-alive" ||
      lower === "transfer-encoding" ||
      lower === "upgrade"
    ) {
      continue;
    }

    out[k] = v;
  }
  return out;
}

function stripFrameAncestors(csp: string): string {
  return csp
    .split(";")
    .map((d) => d.trim())
    .filter((d) => !d.toLowerCase().startsWith("frame-ancestors"))
    .join("; ");
}

function writeSocketError(socket: Duplex, status: number, message: string): void {
  try {
    socket.write(
      `HTTP/1.1 ${status} ${message}\r\n` +
        `Content-Type: text/plain\r\n` +
        `Content-Length: ${Buffer.byteLength(message)}\r\n` +
        `Connection: close\r\n` +
        `\r\n` +
        message,
    );
    socket.end();
  } catch {
    socket.destroy();
  }
}
