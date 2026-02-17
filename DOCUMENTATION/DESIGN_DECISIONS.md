# Design Decisions

### DD-001: Use OpenClaw as Gateway Framework
**Date**: 2026-02-15
**Status**: Accepted
**Context**: Needed a way to connect Telegram with AI models, manage credentials, and handle message routing without building custom infrastructure.
**Decision**: Use OpenClaw (npm package) as the gateway framework, installed globally on the VM.
**Consequences**: Reduced custom code to near-zero (only infra scripts). Tied to OpenClaw's release cycle and feature set. Upgrades require redeployment.

### DD-002: Single VM with No Public IP
**Date**: 2026-02-15
**Status**: Accepted
**Context**: The gateway only needs outbound internet (Telegram API, model APIs) and SSH access for administration.
**Decision**: Deploy on a single e2-small VM with `--no-address` (no external IP). Access via IAP SSH tunnels only.
**Consequences**: Strong security posture — no attack surface from internet. Requires IAP tunnel for dashboard access. Outbound traffic uses Cloud NAT or default route.

### DD-003: Secrets in GCP Secret Manager
**Date**: 2026-02-15
**Status**: Accepted
**Context**: Multiple API keys and tokens needed at runtime. Cannot store in code per project policy.
**Decision**: Store all secrets in GCP Secret Manager; fetch at boot via service account with `secretmanager.secretAccessor` role.
**Consequences**: Secrets never touch the repo. Rotation requires updating Secret Manager + VM restart. Service account must have correct IAM bindings.

### DD-004: Model Fallback Chain (Free-First)
**Date**: 2026-02-15
**Status**: Accepted
**Context**: Want to minimize API costs while maintaining quality.
**Decision**: Primary model is OpenRouter free-tier (qwen3-vl-30b-a3b-thinking); fallback is Anthropic Claude Sonnet 4.5 (paid).
**Consequences**: Most requests served at zero cost. Degraded latency on fallback. Quality difference between primary and fallback models.

### DD-005: Draft-Only and PR-Only Integration Policy
**Date**: 2026-02-15
**Status**: Accepted
**Context**: AI assistant should not take irreversible actions on external services.
**Decision**: Gmail/Beehiiv/social integrations create drafts only. GitHub integration creates PRs only (no merge).
**Consequences**: Human review required before any external-facing action. Slower workflow but eliminates risk of unintended publishes or merges.
