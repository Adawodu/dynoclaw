import { NextRequest, NextResponse } from "next/server";
import { getGcpTokenForProject } from "@/lib/gcp-auth";
import { createSecret } from "@/lib/gcp-rest";

export async function POST(req: NextRequest) {
  const { project, secretName, value } = await req.json();

  const authResult = await getGcpTokenForProject(project ?? "");
  if (!authResult) {
    return NextResponse.json(
      { error: "Google account not connected." },
      { status: 400 }
    );
  }
  const { gcpToken } = authResult;

  try {
    await createSecret(gcpToken, project, secretName, value);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
