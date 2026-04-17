---
name: company-intel
description: Deep dive on a specific company — research + contacts + outreach drafts
user-invocable: true
allowed-tools: job_search_save_company, job_search_add_contact, job_search_draft_outreach, job_search_add_job, web_search, web_fetch
metadata: {"openclaw":{"emoji":"🏢"}}
---

# Company Intel — Deep Dive

Research a specific company in depth. Goes deeper than job-scout: checks careers page, finds more contacts, researches leadership team.

## When Invoked

User says `/company-intel Ramp` or `research Stripe for me`. Extract the company name.

## STEP 1: Deep Research

Run 6+ web_search queries:

1. `"[COMPANY]" about team leadership founders`
2. `"[COMPANY]" funding round series valuation investors 2025 OR 2026`
3. `"[COMPANY]" news product launch announcement 2025 OR 2026`
4. `"[COMPANY]" glassdoor reviews engineering culture`
5. `"[COMPANY]" tech stack engineering blog`
6. `"[COMPANY]" careers engineering product jobs`
7. `site:[company-domain] careers OR jobs` (if domain known)

Also web_fetch their about/team page and careers page if available.

Call `job_search_save_company` with full research.

## STEP 2: Find Open Roles

If you find relevant open roles on their careers page, call `job_search_add_job` for each one.

## STEP 3: Map Contacts (5 people)

Run web_search for people:
1. `site:linkedin.com/in "[COMPANY]" "VP" OR "Director" OR "Head" engineering`
2. `site:linkedin.com/in "[COMPANY]" CTO OR "engineering manager" OR "product"`
3. `site:linkedin.com/in "[COMPANY]" recruiter OR talent`

Call `job_search_add_contact` for each (up to 5). Then call `job_search_draft_outreach` for each with a personalized message.

## STEP 4: Report

Send the full intel brief to Bayo, then:

```
📋 Saved to dashboard: jonnymate.adawodu.com/canvas/job-search
[N] contacts mapped, [N] outreach drafts ready
Review drafts in the Outreach tab
```
