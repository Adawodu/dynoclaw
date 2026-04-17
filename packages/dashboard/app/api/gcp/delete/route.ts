import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getGcpTokenForProject } from "@/lib/gcp-auth";
import { deleteInstance, deleteRouter, listSecrets, deleteSecret } from "@/lib/gcp-rest";

export async function POST(req: NextRequest) {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  const { deploymentId } = await req.json();
  if (!deploymentId) {
    return NextResponse.json(
      { error: "deploymentId is required" },
      { status: 400 }
    );
  }

  // We need the deployment record first to know the project
  // Try managed token first for the Convex query, fall back to user OAuth
  const authResult = await getGcpTokenForProject("dynoclaw-managed");
  const userAuth = await getGcpTokenForProject("");

  const convexToken = authResult?.convexToken ?? userAuth?.convexToken ?? null;
  if (!convexToken) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  convex.setAuth(convexToken);

  // Fetch deployment record from Convex to get GCP details
  const deployment = await convex.query(api.deployments.get, {
    id: deploymentId as Id<"deployments">,
  });
  if (!deployment) {
    return NextResponse.json(
      { error: "Deployment not found" },
      { status: 404 }
    );
  }

  // Now get the right GCP token for this deployment's project
  const gcpAuth = await getGcpTokenForProject(deployment.gcpProjectId);
  if (!gcpAuth) {
    return NextResponse.json(
      { error: "Cannot access GCP project." },
      { status: 400 }
    );
  }

  const { gcpProjectId, gcpZone, vmName } = deployment;
  const gcpRegion = gcpZone.replace(/-[a-z]$/, "");
  const errors: string[] = [];

  // GCP teardown — best-effort, collect errors
  try {
    await deleteInstance(gcpAuth.gcpToken, gcpProjectId, gcpZone, vmName);
  } catch (err) {
    errors.push(
      `Instance: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  try {
    await deleteRouter(gcpAuth.gcpToken, gcpProjectId, gcpRegion, "openclaw-router");
  } catch (err) {
    errors.push(
      `Router: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Clean up namespaced secrets for this VM
  try {
    const vmSecrets = await listSecrets(
      gcpAuth.gcpToken,
      gcpProjectId,
      `labels.dynoclaw-vm=${vmName.replace(/[^a-z0-9_-]/g, "_")}`,
    );
    for (const secretId of vmSecrets) {
      try {
        await deleteSecret(gcpAuth.gcpToken, gcpProjectId, secretId);
      } catch {
        // best-effort cleanup
      }
    }
    if (vmSecrets.length > 0) {
      console.log(`Cleaned up ${vmSecrets.length} secrets for ${vmName}`);
    }
  } catch (err) {
    errors.push(
      `Secrets cleanup: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Always attempt Convex cleanup so the user isn't stuck with a phantom record
  try {
    await convex.mutation(api.deployments.remove, {
      id: deploymentId as Id<"deployments">,
    });
  } catch (err) {
    errors.push(
      `Convex: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (errors.length > 0) {
    return NextResponse.json({
      success: true,
      warnings: errors,
    });
  }

  return NextResponse.json({ success: true });
}
