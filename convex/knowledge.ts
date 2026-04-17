import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, optionalUser, resolveUserWithLegacy } from "./lib/auth";

export const store = mutation({
  args: {
    text: v.string(),
    tags: v.array(v.string()),
    source: v.string(),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const userId = await optionalUser(ctx);
    const id = await ctx.db.insert("knowledge", {
      text: args.text,
      tags: args.tags,
      source: args.source,
      createdAt: Date.now(),
      embedding: args.embedding,
      ...(userId && { userId }),
    });
    return id;
  },
});

export const list = query({
  args: {
    tag: v.optional(v.string()),
    limit: v.optional(v.number()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserWithLegacy(ctx, args.userId);
    const limit = args.limit ?? 20;

    let entries;
    if (userId === "__legacy__") {
      const all = await ctx.db.query("knowledge").order("desc").take(limit * 5);
      entries = all.filter((e) => !e.userId).slice(0, limit);
    } else {
      entries = await ctx.db
        .query("knowledge")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .take(limit);
    }

    if (args.tag) {
      return entries.filter((e) => e.tags.includes(args.tag!));
    }
    return entries;
  },
});

export const remove = mutation({
  args: { id: v.id("knowledge") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const entry = await ctx.db.get(args.id);
    if (!entry || entry.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});

// Backfill helper: list entries that need re-embedding
export const listForReembed = query({
  args: { limit: v.optional(v.number()), offset: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const all = await ctx.db.query("knowledge").collect();
    return all.slice(args.offset ?? 0, (args.offset ?? 0) + limit).map((e) => ({
      _id: e._id,
      text: e.text,
    }));
  },
});

// Backfill helper: update embedding for a specific entry
export const updateEmbedding = mutation({
  args: { id: v.id("knowledge"), embedding: v.array(v.float64()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { embedding: args.embedding });
  },
});

export const getById = query({
  args: { id: v.id("knowledge"), userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserWithLegacy(ctx, args.userId);
    const entry = await ctx.db.get(args.id);
    if (!entry) return null;
    if (userId === "__legacy__") {
      return !entry.userId ? entry : null;
    }
    return entry.userId === userId ? entry : null;
  },
});

// ── Tenant-filtered variant (kept for backward compat with VM agents) ──

export const listByUser = query({
  args: {
    userId: v.string(),
    tag: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const entries = await ctx.db
      .query("knowledge")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    if (args.tag) {
      return entries.filter((e) => e.tags.includes(args.tag!));
    }
    return entries;
  },
});
