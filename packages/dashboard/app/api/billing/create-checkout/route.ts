import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export async function POST(req: NextRequest) {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { priceId, planId, billingType } = await req.json();
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
  const effectiveBillingType = billingType || "subscription";

  if (effectiveBillingType === "one_time") {
    // One-time payment — Stripe Checkout in payment mode
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      ...(customerId ? { customer: customerId } : {}),
      metadata: { userId, planId: planId || "", billingType: "one_time" },
      success_url: `${appUrl}/overview?checkout=success&type=service`,
      cancel_url: `${appUrl}/#pricing`,
    });

    return NextResponse.json({ url: session.url });
  }

  if (effectiveBillingType === "subscription_plus_setup") {
    // Subscription + one-time setup fee
    // Stripe supports this via line_items with mixed pricing
    const { setupPriceId } = await req.json().catch(() => ({ setupPriceId: undefined }));
    const lineItems: { price: string; quantity: number }[] = [
      { price: priceId, quantity: 1 },
    ];
    if (setupPriceId) {
      lineItems.push({ price: setupPriceId, quantity: 1 });
    }

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: lineItems,
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId },
      },
      ...(customerId ? { customer: customerId } : {}),
      metadata: { userId, planId: planId || "", billingType: "subscription_plus_setup" },
      success_url: `${appUrl}/overview?checkout=success`,
      cancel_url: `${appUrl}/#pricing`,
    });

    return NextResponse.json({ url: session.url });
  }

  // Default: subscription mode (existing behavior)
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { userId },
    },
    ...(customerId ? { customer: customerId } : { customer_email: undefined }),
    metadata: { userId, billingType: "subscription" },
    success_url: `${appUrl}/overview?checkout=success`,
    cancel_url: `${appUrl}/#pricing`,
  });

  return NextResponse.json({ url: session.url });
}
