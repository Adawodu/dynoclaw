"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

interface ActionItem {
  message: string;
  href: string;
}

interface ActionItemsBannerProps {
  vmStatus: string;
  apiKeys: { secretName: string }[];
  plugins: { pluginId: string; enabled: boolean }[];
  skills: { skillId: string; enabled: boolean }[];
}

const PLUGIN_REQUIRED_KEYS: Record<string, string[]> = {
  postiz: ["postiz-api-key"],
  beehiiv: ["beehiiv-api-key", "beehiiv-publication-id"],
  "twitter-research": ["twitter-bearer-token"],
  gmail: ["google-api-key"],
  "brave-search": ["brave-search-api-key"],
};

export function ActionItemsBanner({
  vmStatus,
  apiKeys,
  plugins,
  skills,
}: ActionItemsBannerProps) {
  const items: ActionItem[] = [];
  const keyNames = new Set(apiKeys.map((k) => k.secretName));

  if (vmStatus === "stopped") {
    items.push({ message: "VM is stopped — your bot is offline", href: "/settings" });
  }

  // Check if telegram bot token exists
  if (!keyNames.has("telegram-bot-token")) {
    items.push({
      message: "Telegram bot token not configured",
      href: "/api-keys",
    });
  }

  // Check enabled plugins for missing keys
  const enabledPlugins = plugins.filter((p) => p.enabled);
  for (const plugin of enabledPlugins) {
    const required = PLUGIN_REQUIRED_KEYS[plugin.pluginId] ?? [];
    const missing = required.filter((k) => !keyNames.has(k));
    if (missing.length > 0) {
      items.push({
        message: `${plugin.pluginId} plugin missing keys: ${missing.join(", ")}`,
        href: "/api-keys",
      });
    }
  }

  // Check if enabled skills depend on disabled plugins
  const enabledPluginIds = new Set(enabledPlugins.map((p) => p.pluginId));
  const enabledSkills = skills.filter((s) => s.enabled);
  for (const skill of enabledSkills) {
    // We don't have requiredPlugins in the DB record, so skip this check
    // The plugin health card handles this more thoroughly
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
            Action needed
          </p>
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.message} className="text-sm text-yellow-600 dark:text-yellow-300">
                <Link href={item.href} className="underline hover:no-underline">
                  {item.message}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
