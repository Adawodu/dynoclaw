"use client";

import { SignUpButton } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

// Fallback plans shown while loading or if no DB plans exist
const fallbackPlans = [
  {
    name: "Starter",
    price: "$79",
    priceLabel: "/mo",
    setupPrice: null as string | null,
    description: "Managed hosting — we handle the infrastructure.",
    features: [
      "Managed VM (e2-medium)",
      "5 plugins",
      "3 scheduled skills",
      "Community support",
      "14-day free trial",
    ],
    cta: "Start Free Trial",
    highlighted: false,
    billingType: "subscription" as const,
  },
  {
    name: "Pro",
    price: "$199",
    priceLabel: "/mo",
    setupPrice: null as string | null,
    description: "Managed hosting with unlimited power and flexibility.",
    features: [
      "Managed VM (e2-standard-2)",
      "Unlimited plugins",
      "Unlimited skills",
      "Priority support",
      "14-day free trial",
      "Custom branding",
    ],
    cta: "Start Free Trial",
    highlighted: true,
    billingType: "subscription" as const,
  },
  {
    name: "Agency",
    price: "$399",
    priceLabel: "/mo",
    setupPrice: null as string | null,
    description: "Multi-agent deployment for agencies and teams.",
    features: [
      "3 agent instances",
      "Unlimited plugins & skills",
      "Priority support + SLA",
      "Team management dashboard",
      "Custom branding",
      "Dedicated onboarding",
    ],
    cta: "Start Free Trial",
    highlighted: false,
    billingType: "subscription" as const,
  },
  {
    name: "Enterprise",
    price: "$999",
    priceLabel: "/mo",
    setupPrice: null as string | null,
    description: "Self-hosted in your own GCP project with dedicated support.",
    features: [
      "Deploy to your cloud",
      "Unlimited plugins & skills",
      "Dedicated support + SLA",
      "Full data ownership",
      "Org policy compliant",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    highlighted: false,
    billingType: "subscription" as const,
  },
];

function formatPrice(cents: number): string {
  if (cents === 0) return "Custom";
  return `$${(cents / 100).toFixed(0)}`;
}

function getPriceLabel(billingType: string): string {
  if (billingType === "one_time") return "";
  return "/mo";
}

function getDefaultCta(billingType: string, priceAmountCents: number): string {
  if (priceAmountCents === 0) return "Contact Sales";
  if (billingType === "one_time") return "Get Started";
  return "Start Free Trial";
}

export function Pricing() {
  const dbPlans = useQuery(api.pricingPlans.list, {});

  const plans =
    dbPlans && dbPlans.length > 0
      ? dbPlans.map((p) => ({
          name: p.name,
          price: formatPrice(p.priceAmountCents),
          priceLabel: getPriceLabel(p.billingType ?? "subscription"),
          setupPrice:
            p.billingType === "subscription_plus_setup" && p.setupFeeCents
              ? formatPrice(p.setupFeeCents)
              : null,
          description: p.description,
          features: p.features,
          cta: p.ctaText || getDefaultCta(p.billingType ?? "subscription", p.priceAmountCents),
          highlighted: p.highlighted,
          billingType: p.billingType ?? "subscription",
        }))
      : fallbackPlans;

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-24">
      <div className="mb-16 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Start free.{" "}
          <span className="gradient-brand-text">Scale when ready.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          14-day free trial on every plan. No credit card required. Cancel anytime.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative flex flex-col border-border/50 bg-card/50 backdrop-blur ${
              plan.highlighted ? "border-primary/50 shadow-lg shadow-primary/10" : ""
            }`}
          >
            {plan.highlighted && (
              <Badge className="gradient-brand absolute -top-3 left-1/2 -translate-x-1/2 text-white">
                Most Popular
              </Badge>
            )}
            <CardContent className="flex flex-1 flex-col p-6">
              <h3 className="text-lg font-semibold">{plan.name}</h3>

              {/* Pricing display */}
              <div className="mt-2">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                {plan.priceLabel && (
                  <span className="text-muted-foreground">{plan.priceLabel}</span>
                )}
              </div>
              {plan.setupPrice && (
                <p className="mt-1 text-sm text-muted-foreground">
                  + {plan.setupPrice} one-time setup
                </p>
              )}
              {plan.billingType === "one_time" && plan.price !== "Custom" && (
                <p className="mt-1 text-sm text-muted-foreground">
                  one-time payment
                </p>
              )}

              <p className="mt-2 text-sm text-muted-foreground">
                {plan.description}
              </p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {plan.cta === "Contact Sales" ? (
                  <a href="/enterprise">
                    <Button variant="outline" className="w-full">
                      {plan.cta}
                    </Button>
                  </a>
                ) : (
                  <SignUpButton mode="modal">
                    <Button
                      className={`w-full ${plan.highlighted ? "gradient-brand text-white" : ""}`}
                      variant={plan.highlighted ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </SignUpButton>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
