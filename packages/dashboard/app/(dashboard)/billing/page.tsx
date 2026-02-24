"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard } from "lucide-react";
import { useState } from "react";

function statusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "trialing":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "past_due":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "canceled":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "";
  }
}

function formatPrice(cents: number): string {
  if (cents === 0) return "Custom";
  return `$${(cents / 100).toFixed(0)}`;
}

export default function BillingPage() {
  const sub = useQuery(api.subscriptions.getByUserId, {});
  const plans = useQuery(api.pricingPlans.list, {});
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/create-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  async function openCheckout(stripePriceId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: stripePriceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  if (sub === undefined || plans === undefined) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Billing</h1>
        <Skeleton className="h-48" />
      </div>
    );
  }

  // Filter to plans with Stripe price IDs (purchasable)
  const purchasablePlans = (plans ?? []).filter((p) => p.stripePriceId);

  const trialDaysLeft = sub?.trialEnd
    ? Math.max(0, Math.ceil((sub.trialEnd - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          {sub && (
            <Badge variant="outline" className={statusColor(sub.status)}>
              {sub.status}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {sub ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-medium capitalize">{sub.plan ?? "—"}</p>
                </div>
                {trialDaysLeft !== null && sub.status === "trialing" && (
                  <div>
                    <p className="text-sm text-muted-foreground">Trial ends in</p>
                    <p className="font-medium">
                      {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
                {sub.currentPeriodEnd && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {sub.cancelAtPeriodEnd ? "Access until" : "Next billing date"}
                    </p>
                    <p className="font-medium">
                      {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {sub.stripeCustomerId !== "manual" && (
                <Button onClick={openPortal} disabled={loading}>
                  {loading ? "Loading..." : "Manage Plan"}
                </Button>
              )}

              {sub.status === "trialing" && purchasablePlans.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {purchasablePlans.map((plan) => (
                    <Button
                      key={plan._id}
                      variant={plan.highlighted ? "default" : "outline"}
                      className={plan.highlighted ? "gradient-brand text-white" : ""}
                      onClick={() => openCheckout(plan.stripePriceId!)}
                      disabled={loading}
                    >
                      Upgrade to {plan.name} — {formatPrice(plan.priceAmountCents)}/mo
                    </Button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No subscription found. Choose a plan to get started.
              </p>
              {purchasablePlans.length > 0 && (
                <div className="flex justify-center flex-wrap gap-2">
                  {purchasablePlans.map((plan) => (
                    <Button
                      key={plan._id}
                      variant={plan.highlighted ? "default" : "outline"}
                      className={plan.highlighted ? "gradient-brand text-white" : ""}
                      onClick={() => openCheckout(plan.stripePriceId!)}
                      disabled={loading}
                    >
                      {plan.name} — {formatPrice(plan.priceAmountCents)}/mo
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
