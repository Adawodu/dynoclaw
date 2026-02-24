import { NextRequest, NextResponse } from "next/server";
import { getGcpToken } from "@/lib/gcp-auth";
import { getInstance } from "@/lib/gcp-rest";

export async function GET(req: NextRequest) {
  const authResult = await getGcpToken();
  if (!authResult) {
    return NextResponse.json(
      { error: "Google account not connected." },
      { status: 400 }
    );
  }
  const { gcpToken } = authResult;

  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  const zone = searchParams.get("zone");
  const vm = searchParams.get("vm");

  if (!project || !zone || !vm) {
    return NextResponse.json(
      { error: "Missing project, zone, or vm" },
      { status: 400 }
    );
  }

  try {
    const instance = await getInstance(gcpToken, project, zone, vm);
    if (!instance) {
      return NextResponse.json({ status: "NOT_FOUND" });
    }
    const networkInterfaces = instance.networkInterfaces as
      | Array<{ networkIP?: string }>
      | undefined;
    return NextResponse.json({
      status: instance.status,
      lastStartTimestamp: instance.lastStartTimestamp || null,
      lastStopTimestamp: instance.lastStopTimestamp || null,
      internalIp: networkInterfaces?.[0]?.networkIP || null,
      creationTimestamp: instance.creationTimestamp || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
