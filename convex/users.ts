import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

const ADMIN_SUBJECTS = (process.env.ADMIN_USER_IDS ?? "").split(",").filter(Boolean);

export const touch = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clerkId = identity.subject;
    const now = Date.now();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: identity.name ?? existing.name,
        email: identity.email ?? existing.email,
        imageUrl: identity.pictureUrl ?? existing.imageUrl,
        lastSeenAt: now,
      });
      return existing._id;
    }

    const isEnvAdmin =
      ADMIN_SUBJECTS.length > 0 && ADMIN_SUBJECTS.includes(clerkId);

    return await ctx.db.insert("users", {
      clerkId,
      email: identity.email ?? "",
      name: identity.name,
      imageUrl: identity.pictureUrl,
      role: isEnvAdmin ? "admin" : "user",
      status: "active",
      lastSeenAt: now,
      createdAt: now,
    });
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();

    const enriched = await Promise.all(
      users.map(async (user) => {
        const deployments = await ctx.db
          .query("deployments")
          .withIndex("by_userId", (q) => q.eq("userId", user.clerkId))
          .collect();

        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("by_userId", (q) => q.eq("userId", user.clerkId))
          .first();

        return {
          ...user,
          deploymentCount: deployments.length,
          subscriptionStatus: subscription?.status ?? null,
          subscriptionPlan: subscription?.plan ?? null,
        };
      })
    );

    return enriched;
  },
});

export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("admin")),
  },
  handler: async (ctx, { userId, role }) => {
    const adminClerkId = await requireAdmin(ctx);

    const target = await ctx.db.get(userId);
    if (!target) throw new Error("User not found");

    if (target.clerkId === adminClerkId && role !== "admin") {
      throw new Error("Cannot demote yourself");
    }

    await ctx.db.patch(userId, { role });
  },
});

export const setStatus = mutation({
  args: {
    userId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("suspended")),
  },
  handler: async (ctx, { userId, status }) => {
    const adminClerkId = await requireAdmin(ctx);

    const target = await ctx.db.get(userId);
    if (!target) throw new Error("User not found");

    if (target.clerkId === adminClerkId) {
      throw new Error("Cannot suspend yourself");
    }

    await ctx.db.patch(userId, { status });
  },
});
