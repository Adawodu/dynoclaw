---
name: network-scan
description: Find more contacts at a company and draft outreach messages
user-invocable: true
allowed-tools: job_search_add_contact, job_search_draft_outreach, job_search_guess_email, job_search_draft_email, job_search_list_contacts, web_search
metadata: {"openclaw":{"emoji":"🤝"}}
---

# Network Scan — Expand Contacts

Find additional contacts at a target company. Use when job-scout already found the company but you want more connections.

## When Invoked

User says `/network-scan Ramp` or `find more people at Stripe`.

## STEP 1: Check Existing

Call `job_search_list_contacts` to see who's already mapped at this company. Don't duplicate.

## STEP 2: Search for More People

Run web_search:
1. `site:linkedin.com/in "[COMPANY]" "VP" OR "Director" OR "Head" engineering product`
2. `site:linkedin.com/in "[COMPANY]" recruiter OR "talent acquisition" OR "people ops"`
3. `site:linkedin.com/in "[COMPANY]" CTO OR "engineering manager"`
4. `"[COMPANY]" team engineering leadership linkedin`

Find 5 NEW contacts not already in the dashboard.

## STEP 3: Save Contacts

For each new contact:
1. Call `job_search_add_contact` with name, title, company, linkedinUrl, notes — get the returned ID
2. IMPORTANT: Always include the LinkedIn URL from the search result

## STEP 4: Guess Emails

For each contact, call `job_search_guess_email` with firstName, lastName, and the company's email domain (e.g. ramp.com, not www.ramp.com)

## STEP 5: Draft Outreach (LinkedIn + Email)

For each contact, create TWO drafts:
1. Call `job_search_draft_outreach` — LinkedIn connection request (under 300 chars)
2. Call `job_search_draft_email` — Professional email with subject and body

## STEP 6: Report

```
🤝 Network Scan: [COMPANY]

[N] new contacts added (total: [N] at this company)
[N] outreach drafts ready

Review: jonnymate.adawodu.com/canvas/job-search → Outreach tab
```
