"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Puzzle } from "lucide-react";
import Link from "next/link";

interface PluginHealthCardProps {
  plugins: { pluginId: string; enabled: boolean }[];
  apiKeys: { secretName: string }[];
}

const PLUGIN_REQUIRED_KEYS: Record<string, string[]> = {
  postiz: ["postiz-api-key"],
  beehiiv: ["beehiiv-api-key", "beehiiv-publication-id"],
  "twitter-research": ["twitter-bearer-token"],
  gmail: ["google-api-key"],
  "brave-search": ["brave-search-api-key"],
};

export function PluginHealthCard({ plugins, apiKeys }: PluginHealthCardProps) {
  const keyNames = new Set(apiKeys.map((k) => k.secretName));
  const enabledPlugins = plugins.filter((p) => p.enabled);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Puzzle className="h-4 w-4" />
          Plugins
        </CardTitle>
      </CardHeader>
      <CardContent>
        {enabledPlugins.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No plugins enabled.{" "}
            <Link href="/plugins" className="underline hover:no-underline">
              Configure plugins
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {enabledPlugins.map((plugin) => {
              const required = PLUGIN_REQUIRED_KEYS[plugin.pluginId] ?? [];
              const missing = required.filter((k) => !keyNames.has(k));
              const status =
                required.length === 0
                  ? "ok"
                  : missing.length === 0
                    ? "ok"
                    : missing.length < required.length
                      ? "partial"
                      : "missing";

              return (
                <div
                  key={plugin.pluginId}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">{plugin.pluginId}</span>
                  <span className="flex items-center gap-1.5 text-sm">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        status === "ok"
                          ? "bg-green-500"
                          : status === "partial"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                    />
                    <span
                      className={
                        status === "ok"
                          ? "text-green-600 dark:text-green-400"
                          : status === "partial"
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-red-600 dark:text-red-400"
                      }
                    >
                      {status === "ok"
                        ? "Ready"
                        : status === "partial"
                          ? "Missing keys"
                          : "Missing keys"}
                    </span>
                  </span>
                </div>
              );
            })}
            <Link
              href="/plugins"
              className="mt-1 block text-xs text-muted-foreground underline hover:no-underline"
            >
              Manage plugins
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
