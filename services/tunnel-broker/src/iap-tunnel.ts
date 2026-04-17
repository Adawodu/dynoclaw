/**
 * Minimal IAP-for-TCP tunnel client for Node.js.
 *
 * Ports the subprotocol framing from Google's gcloud SDK:
 *   lib/googlecloudsdk/api_lib/compute/iap_tunnel_websocket_utils.py
 *
 * Exposes a Duplex-style interface:
 *   - send(Buffer)   — write raw bytes to the VM
 *   - onData(cb)     — receive raw bytes from the VM
 *   - onClose(cb)    — notified when tunnel closes
 *   - close()        — tear down the tunnel
 *
 * No reconnect / SID resumption: Cloud Run request lifetimes are short, so
 * we open a fresh tunnel per proxied request/WebSocket. Simpler than the
 * full gcloud state machine.
 */

import { Duplex } from "node:stream";
import WebSocket from "ws";

const TAG_CONNECT_SUCCESS_SID = 0x0001;
// const TAG_RECONNECT_SUCCESS_ACK = 0x0002; // not used without resumption
const TAG_DATA = 0x0004;
const TAG_ACK = 0x0007;
const MAX_DATA_FRAME_SIZE = 16384;
const SUBPROTOCOL = "relay.tunnel.cloudproxy.app";
const TUNNEL_CLOUDPROXY_ORIGIN = "bot:iap-tunneler";
const CONNECT_TIMEOUT_MS = 30_000;

export interface IapTunnelOptions {
  project: string;
  zone: string;
  instance: string;
  port: number;
  /** OAuth2 access token with cloud-platform scope and roles/iap.tunnelResourceAccessor. */
  accessToken: string;
  /** Optional network interface name (defaults to nic0). */
  networkInterface?: string;
  /** Optional user-agent string. */
  userAgent?: string;
}

/**
 * Open an IAP-for-TCP tunnel and return a Duplex stream that you can pipe
 * HTTP or WebSocket traffic through. The stream represents a single raw TCP
 * connection to the VM on the requested port.
 */
export async function openIapTunnelSocket(
  opts: IapTunnelOptions,
): Promise<Duplex> {
  const qs = new URLSearchParams({
    project: opts.project,
    zone: opts.zone,
    instance: opts.instance,
    interface: opts.networkInterface ?? "nic0",
    port: String(opts.port),
    newWebsocket: "true",
  });
  const url = `wss://tunnel.cloudproxy.app/v4/connect?${qs}`;

  const ws = new WebSocket(url, [SUBPROTOCOL], {
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "User-Agent": opts.userAgent ?? "dynoclaw-tunnel-broker/0.1",
      Origin: TUNNEL_CLOUDPROXY_ORIGIN,
    },
    perMessageDeflate: false,
    maxPayload: 128 * 1024, // frames are at most ~16KB payload + 6 bytes header
  });

  // Flow-control state
  let totalBytesReceived = 0n;
  let lastAckedReceived = 0n;
  // let totalBytesSent = 0n;  // tracked locally but not used without resumption
  let connected = false;

  // Build the Duplex that represents the raw VM socket.
  // We attach a default error handler so unhandled 'error' events don't crash the process.
  const socket = new Duplex({
    allowHalfOpen: false,
    read() {
      // we push data in the ws 'message' handler; nothing to do on pull
    },
    write(chunk: Buffer, _encoding, callback) {
      if (ws.readyState !== WebSocket.OPEN) {
        callback(new Error("IAP tunnel WebSocket is not open"));
        return;
      }
      try {
        let offset = 0;
        while (offset < chunk.length) {
          const end = Math.min(offset + MAX_DATA_FRAME_SIZE, chunk.length);
          const slice = chunk.subarray(offset, end);
          const frame = buildDataFrame(slice);
          ws.send(frame);
          // totalBytesSent += BigInt(slice.length);
          offset = end;
        }
        callback();
      } catch (err) {
        callback(err instanceof Error ? err : new Error(String(err)));
      }
    },
    final(callback) {
      try {
        ws.close(1000, "stream end");
      } catch {
        // ignore
      }
      callback();
    },
    destroy(err, callback) {
      try {
        ws.close(err ? 1011 : 1000);
      } catch {
        // ignore
      }
      callback(err);
    },
  });

  // Attach a no-op error listener so unhandled errors don't crash the process.
  // Callers should attach their own handler after receiving the socket.
  socket.on("error", (err) => {
    console.error(
      JSON.stringify({
        severity: "ERROR",
        message: "iap-tunnel socket error",
        error: err.message,
      }),
    );
  });

  // Handle incoming messages from the tunnel
  ws.on("message", (raw: Buffer) => {
    try {
      handleFrame(raw);
    } catch (err) {
      socket.destroy(err instanceof Error ? err : new Error(String(err)));
      try {
        ws.close(1002, "protocol error");
      } catch {
        // ignore
      }
    }
  });

  ws.on("close", (code: number, reason: Buffer) => {
    const reasonStr = reason.toString("utf8");
    if (code === 4003) {
      socket.destroy(
        new Error(
          `IAP tunnel closed (4003): nothing listening on target port or firewall blocks it. ${reasonStr}`,
        ),
      );
    } else if (code === 4004) {
      socket.destroy(
        new Error(`IAP tunnel closed (4004): reauth required. ${reasonStr}`),
      );
    } else if (!socket.destroyed) {
      socket.push(null); // signal EOF
    }
  });

  ws.on("error", (err) => {
    if (!socket.destroyed) {
      socket.destroy(err);
    }
  });

  function handleFrame(buf: Buffer): void {
    if (buf.length < 2) {
      throw new Error(`IAP frame too short: ${buf.length} bytes`);
    }
    const tag = buf.readUInt16BE(0);

    switch (tag) {
      case TAG_CONNECT_SUCCESS_SID: {
        if (buf.length < 6) {
          throw new Error("CONNECT_SUCCESS_SID frame too short");
        }
        const sidLen = buf.readUInt32BE(2);
        if (buf.length < 6 + sidLen) {
          throw new Error(
            `CONNECT_SUCCESS_SID frame truncated: header says ${sidLen}, got ${buf.length - 6}`,
          );
        }
        // const sid = buf.subarray(6, 6 + sidLen); // saved for resumption; unused
        connected = true;
        break;
      }
      case TAG_DATA: {
        if (!connected) {
          throw new Error("Received DATA before CONNECT_SUCCESS_SID");
        }
        if (buf.length < 6) {
          throw new Error("DATA frame too short");
        }
        const dataLen = buf.readUInt32BE(2);
        if (buf.length < 6 + dataLen) {
          throw new Error(
            `DATA frame truncated: header says ${dataLen}, got ${buf.length - 6}`,
          );
        }
        const payload = buf.subarray(6, 6 + dataLen);
        totalBytesReceived += BigInt(dataLen);

        // Push to the Duplex; handle backpressure
        socket.push(payload);

        // Send delayed ACK when unacked bytes exceed 2 * MAX_DATA_FRAME_SIZE
        if (
          totalBytesReceived - lastAckedReceived >
          BigInt(2 * MAX_DATA_FRAME_SIZE)
        ) {
          try {
            ws.send(buildAckFrame(totalBytesReceived));
            lastAckedReceived = totalBytesReceived;
          } catch {
            // best-effort — the ws may be closing
          }
        }
        break;
      }
      case TAG_ACK: {
        if (buf.length < 10) {
          throw new Error("ACK frame too short");
        }
        // We track confirmed bytes for future resumption; currently unused
        // const confirmed = buf.readBigUInt64BE(2);
        break;
      }
      default:
        // Unknown frame types are ignored per gcloud's behavior
        break;
    }
  }

  // Wait for CONNECT_SUCCESS_SID (with timeout)
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`IAP tunnel connect timeout after ${CONNECT_TIMEOUT_MS}ms`));
    }, CONNECT_TIMEOUT_MS);

    const pollIv = setInterval(() => {
      if (connected) {
        clearTimeout(timer);
        clearInterval(pollIv);
        resolve();
      }
    }, 10);

    ws.once("error", (err) => {
      clearTimeout(timer);
      clearInterval(pollIv);
      reject(err);
    });
    ws.once("unexpected-response", (_req, res) => {
      clearTimeout(timer);
      clearInterval(pollIv);
      reject(
        new Error(
          `IAP tunnel upgrade rejected: HTTP ${res.statusCode} ${res.statusMessage}. ` +
            `Likely missing roles/iap.tunnelResourceAccessor or firewall blocks IAP range.`,
        ),
      );
    });
    ws.once("close", (code, reason) => {
      if (!connected) {
        clearTimeout(timer);
        clearInterval(pollIv);
        reject(
          new Error(
            `IAP tunnel closed before handshake: code=${code} reason=${reason.toString("utf8")}`,
          ),
        );
      }
    });
  });

  return socket;
}

/** Build a subprotocol DATA frame: [0x0004][uint32 len][payload] */
function buildDataFrame(payload: Buffer): Buffer {
  const frame = Buffer.alloc(6 + payload.length);
  frame.writeUInt16BE(TAG_DATA, 0);
  frame.writeUInt32BE(payload.length, 2);
  payload.copy(frame, 6);
  return frame;
}

/** Build a subprotocol ACK frame: [0x0007][uint64 totalRecv] */
function buildAckFrame(totalReceived: bigint): Buffer {
  const frame = Buffer.alloc(10);
  frame.writeUInt16BE(TAG_ACK, 0);
  frame.writeBigUInt64BE(totalReceived, 2);
  return frame;
}
