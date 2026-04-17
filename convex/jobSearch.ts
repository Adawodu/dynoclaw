import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, resolveUser } from "./lib/auth";

// ── Dashboard Stats ──────────────────────────────────────────────

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const jobs = await ctx.db.query("jobListings")
      .collect().then(rows => rows.filter(r => r.userId === userId));
    const contacts = await ctx.db.query("jobContacts")
      .collect().then(rows => rows.filter(r => r.userId === userId));
    const outreach = await ctx.db.query("jobOutreach")
      .collect().then(rows => rows.filter(r => r.userId === userId));

    const byStatus: Record<string, number> = {};
    for (const j of jobs) {
      byStatus[j.status] = (byStatus[j.status] ?? 0) + 1;
    }

    const avgScore = jobs.length > 0
      ? Math.round(jobs.reduce((sum, j) => sum + (j.matchScore ?? 0), 0) / jobs.length)
      : 0;

    const followUpsDue = outreach.filter(
      (o) => o.status === "sent" && !o.repliedAt &&
        o.sentAt && Date.now() - o.sentAt > 7 * 24 * 60 * 60 * 1000
    ).length;

    return {
      totalJobs: jobs.length,
      byStatus,
      totalContacts: contacts.length,
      totalOutreach: outreach.length,
      avgMatchScore: avgScore,
      followUpsDue,
    };
  },
});

// ── Target Companies ─────────────────────────────────────────────

export const listCompanies = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    let results = await ctx.db.query("targetCompanies")
      .collect().then(rows => rows.filter(r => r.userId === userId));
    if (args.status) {
      results = results.filter((c) => c.status === args.status);
    }
    return results.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getCompany = query({
  args: { id: v.id("targetCompanies") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const company = await ctx.db.get(args.id);
    if (!company) return null;
    return company.userId === userId ? company : null;
  },
});

export const upsertCompany = mutation({
  args: {
    id: v.optional(v.id("targetCompanies")),
    name: v.string(),
    website: v.optional(v.string()),
    stage: v.optional(v.string()),
    size: v.optional(v.string()),
    industry: v.optional(v.string()),
    location: v.optional(v.string()),
    whyInterested: v.optional(v.string()),
    fundingHistory: v.optional(v.string()),
    recentNews: v.optional(v.string()),
    challenges: v.optional(v.string()),
    techStack: v.optional(v.string()),
    intelBrief: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { id, ...fields } = args;
    if (id) {
      await ctx.db.patch(id, { ...fields, updatedAt: now });
      return id;
    }
    return await ctx.db.insert("targetCompanies", {
      ...fields,
      status: fields.status ?? "researching",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateCompanyStatus = mutation({
  args: { id: v.id("targetCompanies"), status: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status, updatedAt: Date.now() });
  },
});

// ── Job Listings ─────────────────────────────────────────────────

export const listJobs = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    let results = await ctx.db.query("jobListings")
      .collect().then(rows => rows.filter(r => r.userId === userId));
    if (args.status) {
      results = results.filter((j) => j.status === args.status);
    }
    return results.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  },
});

export const getJob = query({
  args: { id: v.id("jobListings") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const job = await ctx.db.get(args.id);
    if (!job) return null;
    return job.userId === userId ? job : null;
  },
});

export const upsertJob = mutation({
  args: {
    id: v.optional(v.id("jobListings")),
    companyId: v.optional(v.id("targetCompanies")),
    companyName: v.string(),
    title: v.string(),
    url: v.optional(v.string()),
    source: v.optional(v.string()),
    jdText: v.optional(v.string()),
    matchScore: v.optional(v.number()),
    matchReason: v.optional(v.string()),
    compensationRange: v.optional(v.string()),
    remote: v.optional(v.boolean()),
    location: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { id, ...fields } = args;
    if (id) {
      await ctx.db.patch(id, { ...fields, updatedAt: now });
      return id;
    }
    return await ctx.db.insert("jobListings", {
      ...fields,
      status: fields.status ?? "found",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateJobStatus = mutation({
  args: {
    id: v.id("jobListings"),
    status: v.string(),
    appliedAt: v.optional(v.number()),
    responseAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const removeJob = mutation({
  args: { id: v.id("jobListings") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

// ── Contacts ─────────────────────────────────────────────────────

export const listContacts = query({
  args: {
    companyId: v.optional(v.id("targetCompanies")),
    jobId: v.optional(v.id("jobListings")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db.query("jobContacts")
      .collect().then(rows => rows.filter(r => r.userId === userId));

    if (args.jobId) {
      return all.filter((c) => c.jobId === args.jobId);
    }
    if (args.companyId) {
      return all.filter((c) => c.companyId === args.companyId);
    }
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const upsertContact = mutation({
  args: {
    id: v.optional(v.id("jobContacts")),
    companyId: v.optional(v.id("targetCompanies")),
    jobId: v.optional(v.id("jobListings")),
    name: v.string(),
    title: v.optional(v.string()),
    company: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    email: v.optional(v.string()),
    connectionDegree: v.optional(v.string()),
    mutualConnections: v.optional(v.number()),
    relationship: v.optional(v.string()),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { id, ...fields } = args;
    if (id) {
      await ctx.db.patch(id, { ...fields, updatedAt: now });
      return id;
    }
    return await ctx.db.insert("jobContacts", {
      ...fields,
      relationship: fields.relationship ?? "cold",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ── Outreach ─────────────────────────────────────────────────────

export const listOutreach = query({
  args: {
    jobId: v.optional(v.id("jobListings")),
    contactId: v.optional(v.id("jobContacts")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db.query("jobOutreach")
      .collect().then(rows => rows.filter(r => r.userId === userId));

    if (args.contactId) {
      return all.filter((o) => o.contactId === args.contactId);
    }
    if (args.jobId) {
      return all.filter((o) => o.jobId === args.jobId);
    }
    if (args.status) {
      return all.filter((o) => o.status === args.status);
    }
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const upsertOutreach = mutation({
  args: {
    id: v.optional(v.id("jobOutreach")),
    contactId: v.id("jobContacts"),
    jobId: v.optional(v.id("jobListings")),
    channel: v.string(),
    message: v.string(),
    status: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    repliedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { id, ...fields } = args;
    if (id) {
      await ctx.db.patch(id, { ...fields, updatedAt: now });
      return id;
    }
    return await ctx.db.insert("jobOutreach", {
      ...fields,
      status: fields.status ?? "drafted",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateOutreachStatus = mutation({
  args: {
    id: v.id("jobOutreach"),
    status: v.string(),
    sentAt: v.optional(v.number()),
    repliedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

// ── Activity Log ─────────────────────────────────────────────────

export const logActivity = mutation({
  args: {
    jobId: v.optional(v.id("jobListings")),
    companyId: v.optional(v.id("targetCompanies")),
    contactId: v.optional(v.id("jobContacts")),
    type: v.string(),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("jobActivityLog", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const listActivity = query({
  args: {
    jobId: v.optional(v.id("jobListings")),
    companyId: v.optional(v.id("targetCompanies")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db.query("jobActivityLog")
      .collect().then(rows => rows.filter(r => r.userId === userId));

    let results;
    if (args.jobId) {
      results = all.filter((a) => a.jobId === args.jobId);
    } else if (args.companyId) {
      results = all.filter((a) => a.companyId === args.companyId);
    } else {
      results = all;
    }
    results.sort((a, b) => b.createdAt - a.createdAt);
    return args.limit ? results.slice(0, args.limit) : results;
  },
});

// ── Resumes ──────────────────────────────────────────────────────

export const listResumes = query({
  args: { jobId: v.id("jobListings") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.query("jobResumes")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId!))
      .collect()
      .then((r) => r.sort((a, b) => b.version - a.version));
  },
});

export const upsertResume = mutation({
  args: {
    id: v.optional(v.id("jobResumes")),
    jobId: v.id("jobListings"),
    version: v.number(),
    tailoredResumeText: v.optional(v.string()),
    coverLetterText: v.optional(v.string()),
    talkingPoints: v.optional(v.array(v.string())),
    driveFileId: v.optional(v.string()),
    driveUrl: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { id, ...fields } = args;
    if (id) {
      await ctx.db.patch(id, { ...fields, updatedAt: now });
      return id;
    }
    return await ctx.db.insert("jobResumes", {
      ...fields,
      status: fields.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});
