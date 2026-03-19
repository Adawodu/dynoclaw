import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getGcpToken } from "@/lib/gcp-auth";
import { startInstance, stopInstance, resetInstance, setInstanceMetadata } from "@/lib/gcp-rest";
import { generateWebStartupScript } from "@/lib/startup-script";

export async function POST(req: NextRequest) {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const authResult = await getGcpToken();
  if (!authResult) {
    return NextResponse.json(
      { error: "Google account not connected." },
      { status: 400 }
    );
  }
  const { gcpToken, convexToken } = authResult;

  const { deploymentId, action } = await req.json();
  if (!deploymentId || !action) {
    return NextResponse.json(
      { error: "deploymentId and action are required" },
      { status: 400 }
    );
  }

  // Fetch deployment via authenticated query to verify ownership
  if (convexToken) {
    convex.setAuth(convexToken);
  }
  const deployment = await convex.query(api.deployments.get, {
    id: deploymentId as Id<"deployments">,
  });
  if (!deployment) {
    return NextResponse.json(
      { error: "Deployment not found" },
      { status: 404 }
    );
  }

  const { gcpProjectId, gcpZone, vmName } = deployment;

  try {
    switch (action) {
      case "start":
        await startInstance(gcpToken, gcpProjectId, gcpZone, vmName);
        break;
      case "stop":
        await stopInstance(gcpToken, gcpProjectId, gcpZone, vmName);
        break;
      case "reset": {
        // Regenerate startup script with latest config before restarting
        const pluginConfigs = await convex.query(api.pluginConfigs.listByDeployment, {
          deploymentId: deploymentId as Id<"deployments">,
        });
        const skillConfigs = await convex.query(api.skillConfigs.listByDeployment, {
          deploymentId: deploymentId as Id<"deployments">,
        });
        const enabledPlugins = (pluginConfigs ?? [])
          .filter((p: { enabled: boolean }) => p.enabled)
          .map((p: { pluginId: string }) => p.pluginId);
        const enabledSkills = (skillConfigs ?? [])
          .filter((s: { enabled: boolean }) => s.enabled)
          .map((s: { skillId: string }) => s.skillId);

        const startupScript = generateWebStartupScript({
          gcpProjectId,
          apiKeys: {},
          branding: deployment.branding,
          models: deployment.models,
          enabledPlugins,
          enabledSkills,
        });

        await setInstanceMetadata(gcpToken, gcpProjectId, gcpZone, vmName, [
          { key: "startup-script", value: startupScript },
        ]);
        await resetInstance(gcpToken, gcpProjectId, gcpZone, vmName);
        break;
      }
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
