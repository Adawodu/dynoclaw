"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { getRequiredApiKeys, PLATFORM_SECRETS } from "@dynoclaw/shared";
import { useState } from "react";
import type { WizardState } from "@/app/(dashboard)/deploy/page";

interface Props {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}

export function StepApiKeys({ state, update }: Props) {
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const enabledPlugins = Object.entries(state.plugins)
    .filter(([, v]) => v)
    .map(([k]) => k);

  // Derive required model-provider keys from the selected model chain.
  // Model slugs are "<provider>/<model>" — we parse providers and map to secrets.
  const providerToPlatformKey: Record<string, string> = {
    google: "googleAiApiKey",
    anthropic: "anthropicApiKey",
    openai: "openaiApiKey",
    openrouter: "openrouterApiKey",
  };

  const allModels = [state.models.primary, ...state.models.fallbacks].filter(Boolean);
  const requiredProviders = new Set<string>();
  for (const m of allModels) {
    const provider = m.split("/")[0];
    if (provider && providerToPlatformKey[provider]) {
      requiredProviders.add(providerToPlatformKey[provider]);
    }
  }

  // Telegram is always required — it's the user interface
  const requiredPlatformIds = new Set<string>(["telegramBotToken", ...requiredProviders]);
  const allPlatformKeyIds = new Set(PLATFORM_SECRETS.map((s) => s.key));
  const optionalPlatformIds = new Set<string>(
    [...allPlatformKeyIds].filter((k) => !requiredPlatformIds.has(k))
  );
  // Brave Search is never required at the platform level (plugin-specific)
  optionalPlatformIds.add("braveSearchApiKey");

  const platformKeys = [
    ...PLATFORM_SECRETS
      .filter((s) => requiredPlatformIds.has(s.key))
      .map((s) => ({ ...s, required: true })),
    ...PLATFORM_SECRETS
      .filter((s) => optionalPlatformIds.has(s.key) && !requiredPlatformIds.has(s.key))
      .map((s) => ({ ...s, required: false })),
  ];

  const keys = [
    ...platformKeys,
    ...getRequiredApiKeys(enabledPlugins),
  ];

  function toggleVisibility(secretName: string) {
    setVisibleKeys((prev) => ({ ...prev, [secretName]: !prev[secretName] }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">API Keys</CardTitle>
        <CardDescription>
          Enter your API keys. They will be stored in GCP Secret Manager.
          Values are saved as you type and persist across deploy attempts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {keys.map((k) => {
          const isVisible = visibleKeys[k.secretName] ?? false;
          const hasValue = !!state.apiKeys[k.secretName];

          return (
            <div key={k.secretName} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor={k.secretName}>{k.description}</Label>
                {k.required ? (
                  <Badge variant="destructive" className="text-[10px]">
                    Required
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    Optional
                  </Badge>
                )}
              </div>
              <div className="relative">
                <Input
                  id={k.secretName}
                  type={isVisible ? "text" : "password"}
                  placeholder={k.secretName}
                  value={state.apiKeys[k.secretName] ?? ""}
                  onChange={(e) =>
                    update({
                      apiKeys: {
                        ...state.apiKeys,
                        [k.secretName]: e.target.value,
                      },
                    })
                  }
                />
                {hasValue && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                    onClick={() => toggleVisibility(k.secretName)}
                  >
                    {isVisible ? (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                )}
              </div>
              <a
                href={k.signupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Get key
              </a>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
