# Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 |
| Gateway | [OpenClaw](https://github.com/openclaw) (npm package) |
| Cloud | GCP (Compute Engine, Secret Manager) |
| OS | Debian 12 |
| Messaging | Telegram (bot API via OpenClaw channel) |
| AI Models | OpenRouter (qwen3-vl-30b-a3b-thinking primary), Anthropic Claude Sonnet 4.5 (fallback) |
| Container | Docker (node:22-slim base) |

## High-Level Component Map

```
Telegram Bot <──> OpenClaw Gateway (loopback-only) <──> AI Model Providers
                         │
                   GCP Secret Manager
                   (credentials at boot)
```

- **OpenClaw Gateway**: Single-process Node.js service running on a GCP e2-small VM. Binds to loopback only (no public endpoint). Manages Telegram channel, model routing, and integration credentials.
- **Telegram Channel**: Only channel enabled. Uses pairing-based DM authentication; group messaging disabled.
- **Model Routing**: Primary model via OpenRouter (free tier), with Anthropic Claude Sonnet 4.5 as paid fallback.

## External Dependencies & Integrations

| Integration | Secret Name | Status |
|------------|-------------|--------|
| Telegram | `telegram-bot-token` | Required |
| Anthropic | `anthropic-api-key` | Required |
| Gmail | `gmail-credentials` | Optional |
| GitHub | `github-token` | Optional |
| Beehiiv | `beehiiv-api-key` | Optional |
| OpenRouter | `openrouter-api-key` | Optional |

All secrets stored in GCP Secret Manager and fetched at VM boot time.

## Deployment Topology

- **Single VM**: `openclaw-vm` on GCP Compute Engine (e2-small, us-central1-a)
- **No public IP**: VM has `--no-address`; access only via IAP SSH tunnel
- **Firewall**: SSH allowed from IAP range (35.235.240.0/20) only; all other ingress denied
- **Service Account**: `openclaw-sa` with `roles/secretmanager.secretAccessor`
- **Systemd**: OpenClaw runs as a systemd service with auto-restart on failure
- **Dashboard Access**: SSH tunnel to localhost:18789

## Operational Constraints (from CLAUDE.md)

- Draft-only for Gmail, Beehiiv, and social integrations
- PR-only for GitHub (no merge permissions)
- No secrets in code
- No destructive commands
