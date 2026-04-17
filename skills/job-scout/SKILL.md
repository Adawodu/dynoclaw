---
name: job-scout
description: Full pipeline — find jobs, research companies, map contacts, draft outreach
user-invocable: true
allowed-tools: job_search_add_job, job_search_save_company, job_search_add_contact, job_search_draft_outreach, job_search_guess_email, job_search_draft_email, job_search_stats, job_search_list_jobs, web_search, web_fetch
metadata: {"openclaw":{"emoji":"🔍"}}
---

# Job Scout — Full Pipeline

This skill runs a complete job search cycle: find roles → research each company → find contacts → draft outreach. Everything is saved to the dashboard automatically.

## Candidate Profile

- **Name:** Bayo Adawodu
- **Target roles:** VP/Director of Engineering, VP/Director of Product, Head of Engineering/Product, CTO
- **Compensation:** $250K+ annual (flexible for strong equity/mission)
- **Company stage:** Seed through Series C
- **Location:** Remote, DMV (DC/Maryland/Virginia), or NYC area
- **Industries:** Digital health, enterprise SaaS, AI/ML platforms, fintech
- **Experience:** 15yr+ — Fractional CTO at Metric Health, $100M+ programs at Chevron, Engineering at Accenture (Marriott 100M+ users), Founder of Lafia.io, DynoClaw, ShemShems
- **Strengths:** 0→1 builds, HIPAA/SOC2, API architecture, scaling teams, multi-tenant platforms
- **Dealbreakers:** 100% onsite outside DMV/NYC, IC roles, contract/consulting

## When Invoked

If the user gives specific instructions (e.g. "search health tech companies in NYC"), follow those. Otherwise run the default search below.

## STEP 1: Find Roles

Run 4-5 web_search queries. IMPORTANT: Add "apply" or "careers" to force actual job listings, not articles:

1. `"VP of Engineering" OR "Head of Engineering" health tech remote apply 2026`
2. `"Director of Engineering" digital health startup careers hiring`
3. `site:boards.greenhouse.io OR site:jobs.lever.co "engineering" health`
4. `"VP Engineering" Maryland OR "Washington DC" OR NYC health tech apply`
5. `site:wellfound.com OR site:builtin.com "VP Engineering" health remote`

After finding each role URL, use `web_fetch` to verify the link is still active. If the page returns a 404, "position filled", "no longer accepting", or redirects to a generic careers page, SKIP it — do not add dead listings.

Score each VERIFIED role 0-100:
- Title (30): VP/Director/Head/CTO = 30, Senior Dir = 20
- Stage (20): Series A-C = 20, Seed = 15, Public = 10
- Location (20): Remote/DMV/NYC = 20
- Industry (15): Health tech/AI/Fintech = 15, Enterprise SaaS = 10
- Comp (15): $250K+ = 15, likely match = 10

For each role scoring 60+, call `job_search_add_job`. Collect the top 3-5 best matches to continue with.

## STEP 2: Research Each Company

For each of the top 3-5 companies from Step 1, run web_search:

1. `"[COMPANY]" about team funding valuation`
2. `"[COMPANY]" news 2025 OR 2026`
3. `"[COMPANY]" engineering culture tech stack`

Compile: what they do, stage, size, funding, why Bayo fits, recent news, challenges he'd solve.

Call `job_search_save_company` for each.

## STEP 3: Find Contacts at Each Company

For each company, run web_search:

1. `site:linkedin.com/in "[COMPANY]" "VP" OR "Director" OR "Head" engineering product`
2. `site:linkedin.com/in "[COMPANY]" recruiter OR "talent acquisition"`

Pick the top 3 most valuable people per company:
- Engineering/product leaders (hiring influence)
- Recruiters (process referrals)
- Anyone with shared background (same school, same previous employer)

Call `job_search_add_contact` for each. IMPORTANT: Always include the LinkedIn URL from the search result. Note the returned contact ID.

## STEP 4: Guess Work Emails

For each contact saved in Step 3, call `job_search_guess_email` with:
- `contactId`: the ID from Step 3
- `firstName`: contact's first name
- `lastName`: contact's last name
- `companyDomain`: the company's website domain (e.g. springhealth.com, ramp.com — NOT www.)

This verifies the domain has MX records and saves the best-guess email to the contact.

## STEP 5: Draft Outreach for Each Contact

For each contact, create TWO outreach drafts:

**A) LinkedIn connection request** — call `job_search_draft_outreach` with:
- `contactId`: the ID from Step 3
- `channel`: "linkedin_connection"
- `message`: Personalized request under 300 characters

**B) Email outreach** — call `job_search_draft_email` with:
- `contactId`: the ID from Step 3
- `toEmail`: the email from Step 4
- `subject`: A compelling subject line (e.g. "Engineering leadership — [COMPANY]")
- `body`: A professional email introducing yourself and expressing interest

Each message MUST be unique and reference something specific about that person. Examples:

LinkedIn: "Hi [Name] — I lead engineering teams in health tech (15yr). Noticed you joined [COMPANY] from [PREV COMPANY]. Exploring leadership roles and would love to connect."

Email subject: "Engineering leadership at [COMPANY]"
Email body: "Hi [Name], I came across your profile while researching [COMPANY]'s engineering team. [Something specific about their background]. I'm a technology leader with 15+ years in health tech — most recently as Fractional CTO at Metric Health, and previously leading $100M+ programs at Chevron and scaling engineering at Accenture. I'm exploring VP/Director of Engineering roles, and [COMPANY]'s [specific thing about the company] resonates with my experience in [relevant skill]. Would you be open to a brief conversation? Best, Bayo Dawodu"

## STEP 6: Summary Report

After ALL steps complete, send ONE summary message:

```
**🔍 Job Scout Complete**

**Pipeline:** [N] new roles added
**Companies researched:** [N]
**Contacts mapped:** [N] (with emails guessed)
**Outreach drafted:** [N]

**Top matches:**
1. **[Title]** at [Company] — Score: [N]
   [N] contacts mapped, drafts ready
2. ...

**Next steps:**
→ Review pipeline: jonnymate.adawodu.com/canvas/job-search
→ Review outreach drafts in the Outreach tab
→ Mark drafts as "approved" then send manually on LinkedIn

Adebayo Dawodu | Powered by DynoClaw
```

## Rules

- You MUST call the plugin tools (job_search_add_job, job_search_save_company, etc.) — do not just display results
- Run ALL 4 steps before sending the summary
- Each outreach message must be personalized — no templates
- Limit to 3 contacts per company, 5 companies max per run
- If a job or company already exists in the pipeline, skip it (the tools handle deduplication)
- Do NOT send any messages — only draft them
