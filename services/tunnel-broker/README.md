# DynoClaw Tunnel Broker

Cloud Run service that proxies DynoClaw users' browsers to their OpenClaw dashboard on a GCP VM via IAP-for-TCP. Enables the embedded `/openclaw` console experience in DynoClaw without requiring users to install `gcloud` CLI.

## How it works

```
Browser                DynoClaw Dashboard           Tunnel Broker (Cloud Run)             GCP VM
  │                         │                              │                                │
  │  Click "AI Console"     │                              │                                │
  ├────────────────────────▶│                              │                                │
  │                         │  POST /api/gcp/tunnel-token  │                                │
  │                         │  (validates ownership)       │                                │
  │                         │  mints HS256 JWT             │                                │
  │                         │                              │                                │
  │  iframe src=…?token=<j> │                              │                                │
  │◀────────────────────────┤                              │                                │
  │                         │                              │                                │
  │  GET /app/:id?token=…   │                              │                                │
  ├────────────────────────────────────────────────────────▶│                                │
  │                         │                              │  IAP-for-TCP wss://            │
  │                         │                              │  tunnel.cloudproxy.app/v4/…    │
  │                         │                              ├───────────────────────────────▶│ 18789
  │                         │                              │  raw TCP (OpenClaw HTTP/WS)    │
  │                         │                              │◀───────────────────────────────┤
  │  HTML + JS + WS (proxied)                              │                                │
  │  (with X-Frame-Options stripped so iframe works)       │                                │
  │◀───────────────────────────────────────────────────────┤                                │
```

## Environment variables

| Var | Required | Description |
|-----|----------|-------------|
| `PORT` | Cloud Run-injected | HTTP server port (default 8080) |
| `TUNNEL_BROKER_SECRET` | yes | HS256 shared secret with DynoClaw dashboard (used to verify JWTs) |
| `LOG_LEVEL` | no | `debug`, `info`, `warn`, `error` (default `info`) |

## Local dev

```bash
npm install
npm run dev
```

Then hit `http://localhost:8080/health` to verify it's running.

To test a real tunnel locally you need `gcloud auth application-default login` and `roles/iap.tunnelResourceAccessor` on a target VM.

## Deploy to Cloud Run

**Auto-deploy**: A Cloud Build trigger watches `services/tunnel-broker/**` on the `main` branch and deploys automatically. See `cloudbuild.yaml`.

**Manual deploy** (if needed):

```bash
gcloud run deploy dynoclaw-tunnel-broker \
  --source . \
  --project=dynoclaw-managed \
  --region=us-central1 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=3600 \
  --memory=512Mi \
  --service-account=dynoclaw-admin@dynoclaw-managed.iam.gserviceaccount.com \
  --set-secrets=TUNNEL_BROKER_SECRET=tunnel-broker-secret:latest \
  --allow-unauthenticated
```

The service account needs `roles/iap.tunnelResourceAccessor` on the managed VMs.

## Architecture notes

- **Per-request tunnel**: no connection pooling. Each HTTP request/WebSocket opens a fresh IAP tunnel. Simpler than SID resumption, and Cloud Run request lifetimes are short (max 1 hr) anyway.
- **Flow control**: ACKs sent when unacked bytes exceed `2 * 16384` (matches gcloud's delayed-ack heuristic).
- **Header rewriting**: `X-Frame-Options` and `Content-Security-Policy` (`frame-ancestors`) are stripped from upstream responses so the OpenClaw UI can be iframed.
- **Rate limiting**: 60 JWT-authenticated requests/min + 200 asset requests/min per IP. Returns 429 with `Retry-After: 60`.
- **Asset cache**: JWT-authenticated requests cache the deployment target for 10 minutes. Asset requests use the cache. Single-tenant invariant: `__asset__` paths only resolve when exactly one deployment is cached.
- **Security modes**: The broker itself doesn't enforce security modes — those are configured in the OpenClaw gateway on the VM. The broker only validates JWT ownership and proxies traffic.
