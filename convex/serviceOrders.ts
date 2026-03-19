import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("serviceOrders")
      .collect()
      .then((orders) => orders.sort((a, b) => b.createdAt - a.createdAt));
  },
});

export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;
    return await ctx.db
      .query("serviceOrders")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect()
      .then((orders) => orders.sort((a, b) => b.createdAt - a.createdAt));
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    planId: v.id("pricingPlans"),
    planSlug: v.string(),
    stripeSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    amountCents: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("serviceOrders", {
      ...args,
      status: "paid",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("serviceOrders"),
    status: v.union(
      v.literal("paid"),
      v.literal("in_progress"),
      v.literal("delivered"),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      status: args.status,
      notes: args.notes,
      updatedAt: Date.now(),
    });
  },
});

export const getByStripeSession = query({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("serviceOrders")
      .withIndex("by_stripeSessionId", (q) => q.eq("stripeSessionId", args.stripeSessionId))
      .first();
  },
});
