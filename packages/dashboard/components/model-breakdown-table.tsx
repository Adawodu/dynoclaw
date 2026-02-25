"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  aggregateByModel,
  aggregateFallbackSpend,
  classifyModel,
  usd,
  type ActivityRow,
} from "@/lib/formatters";

interface ModelBreakdownTableProps {
  activity: ActivityRow[];
  primaryModel?: string;
  fallbackModels?: string[];
}

export function ModelBreakdownTable({
  activity,
  primaryModel,
  fallbackModels,
}: ModelBreakdownTableProps) {
  const rows = aggregateByModel(activity);
  const hasClassification = !!primaryModel;

  const fallback =
    fallbackModels && fallbackModels.length > 0
      ? aggregateFallbackSpend(activity, fallbackModels)
      : null;

  if (rows.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Per-Model Breakdown (30d)</CardTitle>
      </CardHeader>
      <CardContent>
        {fallback && fallback.total > 0 && fallback.percentage > 50 && (
          <div className="mb-4 rounded-md border border-amber-500/50 bg-amber-50 px-4 py-3 dark:bg-amber-950/20">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Fallback models account for {fallback.percentage.toFixed(0)}% of
              your spend ({usd(fallback.total)})
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              This usually means your primary model is failing and requests are
              being routed to more expensive fallback models.
            </p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Model</th>
                {hasClassification && (
                  <th className="pb-2 font-medium">Role</th>
                )}
                <th className="pb-2 text-right font-medium">Cost</th>
                <th className="pb-2 text-right font-medium">Requests</th>
                <th className="pb-2 text-right font-medium">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([model, d]) => {
                const role = hasClassification
                  ? classifyModel(model, primaryModel, fallbackModels ?? [])
                  : null;
                return (
                  <tr key={model} className="border-b border-border/50">
                    <td className="py-2">{model}</td>
                    {hasClassification && (
                      <td className="py-2">
                        {role === "primary" && (
                          <Badge
                            variant="outline"
                            className="border-green-500/50 text-green-700 dark:text-green-400"
                          >
                            Primary
                          </Badge>
                        )}
                        {role === "fallback" && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/50 text-amber-700 dark:text-amber-400"
                          >
                            Fallback
                          </Badge>
                        )}
                        {role === "other" && (
                          <Badge variant="outline">Other</Badge>
                        )}
                      </td>
                    )}
                    <td className="py-2 text-right tabular-nums">{usd(d.usageUsd)}</td>
                    <td className="py-2 text-right tabular-nums">{d.requests.toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums">{d.tokens.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
