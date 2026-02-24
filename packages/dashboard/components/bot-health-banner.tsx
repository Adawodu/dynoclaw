"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RotateCw, Clock, AlertTriangle } from "lucide-react";

interface BotHealthBannerProps {
  vmStatus: string;
  bootAgeSec: number | null;
  deploymentId: string;
}

/**
 * Shows contextual banners based on how long the VM has been running:
 * - < 3 min after boot: "Bot is starting up..." (informational)
 * - 3–5 min: "Bot may need a restart" with restart button (first-boot grace period)
 * - > 5 min: nothing (bot should be stable by now)
 *
 * The first-boot grace restart in the startup script handles most cases,
 * but this gives users visibility and a manual fallback.
 */
export function BotHealthBanner({
  vmStatus,
  bootAgeSec,
  deploymentId,
}: BotHealthBannerProps) {
  const [restarting, setRestarting] = useState(false);
  const [restarted, setRestarted] = useState(false);

  const handleRestart = useCallback(async () => {
    setRestarting(true);
    try {
      const res = await fetch("/api/gcp/vm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentId, action: "reset" }),
      });
      if (res.ok) {
        setRestarted(true);
      }
    } finally {
      setRestarting(false);
    }
  }, [deploymentId]);

  if (vmStatus !== "running" || bootAgeSec === null) return null;

  // After a restart was triggered, show confirmation
  if (restarted) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
        <div className="flex items-center gap-3">
          <RotateCw className="h-5 w-5 text-green-500" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Restart initiated. The bot will be back online in about 2 minutes.
          </p>
        </div>
      </div>
    );
  }

  // Still starting up (< 3 min)
  if (bootAgeSec < 180) {
    return (
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 animate-pulse text-blue-500" />
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              Bot is starting up...
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              First boot takes 3–5 minutes while dependencies install. The bot
              will auto-restart once ready.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Grace period (3–5 min) — bot might be stuck from first-boot load
  if (bootAgeSec < 300) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Bot may still be initializing
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-300">
                If the bot isn&apos;t responding on Telegram, try restarting. A
                scheduled auto-restart should happen shortly.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestart}
            disabled={restarting}
            className="shrink-0"
          >
            <RotateCw
              className={`mr-1 h-3 w-3 ${restarting ? "animate-spin" : ""}`}
            />
            {restarting ? "Restarting..." : "Restart Now"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
