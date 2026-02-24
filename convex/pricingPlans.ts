import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("pricingPlans")
      .collect()
      .then((plans) =>
        plans
          .filter((p) => p.active)
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("pricingPlans")
      .collect()
      .then((plans) => plans.sort((a, b) => a.sortOrder - b.sortOrder));
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("pricingPlans")),
    slug: v.string(),
    name: v.string(),
    priceAmountCents: v.number(),
    stripePriceId: v.optional(v.string()),
    description: v.string(),
    features: v.array(v.string()),
    highlighted: v.boolean(),
    sortOrder: v.number(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...data } = args;
    if (id) {
      await ctx.db.patch(id, data);
      return id;
    }
    return await ctx.db.insert("pricingPlans", data);
  },
});

export const remove = mutation({
  args: { id: v.id("pricingPlans") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
