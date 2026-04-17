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
│  │  Compute Engine VM (e2-medium)              │ │
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

## Plugins (17)

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
| **clarify-ai** | CRM integration — contact search, lead management, deal pipeline |
| **agentmail** | Dedicated agent email inbox via AgentMail API |
| **carousel-gen** | HTML→PNG carousel and comic brief generator |
| **youtube-transcriber** | YouTube video transcript extraction |
| **job-search** | Job listing search, tracking, and outreach |
| **hubspot** | HubSpot CRM integration |
| **zoho** | Zoho CRM integration |

## Skills (21)

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
| **growth-hacker** | On-demand | Growth strategy and marketing tactics |
| **product-update** | On-demand | Product changelog and update drafts |
| **agentmail** | On-demand | Email inbox management |
| **agent-browser** | On-demand | Browser automation via Playwright |
| **comic-brief** | On-demand | HTML comic brief generation with character portraits |
| **crm-pipeline** | On-demand | CRM pipeline management |
| **metric-health-echo** | On-demand | System health monitoring |
| **company-intel** | On-demand | Company research and intelligence |
| **network-scan** | On-demand | Professional network analysis |
| **job-scout** | On-demand | Job market scanning |
| **agency-sales-pack** | Pack | Bundled sales skills for agencies |
| **agency-marketing-pack** | Pack | Bundled marketing skills for agencies |
| **agency-engineering-pack** | Pack | Bundled engineering skills for agencies |

## Project Structure

```
dynoclaw/
├── packages/
│   ├── dashboard/          # Next.js web dashboard (Vercel)
│   ├── shared/             # Shared types, plugin/skill registries
│   └── create-dynoclaw/    # CLI installer (npx create-dynoclaw)
├── services/
│   └── tunnel-broker/      # Cloud Run IAP proxy (auto-deploys via Cloud Build)
├── plugins/                # OpenClaw plugin source code (17 plugins)
├── skills/                 # Skill definitions (21 skills + 3 packs)
├── convex/                 # Convex backend (schema, queries, mutations)
├── infra/                  # GCP deployment scripts
├── docs/                   # Architecture docs and diagrams
├── DOCUMENTATION/          # System design, ADRs, roadmap
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

Default chain (configurable per deployment):

1. **Google Gemini 2.5 Pro** — primary, best for agentic work
2. **Google Gemini 2.5 Flash** — first fallback, fast and affordable
3. **Google Gemini 2.5 Flash Lite** — last resort, cheapest

Other options: Claude Sonnet 4.5, GPT-4o, or custom chains via the deploy wizard.

## Dashboard Pages

| Page | Description |
|------|-------------|
| `/` | Dashboard overview (deployment status, quick actions) |
| `/deploy` | Deploy wizard (4 steps: Setup → Tools → API Keys → Confirm) |
| `/openclaw` | Embedded OpenClaw console via tunnel broker |
| `/settings` | Branding, model configuration, security mode, danger zone |
| `/billing` | Subscription management via Stripe |
| `/admin/users` | Admin: user management with security mode visibility |

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
