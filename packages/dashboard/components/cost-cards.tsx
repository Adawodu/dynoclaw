"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usd, aggregateFallbackSpend, type ActivityRow } from "@/lib/formatters";

interface CostCardsProps {
  snapshot: {
    openrouterBalance: number;
    openrouterUsed30d: number;
    openaiCostToday: number;
    openaiCostMtd: number;
    gcpEstimateMo: number;
  } | null;
  activity?: ActivityRow[];
  fallbackModels?: string[];
}

export function CostCards({ snapshot, activity, fallbackModels }: CostCardsProps) {
  const s = snapshot;
  const monthlyTotal = s
    ? s.openrouterUsed30d + s.openaiCostMtd + s.gcpEstimateMo
    : 0;

  const fallback =
    activity && fallbackModels && fallbackModels.length > 0
      ? aggregateFallbackSpend(activity, fallbackModels)
      : null;

  const cards = [
    { title: "Monthly Estimate", value: s ? usd(monthlyTotal) : "--" },
    { title: "OpenRouter (30d)", value: s ? usd(s.openrouterUsed30d) : "--" },
    { title: "OpenRouter Balance", value: s ? usd(s.openrouterBalance) : "--" },
    { title: "OpenAI MTD", value: s ? usd(s.openaiCostMtd) : "--" },
    { title: "GCP Compute", value: s ? usd(s.gcpEstimateMo) + "/mo" : "--" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {c.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{c.value}</p>
          </CardContent>
        </Card>
      ))}
      {fallback && (
        <Card className={fallback.total > 0 ? "border-amber-500/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Fallback Spend (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${fallback.total > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {usd(fallback.total)}
            </p>
            {fallback.total > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {fallback.percentage.toFixed(0)}% of total model spend
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
