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
  if (ADMIN_SUBJECTS.length > 0 && !ADMIN_SUBJECTS.includes(identity.subject)) {
    throw new Error("Not authorized — admin access required");
  }
  return identity.subject;
}

export async function isAdmin(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;
  if (ADMIN_SUBJECTS.length === 0) return true; // No admin list = everyone is admin (dev mode)
  return ADMIN_SUBJECTS.includes(identity.subject);
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
