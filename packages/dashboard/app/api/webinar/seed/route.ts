import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { CATALYST_SLIDES } from "@/lib/webinar-seed-data";

export async function POST() {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  // Check if slides already exist
  const existing = await convex.query(api.webinarSlides.listByWebinar, {
    webinarId: "catalyst-mar-2026",
  });

  if (existing.length > 0) {
    return NextResponse.json(
      { message: `Already seeded (${existing.length} slides exist)` },
      { status: 200 }
    );
  }

  // Seed all slides
  let created = 0;
  for (const slide of CATALYST_SLIDES) {
    await convex.mutation(api.webinarSlides.create, {
      ...slide,
      subtitle: slide.subtitle ?? undefined,
      presenterInfo: slide.presenterInfo ?? undefined,
    });
    created++;
  }

  return NextResponse.json({ message: `Seeded ${created} slides` });
}
