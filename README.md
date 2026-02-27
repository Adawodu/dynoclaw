# DynoClaw

Your AI teammate, deployed on your own cloud. DynoClaw is a self-hosted AI assistant platform that runs on your GCP infrastructure — your data never leaves your cloud.

**Website:** [dynoclaw.com](https://dynoclaw.com)

## What is DynoClaw?

DynoClaw lets you deploy a personal AI assistant that you interact with through Telegram. It handles content creation, social media, email drafting, privacy enforcement, research, and more — all orchestrated through a plugin and skill system you control from a web dashboard.

### Key Principles

- **Self-hosted** — runs on your own GCP project, not a shared server
- **Draft-only** — AI creates drafts, you review and publish
- **Cost-optimized** — multi-model fallback chain (Gemini Flash → GPT-4o Mini → Claude Sonnet)
- **Self-updating** — toggle plugins in the dashboard, sync to your VM, done

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Dashboard (dynoclaw.com)                       │
│  Next.js · Clerk Auth · Stripe Billing          │
│  Deploy Wizard · Plugin/Skill Management        │
│  Cost Tracking · Media Gallery · Privacy        │
└──────────────────┬──────────────────────────────┘
                   │ GCP REST API
┌──────────────────▼──────────────────────────────┐
│  Your GCP Project                               │
│  ┌────────────────────────────────────────────┐ │
│  │  Compute Engine VM (e2-small)              │ │
│  │  OpenClaw Gateway · Telegram Bot           │ │
│  │  Plugins · Skills · Cron Schedules         │ │
│  └────────────────────────────────────────────┘ │
│  Secret Manager · Cloud NAT · IAM              │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  Convex (Backend)                               │
│  Knowledge Base · Media Storage · Deployments   │
│  Privacy Tracking · Cost Snapshots              │
└─────────────────────────────────────────────────┘
```

## Plugins (10)

| Plugin | Description |
|--------|-------------|
| **postiz** | Social media posting — X/Twitter, Instagram, LinkedIn, Facebook, Threads |
| **beehiiv** | Newsletter draft creation (draft-only, never auto-publishes) |
| **image-gen** | Image generation via Google Imagen 4 + DALL-E 3 with Drive storage |
| **video-gen** | Video generation via Google Veo 3.1 + OpenAI Sora 2 |
| **convex-knowledge** | Vector search knowledge base with embeddings |
| **twitter-research** | X/Twitter search, trend analysis, influencer monitoring |
| **github** | Repository operations — read code, create branches, commit, open PRs |
| **web-tools** | Website crawling, PDF reading, local file search |
| **dynoclux** | Privacy enforcement — inbox scanning, unsubscribe tracking, CAN-SPAM/CCPA compliance |
| **dynosist** | Email assistant — Gmail draft creation with file attachments |

## Skills (8)

| Skill | Schedule | Description |
|-------|----------|-------------|
| **daily-briefing** | Daily 1pm UTC | Morning news across tech, health IT, Africa, fintech |
| **content-engine** | Mondays 1am UTC | Weekly content calendar from trending topics |
| **daily-posts** | Daily 1pm UTC | Draft social media posts from content calendar |
| **newsletter-writer** | Tuesdays 2pm UTC | Weekly newsletter drafts from engagement data |
| **engagement-monitor** | Fridays 6pm UTC | Weekly social analytics and performance insights |
| **job-hunter** | On-demand | Job search, company research, outreach drafting |
| **dynoclux** | On-demand | Inbox scan and privacy enforcement |
| **dynosist** | On-demand | Email draft composition via Telegram |

## Project Structure

```
dynoclaw/
├── packages/
│   ├── dashboard/          # Next.js web dashboard (Vercel)
│   ├── shared/             # Shared types, plugin/skill registries
│   └── create-dynoclaw/    # CLI installer (npx create-dynoclaw)
├── plugins/                # OpenClaw plugin source code
├── skills/                 # Skill definitions (SKILL.md files)
├── convex/                 # Convex backend (schema, queries, mutations)
├── infra/                  # GCP deployment scripts
└── CLAUDE.md               # AI coding assistant instructions
```

## Getting Started

### Quick Deploy (Recommended)

1. Sign up at [dynoclaw.com](https://dynoclaw.com)
2. Connect your Google account (for GCP access)
3. Follow the deploy wizard — it provisions everything automatically

### CLI Install

```bash
npx create-dynoclaw
```

The interactive wizard walks you through GCP project setup, API keys, plugin selection, and Telegram bot configuration.

### Local Development

```bash
# Install dependencies
npm install

# Run Convex backend (dev)
npm run convex:dev

# Run dashboard (dev)
npm run dashboard:dev
```

## Model Fallback Chain

DynoClaw uses direct provider APIs (no OpenRouter) with cost-optimized ordering:

1. **Google Gemini 2.5 Flash** — primary, cheapest
2. **OpenAI GPT-4o Mini** — fallback, affordable
3. **Anthropic Claude Sonnet 4.5** — last resort, most capable but expensive

## Dashboard Pages

| Page | Description |
|------|-------------|
| `/overview` | Deployment status, health checks, quick actions |
| `/deploy` | Deploy wizard for new GCP deployments |
| `/plugins` | Enable/disable plugins, sync to VM |
| `/skills` | Configure skills and cron schedules |
| `/media` | Gallery of generated images and videos |
| `/knowledge` | Vector search knowledge base |
| `/privacy` | DynoClux inbox scans, unsubscribe tracking, compliance |
| `/email` | DynoSist Gmail drafts viewer |
| `/costs` | AI model spend tracking and breakdown |
| `/api-keys` | Manage API keys stored in GCP Secret Manager |
| `/logs` | VM serial port output and gateway logs |
| `/settings` | Branding, model configuration, danger zone |
| `/billing` | Subscription management via Stripe |

## Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS, shadcn/ui
- **Auth:** Clerk (Google OAuth for GCP access)
- **Payments:** Stripe (starter/pro tiers, 14-day trial)
- **Backend:** Convex (real-time database, vector search, blob storage)
- **Infrastructure:** GCP Compute Engine, Secret Manager, Cloud NAT
- **AI Gateway:** OpenClaw (Telegram bot, plugin system, cron scheduling)
- **AI Models:** Google AI, OpenAI, Anthropic (direct APIs)

## License

Proprietary. All rights reserved.
