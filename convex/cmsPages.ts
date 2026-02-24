import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("cmsPages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!page || !page.published) return null;
    return page;
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("cmsPages")
      .collect()
      .then((pages) => pages.sort((a, b) => a.sortOrder - b.sortOrder));
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("cmsPages")),
    slug: v.string(),
    title: v.string(),
    body: v.string(),
    published: v.boolean(),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const { id, ...data } = args;
    if (id) {
      await ctx.db.patch(id, {
        ...data,
        sortOrder: data.sortOrder ?? 0,
        updatedAt: now,
      });
      return id;
    }
    return await ctx.db.insert("cmsPages", {
      ...data,
      sortOrder: data.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("cmsPages") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

/** Unauthenticated seed — idempotent, for CLI bootstrapping */
export const seedInternal = mutation({
  args: {
    slug: v.string(),
    title: v.string(),
    body: v.string(),
    published: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cmsPages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) return { created: false, id: existing._id };
    const now = Date.now();
    const id = await ctx.db.insert("cmsPages", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    return { created: true, id };
  },
});
