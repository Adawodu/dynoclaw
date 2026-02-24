import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

export async function POST() {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const convexToken = await getToken({ template: "convex" });
  if (convexToken) convex.setAuth(convexToken);

  // Idempotent — check if subscription already exists
  const existing = await convex.query(api.subscriptions.getByUserId, {});
  if (existing) {
    return NextResponse.json({ status: existing.status, existed: true });
  }

  // Create a Stripe customer if Stripe is configured, otherwise use a placeholder
  let stripeCustomerId = "pending";
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const { getStripe } = await import("@/lib/stripe");
      const customer = await getStripe().customers.create({
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
    } catch (err) {
      console.error("Stripe customer creation failed:", err);
    }
  }

  // Create the trial record in Convex
  await convex.mutation(api.subscriptions.createTrial, {
    stripeCustomerId,
  });

  return NextResponse.json({ status: "trialing", existed: false });
}
