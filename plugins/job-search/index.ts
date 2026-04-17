import { Type } from "@sinclair/typebox";

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

// ── Convex HTTP API helpers ───────────────────────────────────────────

async function convexQuery(
  convexUrl: string,
  path: string,
  args: Record<string, unknown> = {},
): Promise<any> {
  const res = await fetch(`${convexUrl}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  if (!res.ok) throw new Error(`Convex query error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.errorMessage);
  return data.value;
}

async function convexMutation(
  convexUrl: string,
  path: string,
  args: Record<string, unknown> = {},
): Promise<any> {
  const res = await fetch(`${convexUrl}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  if (!res.ok) throw new Error(`Convex mutation error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.errorMessage);
  return data.value;
}

// ── Plugin ────────────────────────────────────────────────────────────

const jobSearchPlugin = {
  id: "job-search",
  name: "Job Search Pipeline",
  description:
    "Track job opportunities, research companies, map contacts, and draft outreach messages. All data saved to the job search dashboard.",
  configSchema: {
    type: "object" as const,
    properties: {
      convexUrl: { type: "string" as const },
    },
    required: ["convexUrl"],
  },
  register(pluginApi: any) {
    const convexUrl = pluginApi.pluginConfig?.convexUrl;
    if (!convexUrl) {
      pluginApi.logger?.warn?.("job-search: convexUrl not configured");
      return;
    }

    // ── Tool 1: Add Job ───────────────────────────────────────────────
    pluginApi.registerTool({
      name: "job_search_add_job",
      label: "Add Job to Pipeline",
      description:
        "Save a job listing to the pipeline dashboard. Use this after finding a matching role via web search.",
      parameters: Type.Object({
        title: Type.String({ description: "Job title (e.g. VP of Engineering)" }),
        companyName: Type.String({ description: "Company name" }),
        url: Type.Optional(Type.String({ description: "Job posting URL" })),
        source: Type.Optional(Type.String({ description: "Where the job was found (e.g. greenhouse, lever, linkedin, web_search)" })),
        matchScore: Type.Optional(Type.Number({ description: "Match score 0-100 based on candidate criteria" })),
        matchReason: Type.Optional(Type.String({ description: "Why this role matches (1-2 sentences)" })),
        compensationRange: Type.Optional(Type.String({ description: "Compensation range if listed" })),
        remote: Type.Optional(Type.Boolean({ description: "Whether the role is remote" })),
        location: Type.Optional(Type.String({ description: "Job location" })),
        jdText: Type.Optional(Type.String({ description: "Full job description text" })),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          // Check for duplicates — fuzzy match on title + company
          const existing = await convexQuery(convexUrl, "jobSearch:listJobs", {});
          const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
          const normTitle = normalize(params.title);
          const normCompany = normalize(params.companyName);
          const dupe = existing?.find((j: any) => {
            const jTitle = normalize(j.title);
            const jCompany = normalize(j.companyName);
            // Exact match
            if (jTitle === normTitle && jCompany === normCompany) return true;
            // Company match + title contains key terms
            if (jCompany === normCompany && (jTitle.includes(normTitle) || normTitle.includes(jTitle))) return true;
            // Same URL
            if (params.url && j.url && params.url === j.url) return true;
            return false;
          });
          if (dupe) {
            return json({
              duplicate: true,
              existingId: dupe._id,
              currentStatus: dupe.status,
              message: `Job already exists: ${dupe.title} at ${dupe.companyName} (status: ${dupe.status})`,
            });
          }

          const id = await convexMutation(convexUrl, "jobSearch:upsertJob", {
            title: params.title,
            companyName: params.companyName,
            url: params.url,
            source: params.source || "web_search",
            matchScore: params.matchScore,
            matchReason: params.matchReason,
            compensationRange: params.compensationRange,
            remote: params.remote,
            location: params.location,
            jdText: params.jdText,
            status: "found",
          });

          await convexMutation(convexUrl, "jobSearch:logActivity", {
            type: "job_added",
            details: `Added ${params.title} at ${params.companyName}${params.matchScore ? ` (Score: ${params.matchScore})` : ""}`,
          });

          return json({
            success: true,
            id,
            message: `Saved: ${params.title} at ${params.companyName}`,
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Tool 2: Research Company ──────────────────────────────────────
    pluginApi.registerTool({
      name: "job_search_save_company",
      label: "Save Company Research",
      description:
        "Save a company intel brief to the dashboard. Use after researching a target company via web search.",
      parameters: Type.Object({
        name: Type.String({ description: "Company name" }),
        website: Type.Optional(Type.String({ description: "Company website URL" })),
        stage: Type.Optional(Type.String({ description: "Funding stage (e.g. Seed, Series A, Series B, Growth, Public)" })),
        size: Type.Optional(Type.String({ description: "Team size (e.g. 50, 200+, 1000+)" })),
        industry: Type.Optional(Type.String({ description: "Industry (e.g. Health Tech, Fintech, Enterprise SaaS)" })),
        location: Type.Optional(Type.String({ description: "HQ location" })),
        whyInterested: Type.Optional(Type.String({ description: "Why this company is a fit for Bayo" })),
        fundingHistory: Type.Optional(Type.String({ description: "Funding rounds, investors, valuation" })),
        recentNews: Type.Optional(Type.String({ description: "Recent news and announcements" })),
        challenges: Type.Optional(Type.String({ description: "Challenges the company faces that Bayo could solve" })),
        techStack: Type.Optional(Type.String({ description: "Technology stack" })),
        intelBrief: Type.Optional(Type.String({ description: "Full research brief text" })),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          // Check if company already exists
          const existing = await convexQuery(convexUrl, "jobSearch:listCompanies", {});
          const match = existing?.find(
            (c: any) => c.name.toLowerCase() === params.name.toLowerCase(),
          );

          const args: any = { ...params, status: "researching" };
          if (match) args.id = match._id;

          const id = await convexMutation(convexUrl, "jobSearch:upsertCompany", args);

          await convexMutation(convexUrl, "jobSearch:logActivity", {
            companyId: id,
            type: "company_researched",
            details: `${match ? "Updated" : "Added"} intel for ${params.name}${params.stage ? ` (${params.stage})` : ""}`,
          });

          return json({
            success: true,
            id,
            updated: !!match,
            message: `${match ? "Updated" : "Saved"}: ${params.name}`,
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Tool 3: Add Contact ───────────────────────────────────────────
    pluginApi.registerTool({
      name: "job_search_add_contact",
      label: "Add Contact",
      description:
        "Save a contact at a target company to the dashboard. Use after finding relevant people via web/LinkedIn search.",
      parameters: Type.Object({
        name: Type.String({ description: "Contact's full name" }),
        title: Type.Optional(Type.String({ description: "Job title" })),
        company: Type.Optional(Type.String({ description: "Company name" })),
        linkedinUrl: Type.Optional(Type.String({ description: "LinkedIn profile URL" })),
        email: Type.Optional(Type.String({ description: "Email address if known" })),
        connectionDegree: Type.Optional(Type.String({ description: "LinkedIn connection degree: 1st, 2nd, 3rd, or unknown" })),
        relationship: Type.Optional(Type.String({ description: "Current relationship: cold, warm, active, or advocate" })),
        source: Type.Optional(Type.String({ description: "How the contact was found" })),
        notes: Type.Optional(Type.String({ description: "Notes about this contact — background, why they matter, mutual connections" })),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const id = await convexMutation(convexUrl, "jobSearch:upsertContact", {
            name: params.name,
            title: params.title,
            company: params.company,
            linkedinUrl: params.linkedinUrl,
            email: params.email,
            connectionDegree: params.connectionDegree || "unknown",
            relationship: params.relationship || "cold",
            source: params.source || "web_search",
            notes: params.notes,
          });

          await convexMutation(convexUrl, "jobSearch:logActivity", {
            contactId: id,
            type: "contact_added",
            details: `Added ${params.name}${params.title ? ` (${params.title})` : ""}${params.company ? ` at ${params.company}` : ""}`,
          });

          return json({ success: true, id, message: `Saved contact: ${params.name}` });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Tool 4: Draft Outreach ────────────────────────────────────────
    pluginApi.registerTool({
      name: "job_search_draft_outreach",
      label: "Draft Outreach Message",
      description:
        "Save a draft outreach message for a contact. The message is saved as a draft — Bayo reviews and sends manually.",
      parameters: Type.Object({
        contactId: Type.String({ description: "The Convex ID of the contact (from job_search_add_contact result)" }),
        channel: Type.String({ description: "Outreach channel: linkedin_connection, linkedin_message, email, or intro_request" }),
        message: Type.String({ description: "The draft message text. Must be personalized to the contact." }),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const id = await convexMutation(convexUrl, "jobSearch:upsertOutreach", {
            contactId: params.contactId,
            channel: params.channel,
            message: params.message,
            status: "drafted",
          });

          return json({ success: true, id, message: `Draft saved (${params.channel})` });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Tool 5: Update Job Status ─────────────────────────────────────
    pluginApi.registerTool({
      name: "job_search_update_status",
      label: "Update Job Status",
      description:
        "Update the status of a job in the pipeline. Statuses: found, reviewed, applying, applied, interviewing, offer, rejected, pass.",
      parameters: Type.Object({
        jobId: Type.String({ description: "The Convex ID of the job listing" }),
        status: Type.String({ description: "New status: found, reviewed, applying, applied, interviewing, offer, rejected, pass" }),
        notes: Type.Optional(Type.String({ description: "Optional notes about the status change" })),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const extra: any = {};
          if (params.status === "applied") extra.appliedAt = Date.now();
          if (params.status === "interviewing") extra.responseAt = Date.now();

          await convexMutation(convexUrl, "jobSearch:updateJobStatus", {
            id: params.jobId,
            status: params.status,
            notes: params.notes,
            ...extra,
          });

          await convexMutation(convexUrl, "jobSearch:logActivity", {
            jobId: params.jobId,
            type: "status_changed",
            details: `Job status → ${params.status}${params.notes ? `: ${params.notes}` : ""}`,
          });

          return json({ success: true, message: `Status updated to: ${params.status}` });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Tool 6: Get Pipeline Stats ────────────────────────────────────
    pluginApi.registerTool({
      name: "job_search_stats",
      label: "Pipeline Stats",
      description:
        "Get current job search pipeline statistics — total jobs, by status, contacts, follow-ups due.",
      parameters: Type.Object({}),
      async execute() {
        try {
          const stats = await convexQuery(convexUrl, "jobSearch:stats", {});
          return json(stats);
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Tool 7: List Jobs ─────────────────────────────────────────────
    pluginApi.registerTool({
      name: "job_search_list_jobs",
      label: "List Pipeline Jobs",
      description:
        "List all jobs in the pipeline, optionally filtered by status.",
      parameters: Type.Object({
        status: Type.Optional(Type.String({ description: "Filter by status: found, reviewed, applying, applied, interviewing, offer, rejected, pass" })),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const jobs = await convexQuery(convexUrl, "jobSearch:listJobs", {
            status: params.status || undefined,
          });
          return json({
            count: jobs?.length ?? 0,
            jobs: jobs?.map((j: any) => ({
              id: j._id,
              title: j.title,
              company: j.companyName,
              score: j.matchScore,
              status: j.status,
              location: j.location,
              remote: j.remote,
              url: j.url,
            })),
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Tool 8: List Contacts ─────────────────────────────────────────
    pluginApi.registerTool({
      name: "job_search_list_contacts",
      label: "List Contacts",
      description:
        "List all contacts mapped for the job search, optionally filtered by company.",
      parameters: Type.Object({
        company: Type.Optional(Type.String({ description: "Filter by company name" })),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const contacts = await convexQuery(convexUrl, "jobSearch:listContacts", {});
          let filtered = contacts || [];
          if (params.company) {
            filtered = filtered.filter(
              (c: any) => c.company?.toLowerCase().includes(params.company.toLowerCase()),
            );
          }
          return json({
            count: filtered.length,
            contacts: filtered.map((c: any) => ({
              id: c._id,
              name: c.name,
              title: c.title,
              company: c.company,
              relationship: c.relationship,
              connectionDegree: c.connectionDegree,
              linkedinUrl: c.linkedinUrl,
            })),
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Tool 9: Guess Work Email ──────────────────────────────────────
    pluginApi.registerTool({
      name: "job_search_guess_email",
      label: "Guess Work Email",
      description:
        "Generate likely work email addresses for a contact based on common corporate email patterns. Verifies the domain has MX records. Updates the contact with the best guess.",
      parameters: Type.Object({
        contactId: Type.String({ description: "The Convex ID of the contact" }),
        firstName: Type.String({ description: "Contact's first name" }),
        lastName: Type.String({ description: "Contact's last name" }),
        companyDomain: Type.String({ description: "Company email domain (e.g. ramp.com, springhealth.com). Do NOT include www." }),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const first = params.firstName.toLowerCase().trim();
          const last = params.lastName.toLowerCase().trim();
          const domain = params.companyDomain.toLowerCase().trim().replace(/^www\./, "");

          // Generate common patterns
          const patterns = [
            `${first}.${last}@${domain}`,
            `${first}@${domain}`,
            `${first}${last}@${domain}`,
            `${first[0]}${last}@${domain}`,
            `${first}_${last}@${domain}`,
            `${first}-${last}@${domain}`,
            `${first[0]}.${last}@${domain}`,
            `${last}.${first}@${domain}`,
          ];

          // Check if domain has MX records (valid email domain)
          let domainValid = false;
          try {
            const dnsRes = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
            const dnsData = await dnsRes.json();
            domainValid = (dnsData.Answer?.length ?? 0) > 0;
          } catch {
            // DNS check failed — still return patterns
          }

          // The most common corporate pattern is first.last@domain
          const bestGuess = `${first}.${last}@${domain}`;

          // Update the contact with the best guess
          if (domainValid) {
            await convexMutation(convexUrl, "jobSearch:upsertContact", {
              id: params.contactId,
              name: `${params.firstName} ${params.lastName}`,
              email: bestGuess,
            });

            await convexMutation(convexUrl, "jobSearch:logActivity", {
              contactId: params.contactId,
              type: "email_guessed",
              details: `Guessed email for ${params.firstName} ${params.lastName}: ${bestGuess} (domain MX verified)`,
            });
          }

          return json({
            success: true,
            domainValid,
            bestGuess,
            allPatterns: patterns,
            note: domainValid
              ? `Domain ${domain} has valid MX records. Best guess: ${bestGuess}. Other patterns provided for fallback.`
              : `Could not verify MX records for ${domain}. Patterns generated but may not be deliverable.`,
            tip: "To verify, try sending a brief, professional email. If it bounces, try the next pattern.",
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Tool 10: Draft Email Outreach ─────────────────────────────────
    pluginApi.registerTool({
      name: "job_search_draft_email",
      label: "Draft Email Outreach",
      description:
        "Draft a professional email for a contact and save it as an outreach record. Use after guessing their work email.",
      parameters: Type.Object({
        contactId: Type.String({ description: "The Convex ID of the contact" }),
        jobId: Type.Optional(Type.String({ description: "The Convex ID of the related job listing" })),
        toEmail: Type.String({ description: "The recipient's email address" }),
        subject: Type.String({ description: "Email subject line" }),
        body: Type.String({ description: "Email body text. Should be personalized and professional." }),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const fullMessage = `To: ${params.toEmail}\nSubject: ${params.subject}\n\n${params.body}`;

          const id = await convexMutation(convexUrl, "jobSearch:upsertOutreach", {
            contactId: params.contactId,
            jobId: params.jobId,
            channel: "email",
            message: fullMessage,
            status: "drafted",
          });

          await convexMutation(convexUrl, "jobSearch:logActivity", {
            contactId: params.contactId,
            jobId: params.jobId,
            type: "email_drafted",
            details: `Email draft for ${params.toEmail}: "${params.subject}"`,
          });

          return json({
            success: true,
            id,
            message: `Email draft saved for ${params.toEmail}`,
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });
  },
};

export default jobSearchPlugin;
