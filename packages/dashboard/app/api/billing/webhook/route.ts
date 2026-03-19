import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import Stripe from "stripe";

const relevantEvents = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "checkout.session.completed",
]);

function getConvex() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

async function planFromPriceId(priceId: string | undefined): Promise<string | undefined> {
  if (!priceId) return undefined;

  // Check env vars first (fast path)
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return "starter";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";

  // Fall back to checking Convex pricing plans
  try {
    const plans = await getConvex().query(api.pricingPlans.list, {});
    const match = plans.find((p) => p.stripePriceId === priceId);
    if (match) return match.slug;
  } catch {
    // Ignore — fall through to "unknown"
  }

  return "unknown";
}

export async function POST(req: NextRequest) {
  const convex = getConvex();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!relevantEvents.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  // Handle one-time payment completions (service orders)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const billingType = session.metadata?.billingType;
    const sessionUserId = session.metadata?.userId;
    const planId = session.metadata?.planId;

    if (billingType === "one_time" && sessionUserId && planId) {
      try {
        // Look up the plan to get the slug
        const plans = await convex.query(api.pricingPlans.list, {});
        const plan = plans.find((p) => p._id === planId);

        await convex.mutation(api.serviceOrders.create, {
          userId: sessionUserId,
          planId: planId as any,
          planSlug: plan?.slug ?? "unknown",
          stripeSessionId: session.id,
          stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
          amountCents: session.amount_total ?? 0,
        });
      } catch (err) {
        console.error("Failed to create service order:", err);
      }
    }

    return NextResponse.json({ received: true });
  }

  const subscription = event.data.object as Stripe.Subscription;
  const userId =
    subscription.metadata?.userId ??
    (typeof subscription.customer === "string"
      ? subscription.customer
      : undefined);

  if (!userId) {
    console.error("No userId in subscription metadata", subscription.id);
    return NextResponse.json({ error: "No userId" }, { status: 400 });
  }

  const priceId = subscription.items?.data?.[0]?.price?.id;

  await convex.mutation(api.subscriptions.upsert, {
    userId,
    stripeCustomerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.toString(),
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    status: subscription.status,
    plan: await planFromPriceId(priceId),
    currentPeriodEnd: subscription.cancel_at
      ? subscription.cancel_at * 1000
      : undefined,
    trialEnd: subscription.trial_end
      ? subscription.trial_end * 1000
      : undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  return NextResponse.json({ received: true });
}
