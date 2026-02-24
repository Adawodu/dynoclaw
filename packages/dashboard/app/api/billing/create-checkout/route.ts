import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { priceId } = await req.json();
  if (!priceId) {
    return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
  }

  // Check if user already has a subscription record with a Stripe customer ID
  const convexToken = await getToken({ template: "convex" });
  if (convexToken) convex.setAuth(convexToken);

  let customerId: string | undefined;
  try {
    const sub = await convex.query(api.subscriptions.getByUserId, {});
    if (sub?.stripeCustomerId && sub.stripeCustomerId !== "manual") {
      customerId = sub.stripeCustomerId;
    }
  } catch {
    // No subscription yet — Stripe will create a new customer
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { userId },
    },
    ...(customerId ? { customer: customerId } : { customer_email: undefined }),
    metadata: { userId },
    success_url: `${appUrl}/overview?checkout=success`,
    cancel_url: `${appUrl}/#pricing`,
  });

  return NextResponse.json({ url: session.url });
}
