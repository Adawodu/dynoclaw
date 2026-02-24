"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
import Link from "next/link";

interface ChannelStatusCardProps {
  apiKeys: { secretName: string }[];
}

export function ChannelStatusCard({ apiKeys }: ChannelStatusCardProps) {
  const keyNames = new Set(apiKeys.map((k) => k.secretName));
  const hasTelegram = keyNames.has("telegram-bot-token");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4" />
          Channels
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-sm">Telegram</span>
          {hasTelegram ? (
            <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Connected
            </span>
          ) : (
            <Link
              href="/api-keys"
              className="text-sm text-muted-foreground underline hover:no-underline"
            >
              Not configured
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
