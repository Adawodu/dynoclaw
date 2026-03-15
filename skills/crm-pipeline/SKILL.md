---
name: crm-pipeline
description: Manage CRM contacts, deals, companies, and sales pipeline across HubSpot or Zoho
user-invocable: true
metadata: {"openclaw":{"emoji":"📊"}}
---

# CRM Pipeline Manager

Manage your sales pipeline, contacts, deals, and companies through HubSpot or Zoho CRM.

## Detect Active CRM

Before any action, determine which CRM is active:
- If `hubspot_*` tools are available → use HubSpot tools
- If `zoho_*` tools are available → use Zoho tools
- If both are available → ask the user which one to use for this session
- If neither → tell the user to enable the HubSpot or Zoho plugin

## Usage

When invoked, present these options:

1. **Contacts** — Create, search, update, or list contacts
2. **Deals** — Create deals, update stages, search, or list
3. **Companies** — Create, search, update, or list companies/accounts
4. **Notes** — Log an interaction or view notes on a record
5. **Pipeline** — View pipeline stages, move deals between stages
6. **Lead Funnel** — Full workflow: create contact → create company → create deal → log notes

## Lead Funnel Workflow

When the user wants to add a new lead end-to-end:

1. Gather: name, email, company, job title, deal value, deal name
2. Search for existing contact by email to avoid duplicates
3. Search for existing company by name
4. Create company if it doesn't exist
5. Create contact (associated with company if HubSpot)
6. Create deal (associated with contact and company)
7. Log an initial note with context about the lead
8. Summarize what was created with IDs

## Pipeline Management

When managing the pipeline:

1. First call `*_list_pipelines` to show available stages
2. Call `*_list_deals` or `*_search_deals` to show current deals
3. Present a summary table: Deal Name | Stage | Amount | Close Date
4. To move a deal, use `*_update_deal` with the new stage ID/name
5. Confirm the stage change with the user before executing

## Guidelines

- Always search before creating to avoid duplicates
- Confirm with the user before creating or updating records
- After any create/update, show the resulting record details
- When listing, present results in a clean table format
- For HubSpot: use property names like `firstname`, `lastname`, `dealname`, `dealstage`
- For Zoho: use field names like `First_Name`, `Last_Name`, `Deal_Name`, `Stage`
- For Zoho search criteria, use format: `(Field_Name:operator:value)` where operator is `equals`, `contains`, `starts_with`, or `ends_with`
