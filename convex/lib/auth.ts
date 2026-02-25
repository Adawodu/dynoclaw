import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import type { Doc } from "../_generated/dataModel";

export async function requireUser(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // Check suspension in DB (only for query/mutation contexts that have db)
  if ("db" in ctx) {
    const userRecord = await (ctx as QueryCtx).db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (userRecord?.status === "suspended") {
      throw new Error("Account suspended");
    }
  }

  return identity.subject;
}

export async function optionalUser(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

const ADMIN_SUBJECTS = (process.env.ADMIN_USER_IDS ?? "").split(",").filter(Boolean);

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // Env var is the bootstrap source of truth
  if (ADMIN_SUBJECTS.length > 0 && ADMIN_SUBJECTS.includes(identity.subject)) {
    return identity.subject;
  }

  // Fall back to DB role
  if ("db" in ctx) {
    const userRecord = await (ctx as QueryCtx).db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (userRecord?.role === "admin") {
      return identity.subject;
    }
  }

  // If env var list is empty and no DB record, allow (dev mode)
  if (ADMIN_SUBJECTS.length === 0) {
    return identity.subject;
  }

  throw new Error("Not authorized — admin access required");
}

export async function isAdmin(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;

  // Env var check
  if (ADMIN_SUBJECTS.length > 0 && ADMIN_SUBJECTS.includes(identity.subject)) {
    return true;
  }

  // DB role check
  if ("db" in ctx) {
    const userRecord = await (ctx as QueryCtx).db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (userRecord?.role === "admin") {
      return true;
    }
  }

  // Dev mode: no admin list = everyone is admin
  if (ADMIN_SUBJECTS.length === 0) return true;

  return false;
}

export async function requireDeploymentOwner(
  ctx: QueryCtx | MutationCtx,
  deploymentId: Id<"deployments">
): Promise<{ userId: string; deployment: Doc<"deployments"> }> {
  const userId = await requireUser(ctx);
  const deployment = await ctx.db.get(deploymentId);
  if (!deployment || deployment.userId !== userId) {
    throw new Error("Deployment not found");
  }
  return { userId, deployment };
}
