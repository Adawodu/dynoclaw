# MAIO Playbook — DynoClaw Alignment Analysis

**Date:** 2026-04-19
**Source:** MAIO Playbook (partner document)
**Status:** Active — informing product priorities

## What MAIO Is

**Managed AI Orchestration** — a hybrid offering combining DynoClaw (infrastructure) with ParallelScore (consulting brain trust). The 3-step retainer funnel:

1. **Diagnostic Audit** ($5K-$15K, 2 weeks) — embed with client ops, find friction, deliver automation blueprint
2. **Integration Build** ($25K-$100K, 4-8 weeks) — deploy DynoClaw, connect plugins, build custom skills
3. **Optimization Retainer** ($10K-$30K/mo, 12-month min) — infrastructure + maintenance + expansion

## What Aligns Today

| MAIO Need | DynoClaw Reality |
|---|---|
| Secure, isolated AI infrastructure | Isolated GCP VMs, no public IP, IAP-only, per-VM IAM conditions |
| Plugin/skill orchestration | 17 plugins, 21 skills, 49K+ on ClawHub |
| Data ownership | Private GCP project, Secret Manager, never trains public models |
| Human in the loop | Secured mode with exec/plugin approvals |
| Skill library economics | Build once, deploy across clients via startup script |
| CRM integration | Clarify.ai plugin (published to ClawHub) |

## Gaps to Close

### Priority 1: Split Website Positioning
- Self-serve tier ($79-$999/mo) stays for solopreneurs/SMBs
- Enterprise/MAIO page: no public pricing, "Schedule Audit" CTA, security language
- Addresses the "boardroom cognitive dissonance" problem (CISO sees $79, kills deal)

### Priority 2: Value Delivered Dashboard
- Workflows executed, estimated hours saved, estimated dollars saved
- Feeds the Quarterly Business Review (QBR) narrative
- Simple: count cron runs + on-demand skill invocations + map to time savings

### Priority 3: Workflow Audit Skill
- Structured skill for the "Friction X-Ray" diagnostic
- Input: meeting transcript or screen share notes
- Output: priority-ranked automation blueprint with ROI projections
- Becomes the $5K-$15K audit deliverable

### Priority 4: Enterprise Stripe Plan
- $999+/mo tier, custom pricing via contact
- SLA language, priority support

### Future (Not Now)
- Audit logging & compliance (SOC2, DPA templates, immutable logs)
- Multi-agent swarm architecture (manager/worker paradigm)
- Multi-cloud (AWS/Azure) — GCP-only is fine for now
- Control Tower dashboard for ParallelScore engineers

## Strategic Sequencing

1. Close Gary ($400) and Phil ($800) — proof of value
2. Rewrite those as MAIO-framed case studies
3. Use case studies to pitch $5K diagnostic audits
4. Audit converts to $25K+ build + $10K/mo retainer

DynoClaw doesn't need architecture changes for MAIO. It needs a **second front door** (enterprise positioning) and **telemetry** (prove value delivered).
