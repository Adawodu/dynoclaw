import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

export const listVisible = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("navLinks")
      .withIndex("by_visible", (q) => q.eq("visible", true))
      .collect()
      .then((links) => links.sort((a, b) => a.sortOrder - b.sortOrder));
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("navLinks")
      .collect()
      .then((links) => links.sort((a, b) => a.sortOrder - b.sortOrder));
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("navLinks")),
    label: v.string(),
    href: v.string(),
    section: v.string(),
    placement: v.array(v.string()),
    sortOrder: v.number(),
    visible: v.boolean(),
    isExternal: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const { id, ...data } = args;
    if (id) {
      await ctx.db.patch(id, { ...data, updatedAt: now });
      return id;
    }
    return await ctx.db.insert("navLinks", {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("navLinks") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

const SEED_LINKS = [
  { label: "Features", href: "/#features", section: "product", placement: ["footer", "nav"], sortOrder: 1, isExternal: false },
  { label: "How It Works", href: "/#how-it-works", section: "product", placement: ["nav"], sortOrder: 2, isExternal: false },
  { label: "Pricing", href: "/#pricing", section: "product", placement: ["footer", "nav"], sortOrder: 3, isExternal: false },
  { label: "Guide", href: "/guide", section: "product", placement: ["footer", "nav"], sortOrder: 4, isExternal: false },
  { label: "About", href: "/about", section: "company", placement: ["footer"], sortOrder: 5, isExternal: false },
  { label: "Blog", href: "/blog", section: "company", placement: ["footer"], sortOrder: 6, isExternal: false },
  { label: "Careers", href: "/careers", section: "company", placement: ["footer"], sortOrder: 7, isExternal: false },
  { label: "Privacy", href: "/privacy", section: "legal", placement: ["footer"], sortOrder: 8, isExternal: false },
  { label: "Terms", href: "/terms", section: "legal", placement: ["footer"], sortOrder: 9, isExternal: false },
  { label: "Twitter", href: "/#", section: "connect", placement: ["footer"], sortOrder: 10, isExternal: true },
  { label: "GitHub", href: "/#", section: "connect", placement: ["footer"], sortOrder: 11, isExternal: true },
  { label: "Discord", href: "/#", section: "connect", placement: ["footer"], sortOrder: 12, isExternal: true },
];

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await _seed(ctx);
  },
});

// Internal seed logic — also used by seedInternal for CLI bootstrapping
async function _seed(ctx: { db: import("./_generated/server").MutationCtx["db"] }) {
  const existing = await ctx.db.query("navLinks").collect();
  if (existing.length > 0) return { seeded: 0 };
  const now = Date.now();
  for (const link of SEED_LINKS) {
    await ctx.db.insert("navLinks", {
      ...link,
      visible: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  return { seeded: SEED_LINKS.length };
}

/** Unauthenticated seed — idempotent, safe to call from CLI/dashboard setup */
export const seedInternal = mutation({
  args: {},
  handler: async (ctx) => {
    return await _seed(ctx);
  },
});
