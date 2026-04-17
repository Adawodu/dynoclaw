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
    const email = identity.email ?? "";
    const now = Date.now();

    // 1. Check by clerkId first (exact match)
    const byClerkId = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (byClerkId) {
      await ctx.db.patch(byClerkId._id, {
        name: identity.name ?? byClerkId.name,
        email: email || byClerkId.email,
        imageUrl: identity.pictureUrl ?? byClerkId.imageUrl,
        lastSeenAt: now,
      });
      return byClerkId._id;
    }

    // 2. Check by email — same person, different auth method
    if (email) {
      const byEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (byEmail) {
        // Link this new clerkId to the existing account
        await ctx.db.patch(byEmail._id, {
          clerkId, // update to the new auth identity
          name: identity.name ?? byEmail.name,
          imageUrl: identity.pictureUrl ?? byEmail.imageUrl,
          lastSeenAt: now,
        });

        // Migrate any data tied to the old clerkId
        await migrateUserId(ctx, byEmail.clerkId, clerkId);

        return byEmail._id;
      }
    }

    // 3. New user
    const isEnvAdmin =
      ADMIN_SUBJECTS.length > 0 && ADMIN_SUBJECTS.includes(clerkId);

    return await ctx.db.insert("users", {
      clerkId,
      email,
      name: identity.name,
      imageUrl: identity.pictureUrl,
      role: isEnvAdmin ? "admin" : "user",
      status: "active",
      lastSeenAt: now,
      createdAt: now,
    });
  },
});

/** Reassign all user-owned records from oldUserId to newUserId */
async function migrateUserId(
  ctx: { db: any },
  oldId: string,
  newId: string,
) {
  if (oldId === newId) return;

  const tables = [
    "deployments",
    "subscriptions",
    "knowledge",
    "media",
    "inboxScans",
    "costSnapshots",
    "openrouterActivity",
    "targetCompanies",
    "jobListings",
    "jobContacts",
    "jobOutreach",
    "jobActivityLog",
    "jobResumes",
  ] as const;

  for (const table of tables) {
    try {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_userId", (q: any) => q.eq("userId", oldId))
        .collect();
      for (const row of rows) {
        await ctx.db.patch(row._id, { userId: newId });
      }
    } catch {
      // Table may not have by_userId index — skip
    }
  }
}

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
          deployments: deployments.map((d) => ({
            _id: d._id,
            vmName: d.vmName,
            gcpProjectId: d.gcpProjectId,
            gcpZone: d.gcpZone,
            machineType: d.machineType,
            status: d.status,
            branding: d.branding,
            models: d.models,
            deployedAt: d.deployedAt,
            lastHealthCheck: (d as any).lastHealthCheck ?? null,
            lastHealthStatus: (d as any).lastHealthStatus ?? null,
            error: (d as any).error ?? null,
          })),
          subscriptionStatus: subscription?.status ?? null,
          subscriptionPlan: subscription?.plan ?? null,
          subscriptionTrialEnd: subscription?.trialEnd ?? null,
          subscriptionCancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? null,
        };
      })
    );

    return enriched.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  },
});

/** Admin: find and merge duplicate users with the same email */
export const mergeDuplicates = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allUsers = await ctx.db.query("users").collect();

    // Group by email
    const byEmail: Record<string, typeof allUsers> = {};
    for (const u of allUsers) {
      if (!u.email) continue;
      (byEmail[u.email] ??= []).push(u);
    }

    let merged = 0;
    const results: string[] = [];

    for (const [email, dupes] of Object.entries(byEmail)) {
      if (dupes.length <= 1) continue;

      // Keep the oldest account (or the one with admin role)
      dupes.sort((a, b) => {
        if (a.role === "admin" && b.role !== "admin") return -1;
        if (b.role === "admin" && a.role !== "admin") return 1;
        return a.createdAt - b.createdAt;
      });

      const keeper = dupes[0];
      const toMerge = dupes.slice(1);

      for (const dupe of toMerge) {
        // Migrate data from dupe to keeper
        await migrateUserId(ctx, dupe.clerkId, keeper.clerkId);

        // Delete the duplicate user record
        await ctx.db.delete(dupe._id);
        merged++;
      }

      results.push(`${email}: kept ${keeper.clerkId.slice(0, 12)}…, merged ${toMerge.length} duplicate(s)`);
    }

    return { merged, details: results };
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
