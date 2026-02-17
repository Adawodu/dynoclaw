# System Design

## Core Modules

### 1. Infrastructure (`infra/gcp/`)

| File | Responsibility |
|------|---------------|
| `deploy-openclaw.sh` | Provisions VM, service account, firewall rules, and injects startup script via instance metadata |
| `startup.sh` | Docker/container entrypoint: fetches secrets, writes config, runs security audit, starts gateway |
| `openclaw.Dockerfile` | Container image: Node 22 + gcloud CLI + OpenClaw |
| `openclaw-config.jsonc` | Config template with placeholder tokens replaced at boot |

### 2. OpenClaw Gateway (npm package, not in-repo)

OpenClaw is an external dependency installed via `npm install -g openclaw@latest`. It provides:
- Telegram bot channel management
- AI model routing with fallback chains
- Gateway HTTP interface (loopback-bound)
- Security audit tooling
- Config CLI (`openclaw config set ...`)

## Data Flow

### Boot Sequence

1. GCP creates VM with startup script in instance metadata
2. Startup script installs Node 22 and OpenClaw (first boot only, marker file at `/var/run/openclaw-installed`)
3. Secrets fetched from GCP Secret Manager via `gcloud secrets versions access`
4. OpenClaw configured via CLI commands (model, channels, auth token)
5. Systemd unit created and started
6. Gateway binds to loopback, listens on port 18789

### Message Flow

1. User sends Telegram DM to bot
2. OpenClaw Telegram channel receives message (pairing-authenticated)
3. Gateway routes to primary model (OpenRouter qwen3-vl-30b)
4. On failure, falls back to Anthropic Claude Sonnet 4.5
5. Response returned to Telegram

## API Surface

No custom APIs in this repo. All endpoints are provided by the OpenClaw gateway:
- Gateway dashboard: `localhost:18789` (accessible via SSH tunnel)
- Gateway auth: random 32-byte hex token generated at deploy time

## Configuration

The `openclaw-config.jsonc` template defines:
- `gateway.bind`: `loopback` (no external access)
- `channels.telegram.enabled`: `true`
- `channels.telegram.dmPolicy`: `pairing` (requires approval)
- `channels.telegram.groupPolicy`: `disabled`
- `models.default`: `claude-sonnet-4-5-20250929`

Runtime config overrides are applied via `openclaw config set` during the deploy startup script, including the model fallback chain.

## Storage

No persistent storage beyond:
- OpenClaw's internal state (managed by the npm package)
- Config file at `/opt/openclaw/config.jsonc` (600 permissions)
- Systemd marker at `/var/run/openclaw-installed`
