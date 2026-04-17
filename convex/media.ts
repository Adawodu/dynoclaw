import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, optionalUser } from "./lib/auth";

export const store = mutation({
  args: {
    storageId: v.id("_storage"),
    type: v.string(),
    prompt: v.string(),
    provider: v.string(),
    mimeType: v.string(),
    driveUrl: v.optional(v.string()),
    driveFileId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await optionalUser(ctx);
    const id = await ctx.db.insert("media", {
      ...args,
      createdAt: Date.now(),
      ...(userId && { userId }),
    });
    return id;
  },
});

export const updateDriveInfo = mutation({
  args: {
    id: v.id("media"),
    driveUrl: v.string(),
    driveFileId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      driveUrl: args.driveUrl,
      driveFileId: args.driveFileId,
    });
  },
});

export const list = query({
  args: {
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const limit = args.limit ?? 20;

    const entries = await ctx.db
      .query("media")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    const filtered = args.type
      ? entries.filter((e) => e.type === args.type)
      : entries;

    return Promise.all(
      filtered.map(async (entry) => ({
        ...entry,
        url: await ctx.storage.getUrl(entry.storageId),
      })),
    );
  },
});

export const getById = query({
  args: { id: v.id("media") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const entry = await ctx.db.get(args.id);
    if (!entry || entry.userId !== userId) return null;
    const url = await ctx.storage.getUrl(entry.storageId);
    return { ...entry, url };
  },
});

// ── Tenant-filtered variant (kept for backward compat with VM agents) ──

export const listByUser = query({
  args: {
    userId: v.string(),
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const entries = await ctx.db
      .query("media")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    const filtered = args.type
      ? entries.filter((e) => e.type === args.type)
      : entries;

    return Promise.all(
      filtered.map(async (entry) => ({
        ...entry,
        url: await ctx.storage.getUrl(entry.storageId),
      })),
    );
  },
});
