import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getGcpTokenForProject } from "@/lib/gcp-auth";
import { startInstance, stopInstance, resetInstance, setInstanceMetadata } from "@/lib/gcp-rest";
import { generateWebStartupScript } from "@/lib/startup-script";

export async function POST(req: NextRequest) {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  const { deploymentId, action } = await req.json();
  if (!deploymentId || !action) {
    return NextResponse.json(
      { error: "deploymentId and action are required" },
      { status: 400 }
    );
  }

  // Get Convex token to fetch deployment (try managed first, then user OAuth)
  const managedAuth = await getGcpTokenForProject("dynoclaw-managed");
  const userAuth = await getGcpTokenForProject("");
  const convexToken = managedAuth?.convexToken ?? userAuth?.convexToken ?? null;

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

  // Get the right GCP token for this deployment's project
  const gcpAuth = await getGcpTokenForProject(deployment.gcpProjectId);
  if (!gcpAuth) {
    return NextResponse.json(
      { error: "Cannot access GCP project." },
      { status: 400 }
    );
  }

  const { gcpToken } = gcpAuth;
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
          securityMode: (deployment as Record<string, unknown>).securityMode as "secured" | "full-power" | undefined,
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
