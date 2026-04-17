import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getGcpTokenForProject } from "@/lib/gcp-auth";
import { SignJWT } from "jose";

/**
 * Mint a short-lived JWT that authorizes access to a user's OpenClaw dashboard.
 *
 * Phase 1 (today): returns VM connection details + signed JWT. Frontend uses
 * these to render IAP tunnel instructions or (future) pass to Cloud Run broker.
 *
 * Phase 2 (later): Cloud Run broker validates this JWT, opens an IAP-for-TCP
 * tunnel to port 18789, and proxies the OpenClaw dashboard traffic.
 */
export async function POST(req: NextRequest) {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  const { deploymentId } = await req.json();
  if (!deploymentId) {
    return NextResponse.json(
      { error: "deploymentId is required" },
      { status: 400 },
    );
  }

  // Ownership check via Convex (same pattern as /api/gcp/vm)
  const managedAuth = await getGcpTokenForProject("dynoclaw-managed");
  const userAuth = await getGcpTokenForProject("");
  const convexToken = managedAuth?.convexToken ?? userAuth?.convexToken ?? null;

  if (!convexToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  convex.setAuth(convexToken);

  const deployment = await convex.query(api.deployments.get, {
    id: deploymentId as Id<"deployments">,
  });
  if (!deployment) {
    return NextResponse.json(
      { error: "Deployment not found" },
      { status: 404 },
    );
  }

  // For Phase 1, we only support managed deployments (where DynoClaw owns the GCP project).
  // Self-hosted deployments would need the user's OAuth token flow which the
  // Cloud Run broker (Phase 2) will handle properly.
  const isManaged = deployment.gcpProjectId === "dynoclaw-managed";
  if (!isManaged) {
    return NextResponse.json(
      {
        error:
          "OpenClaw dashboard proxy is currently only available for DynoClaw Managed deployments. Self-hosted support is coming soon.",
      },
      { status: 400 },
    );
  }

  // Mint a 5-minute JWT encoding deployment ownership
  const secret = process.env.TUNNEL_BROKER_SECRET;
  let jwt: string | null = null;
  if (secret) {
    try {
      const encoder = new TextEncoder();
      jwt = await new SignJWT({
        deploymentId: String(deployment._id),
        gcpProjectId: deployment.gcpProjectId,
        gcpZone: deployment.gcpZone,
        vmName: deployment.vmName,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("5m")
        .setIssuer("dynoclaw-dashboard")
        .setAudience("dynoclaw-tunnel-broker")
        .sign(encoder.encode(secret));
    } catch (err) {
      console.error("Failed to sign tunnel JWT:", err);
    }
  }

  return NextResponse.json({
    deploymentId: deployment._id,
    gcpProjectId: deployment.gcpProjectId,
    gcpZone: deployment.gcpZone,
    vmName: deployment.vmName,
    dashboardPort: 18789,
    // Phase 1: user runs gcloud start-iap-tunnel manually
    iapTunnelCommand: `gcloud compute start-iap-tunnel ${deployment.vmName} 18789 --project=${deployment.gcpProjectId} --zone=${deployment.gcpZone} --local-host-port=localhost:18789`,
    localDashboardUrl: `http://localhost:18789/`,
    // Phase 2: broker URL + JWT (not yet active)
    brokerUrl: process.env.TUNNEL_BROKER_URL ?? null,
    brokerToken: jwt,
    brokerReady: Boolean(secret && process.env.TUNNEL_BROKER_URL),
  });
}
