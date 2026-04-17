import { NextRequest, NextResponse } from "next/server";
import { getGcpTokenForProject } from "@/lib/gcp-auth";
import { getSerialPortOutput } from "@/lib/gcp-rest";

export async function GET(req: NextRequest) {
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

  const authResult = await getGcpTokenForProject(project);
  if (!authResult) {
    return NextResponse.json(
      { error: "Cannot access GCP project." },
      { status: 400 }
    );
  }

  try {
    const output = await getSerialPortOutput(authResult.gcpToken, project, zone, vm);
    return NextResponse.json({ output });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
