# DynoClaw Architecture Overview

**Last updated**: 2026-04-17

## What DynoClaw Does (Plain English)

DynoClaw deploys an AI teammate on a GCP virtual machine that you chat with via Telegram. Think of it as a self-hosted ChatGPT that can actually DO things — send emails, post on social media, generate images, manage your CRM, and run on a schedule.

### The Big Picture

```
You (Telegram) ←→ OpenClaw on a VM ←→ Gemini / Claude / GPT
                      ↕
              Plugins (email, social, CRM)
              Skills (briefings, carousels, reports)
              Knowledge (Convex DB)
```

---

## Components

### 1. Dashboard (www.dynoclaw.com)

**What**: Next.js 14 app on Vercel. The control panel where users deploy, configure, and manage their AI teammate.

**Key pages**:
- `/deploy` — Deploy wizard (choose hosting, model, plugins, API keys)
- `/overview` — Deployment status + health
- `/openclaw` — Embedded OpenClaw console (via tunnel broker)
- `/billing` — Stripe subscription management
- `/admin/users` — Admin view of all users + deployments

**Auth**: Clerk (sign-in/sign-up, JWT for Convex)

**Tech**: Next.js 14, Clerk, Convex React client, Tailwind CSS, shadcn/ui

### 2. Convex Cloud Database

**What**: Real-time database that stores all platform data. Both the dashboard and the VMs read/write to it.

**Deployment**: `fortunate-seahorse-362.convex.cloud` (production)

**What's stored**:
- Users (Clerk ID, role, status)
- Deployments (GCP project, zone, VM name, status)
- Subscriptions (Stripe IDs, plan, trial status)
- Pricing plans (dynamic, admin-editable)
- Knowledge base (text + Gemini 1536-dim embeddings)
- Media (generated images/videos, stored in Convex file storage)
- Inbox scans, action queue, job search data
- Plugin/skill configs per deployment

**Embeddings**: Gemini `gemini-embedding-001` at 1536 dimensions (migrated from OpenAI `text-embedding-3-small` on 2026-04-07)

### 3. GCP — dynoclaw-managed Project

**What**: The GCP project where DynoClaw-managed VMs live. Owned by DynoClaw, not the customer.

**Resources**:

| Resource | Purpose |
|----------|---------|
| **Compute Engine VMs** | Each customer gets their own VM (`openclaw-vm-<hash>`) running OpenClaw |
| **Cloud NAT** | Outbound internet for VMs (no external IP for security) |
| **Secret Manager** | API keys (Telegram, Gemini, OpenRouter, etc.) per deployment |
| **IAP-for-TCP** | Secure tunnel into VMs without exposing them publicly |
| **Cloud Run** | Tunnel broker service (`dynoclaw-tunnel-broker`) that proxies dashboard → VM |
| **Artifact Registry** | Docker images for the tunnel broker |
| **Firewall rules** | `allow-iap-ssh` (port 22), `allow-iap-dashboard` (port 18789), `deny-all-ingress` |

**Service Account**: `dynoclaw-admin@dynoclaw-managed.iam.gserviceaccount.com`
- Roles: `compute.admin`, `secretmanager.admin`, `iam.serviceAccountAdmin`, `iam.serviceAccountUser`, `iap.tunnelResourceAccessor`, `serviceusage.serviceUsageAdmin`

### 4. OpenClaw (on each VM)

**What**: The open-source AI agent framework that runs on each customer's VM. Version: `2026.4.8`.

**Components on each VM**:
- **Gateway** (`openclaw-gateway`): HTTP + WebSocket server on port 18789 (loopback-only)
- **Telegram channel**: Polls Telegram for messages, routes to the agent
- **Agent runtime**: Processes messages using Gemini/Claude/GPT via OpenRouter
- **Plugin system**: Loads extensions (agentmail, postiz, carousel-gen, etc.)
- **Skill system**: Markdown-based skill definitions (daily-briefing, comic-brief, etc.)
- **Cron scheduler**: Runs skills on schedule (daily posts, briefings, engagement monitoring)
- **Memory**: QMD + SQLite for conversation memory, Convex for persistent knowledge

**Config**: `/root/.openclaw/openclaw.json` — all settings, plugin configs, channel settings

### 5. Tunnel Broker (Cloud Run)

**What**: A Node.js service that lets the DynoClaw dashboard access the OpenClaw console on a customer's VM without requiring the customer to install `gcloud` CLI.

**URL**: `https://dynoclaw-tunnel-broker-108022247971.us-central1.run.app`

**How it works**:
1. Dashboard mints a 5-minute JWT (signed with shared secret, contains deployment details)
2. Dashboard renders an iframe pointing at `broker/app/<deploymentId>?token=<jwt>`
3. Broker validates JWT
4. Broker opens an IAP-for-TCP tunnel (WebSocket to `wss://tunnel.cloudproxy.app/v4/connect`)
5. Broker proxies HTTP + WebSocket through the tunnel to VM port 18789
6. Broker strips `X-Frame-Options` and `frame-ancestors` from responses so the iframe works
7. User sees the full OpenClaw console embedded in the DynoClaw dashboard

**IAP Protocol**: Custom WebSocket subprotocol (`relay.tunnel.cloudproxy.app`) with binary framing:
- `0x0001` CONNECT_SUCCESS_SID — handshake complete
- `0x0004` DATA — payload (max 16KB per frame)
- `0x0007` ACK — flow control (cumulative byte count)

**VM-side requirement**: iptables DNAT rule redirects internal-IP:18789 → 127.0.0.1:18789 (because OpenClaw binds loopback-only)

### 6. Stripe (Billing)

**What**: Handles subscriptions and one-time payments.

**Plans**:
| Plan | Price | Stripe Price ID |
|------|-------|-----------------|
| Starter | $79/mo | `price_1TEasOKorCYBRtQAC7StB8vt` |
| Pro | $199/mo | `price_1TEasOKorCYBRtQAhrL4zUdb` |
| Agency | $399/mo | `price_1TEasPKorCYBRtQAYplOCZto` |
| Enterprise | $999/mo | `price_1TEasPKorCYBRtQAiLrEREtx` |

**Webhook**: `/api/billing/webhook` processes subscription events and updates Convex

---

## Deploy Flow (What Happens When a User Clicks "Deploy")

```
1. User fills wizard (hosting, model, plugins, API keys)
          ↓
2. POST /api/gcp/deploy
          ↓
3. Is managed? → Get SA token via getManagedGcpToken()
   Self-hosted? → Get user's Google OAuth token via Clerk
          ↓
4. Ensure infra exists (idempotent):
   - Firewall rules (allow-iap-ssh, allow-iap-dashboard, deny-all-ingress)
   - Cloud NAT (router + NAT config)
          ↓
5. Store API keys in Secret Manager
          ↓
6. Generate startup script (generateWebStartupScript):
   - Install Node 22, OpenClaw, Chromium, Playwright
   - Fetch secrets from Secret Manager
   - Write /etc/openclaw.env
   - Write openclaw.json config
   - Write auth-profiles.json
   - Write SOUL.md
   - Download skills from GitHub
   - Create systemd service
   - Start OpenClaw gateway
   - Apply iptables DNAT rule for IAP proxy
          ↓
7. Create VM (GCP Compute Engine API)
   - e2-medium (4GB RAM, managed) or user-selected
   - Debian 12, no external IP
   - Service account: openclaw-sa@<project>
   - Tags: ["openclaw"]
   - Startup script attached as metadata
          ↓
8. Save deployment record to Convex
          ↓
9. Redirect to /deploy/progress (polls serial port logs via /api/gcp/logs)
```

---

## Data Flow Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────┐
│ USER'S BROWSER                                                   │
│                                                                  │
│  www.dynoclaw.com ──→ Clerk Auth ──→ Convex (real-time data)    │
│       │                                                          │
│       │ /openclaw page                                           │
│       ├──→ iframe src="broker/app/<id>?token=<jwt>"             │
│       │         │                                                │
│       │         ↓                                                │
│       │  Cloud Run Tunnel Broker                                 │
│       │         │                                                │
│       │         ↓ IAP-for-TCP (WebSocket)                       │
│       │         │                                                │
│       │    ┌────↓──────────────────────────┐                    │
│       │    │  GCP VM (dynoclaw-managed)     │                    │
│       │    │                                │                    │
│       │    │  OpenClaw Gateway (:18789)     │                    │
│       │    │     ├── Telegram channel       │                    │
│       │    │     ├── Agent runtime (Gemini) │                    │
│       │    │     ├── Plugins (16+)          │                    │
│       │    │     ├── Skills (37+)           │                    │
│       │    │     └── Cron scheduler         │                    │
│       │    │                                │                    │
│       │    │  iptables DNAT                 │                    │
│       │    │  10.x.x.x:18789 → 127.0.0.1  │                    │
│       │    └────────────────────────────────┘                    │
│       │                                                          │
│  Telegram App ←──→ Telegram API ←──→ OpenClaw (polling)         │
│                                                                  │
│  /deploy ──→ POST /api/gcp/deploy ──→ GCP (create VM)          │
│  /billing ──→ Stripe checkout ──→ webhook → Convex              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Model

| Layer | How |
|-------|-----|
| **Network** | VMs have no external IP. Only reachable via IAP (Google-authenticated tunnel) or Cloud NAT (outbound only). |
| **Firewall** | `deny-all-ingress` blocks everything. `allow-iap-ssh` (port 22) and `allow-iap-dashboard` (port 18789) only accept IAP range (35.235.240.0/20). |
| **Auth** | Clerk handles user auth. Convex queries enforce `userId` ownership. Tunnel broker validates HS256 JWT. |
| **Secrets** | API keys in GCP Secret Manager, namespaced per VM (`<vmname>--<secretname>`). IAM conditions scope each VM to its own secrets. |
| **Data isolation** | Each user's data in Convex is filtered by `userId`. All queries require authentication (legacy unauthenticated access removed 2026-04-17). |
| **Tunnel broker** | JWT is 5-minute TTL, HS256 signed with shared secret. Rate limited: 60 auth/200 asset requests per minute per IP. Broker enforces `gcpProjectId === "dynoclaw-managed"` (managed-only MVP). |
| **Security modes** | Users choose Secured (Telegram pairing, exec/plugin approvals) or Full Power (open Telegram, no approvals) at deploy time. Admins can see each user's choice. |

---

## Key Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `OPENCLAW_VERSION` | `packages/shared/src/index.ts` | Pinned OpenClaw version for all deploys |
| Startup script generator | `packages/dashboard/lib/startup-script.ts` | Generates the bash script that configures each VM |
| Deploy route | `packages/dashboard/app/api/gcp/deploy/route.ts` | Orchestrates the full deploy (infra + VM + Convex record) |
| GCP REST helpers | `packages/dashboard/lib/gcp-rest.ts` | Low-level GCP API calls (create VM, firewall, NAT, secrets) |
| GCP auth | `packages/dashboard/lib/gcp-auth.ts` | Resolves GCP tokens (managed SA vs user OAuth) |
| Tunnel token | `packages/dashboard/app/api/gcp/tunnel-token/route.ts` | Mints JWT for the tunnel broker |
| Tunnel broker | `services/tunnel-broker/src/` | Cloud Run proxy service |
| Plugin registry | `packages/shared/src/plugins.ts` | All available plugins + their required API keys |
| Skill registry | `packages/shared/src/skills.ts` | All available skills + bundled skill packs |

---

## Recent Changes (2026-03-24 through 2026-04-10)

1. **Multi-tenant security** — All Convex queries now filter by `userId`. Fixed data leak where all users could see each other's data.
2. **Managed hosting** — DynoClaw-owned `dynoclaw-managed` GCP project. Users deploy without owning GCP.
3. **Gemini embeddings** — Switched from OpenAI `text-embedding-3-small` to Gemini `gemini-embedding-001` (1536 dims).
4. **Model chain dropdown** — Deploy wizard lets users pick Gemini Pro, Flash, Claude, GPT-4o, or custom.
5. **Dynamic API keys** — Wizard only requires keys for the selected model chain (not all providers).
6. **OpenClaw upgrade** — Pinned version bumped from 2026.2.26 → 2026.4.8.
7. **Tunnel broker (Phase 2)** — Cloud Run service proxies OpenClaw dashboard through IAP-for-TCP.
8. **Comic brief v3** — HTML/CSS rendering with Gemini character from reference photo (no AI text hallucination).
9. **Startup script fixes** — Version comparison bug (double npm install), iptables DNAT for IAP, auth-profiles perms.
10. **Pricing** — 4 plans ($79/$199/$399/$999) with Stripe + Convex.
11. **Default machine type** — e2-small → e2-medium (4GB RAM).
12. **User deduplication** — `touch` mutation now deduplicates by email across auth methods.

### Recent Changes (2026-04-17)

13. **Security mode system** — Secured (default) vs Full Power. Controls Telegram pairing, exec approvals, plugin approvals. Admin-visible.
14. **Per-VM IAM conditions** — Secret Manager access scoped to each VM's own namespaced secrets.
15. **Rate limiting** — Tunnel broker: 60 auth/200 asset req/min per IP.
16. **Tightened asset cache** — Broker no longer routes assets across tenants.
17. **Legacy auth removed** — `resolveUserWithLegacy` replaced with `requireUser` across all Convex queries.
18. **Cloud Build trigger** — Tunnel broker auto-deploys on push to `services/tunnel-broker/**` on main.
19. **Role-based sidebar** — Customers see 4 items (Dashboard, AI Teammate, Settings, Billing). Admins see full nav.
20. **Deploy wizard simplified** — 7 steps → 4 steps (Setup → Tools → API Keys → Confirm).
21. **Clarify.ai plugin** — 6-tool CRM integration for lead management and deal pipeline.
22. **17 plugins, 21 skills** — Expanded from 10 plugins and 8 skills at launch.
