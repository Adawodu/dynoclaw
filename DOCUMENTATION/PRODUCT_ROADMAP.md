# Product Roadmap

## Vision

Turn claw-teammate into a paid product: a pre-configured AI teammate that users deploy in their own cloud. They bring their own API keys, own their infra, and their data stays with them.

---

## Phase 1: Multi-Cloud CLI Installer

**Goal:** `npx create-claw-teammate` — interactive setup that provisions everything.

- Interactive wizard: pick cloud (GCP / AWS / DigitalOcean / Docker self-hosted)
- Guided API key setup (auto-opens browser for Gemini free tier, BotFather, etc.)
- Automates what `deploy-openclaw.sh` does today, but polished and multi-cloud
- Zero-to-running in under 10 minutes

## Phase 2: Deployment Targets

| Target | Approach | Status |
|--------|----------|--------|
| GCP Compute Engine | Existing `deploy-openclaw.sh` — polish into CLI | Working |
| AWS EC2 / Lightsail | Equivalent provisioning script | Not started |
| DigitalOcean Droplet | Equivalent provisioning script | Not started |
| Docker Compose | Single `docker compose up` + `.env` file | Not started |
| Marketplace images | GCP Marketplace, AWS AMI, DO 1-Click | Not started |

## Phase 3: Revenue Model

**Core strategy: CLI installer + plugin marketplace**

- **Free tier:** Core deployment + basic plugins (knowledge base, daily briefing)
- **Paid plugins:** Premium integrations (Postiz social media, CRM, advanced analytics)
- **Paid skills:** Job hunting, content calendar, client outreach
- **Pro dashboard:** Remote bot management portal, usage analytics

### Monetization options to evaluate

| Model | Description | Notes |
|-------|-------------|-------|
| Plugin marketplace | Free core, paid premium plugins | Natural upsell, low barrier |
| License key | CLI checks license, unlocks features | Simple, predictable |
| Managed updates | Pay for auto-updates + support | Sticky, recurring |
| Usage tiers | Free for 1 bot, pay for multi-agent/team | Freemium funnel |

## Phase 4: Frictionless UX

Key friction points to solve:
1. Cloud project setup + secret management — automate entirely
2. API keys — guide users to free-tier keys during setup
3. Plugin config (Postiz URL, Convex, etc.) — interactive wizard
4. Telegram bot token — step-by-step with deep links to BotFather

## Open Questions

- Which cloud to prioritize after GCP?
- License enforcement approach (honor system vs. server-side validation)?
- Should the dashboard be self-hosted or a hosted SaaS?
- Pricing tiers and price points?
- Open-source core vs. source-available?

---

*Last updated: 2026-02-19*
