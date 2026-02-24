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
    price: "$49",
    description: "For individuals getting started with AI automation.",
    features: [
      "1 GCP deployment",
      "5 plugins",
      "3 scheduled skills",
      "Community support",
      "14-day free trial",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$149",
    description: "For teams that need full power and flexibility.",
    features: [
      "3 GCP deployments",
      "Unlimited plugins",
      "Unlimited skills",
      "Priority support",
      "14-day free trial",
      "Custom branding",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For organizations with advanced security and scale needs.",
    features: [
      "Unlimited deployments",
      "Unlimited everything",
      "Dedicated support",
      "SLA guarantee",
      "SSO & audit logs",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

function formatPrice(cents: number): string {
  if (cents === 0) return "Custom";
  return `$${(cents / 100).toFixed(0)}`;
}

export function Pricing() {
  const dbPlans = useQuery(api.pricingPlans.list, {});

  const plans =
    dbPlans && dbPlans.length > 0
      ? dbPlans.map((p) => ({
          name: p.name,
          price: formatPrice(p.priceAmountCents),
          description: p.description,
          features: p.features,
          cta:
            p.priceAmountCents === 0 ? "Contact Sales" : "Start Free Trial",
          highlighted: p.highlighted,
        }))
      : fallbackPlans;

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-24">
      <div className="mb-16 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Simple, transparent{" "}
          <span className="gradient-brand-text">pricing</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Start with a 14-day free trial. No credit card required.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
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
              <div className="mt-2">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                {plan.price !== "Custom" && (
                  <span className="text-muted-foreground">/mo</span>
                )}
              </div>
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
                  <a href="mailto:hello@dynoclaw.com">
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
