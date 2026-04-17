"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Server, Cloud, Check, Shield, Zap, Info } from "lucide-react";
import type { WizardState } from "@/app/(dashboard)/deploy/page";

interface Props {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}

const options = [
  {
    id: "managed" as const,
    icon: Server,
    title: "DynoClaw Managed",
    description: "We handle the infrastructure. No GCP account needed.",
    features: [
      "Isolated VM managed by DynoClaw",
      "Automatic updates & maintenance",
      "API keys encrypted in GCP Secret Manager",
      "From $79/mo",
    ],
  },
  {
    id: "self-hosted" as const,
    icon: Cloud,
    title: "Your Cloud",
    description: "Deploy to your own GCP project for full data ownership.",
    features: [
      "Full ownership of all infrastructure",
      "Org policy compliant (Domain Restricted Sharing)",
      "Data stays in your GCP project",
      "From $399/mo",
    ],
  },
];

const securityModes = [
  {
    id: "secured" as const,
    icon: Shield,
    title: "Secured",
    badge: "Recommended",
    description: "Your AI teammate asks permission before running commands or using plugins. You stay in control.",
    details: [
      "Bot asks for your approval before executing commands",
      "Plugin actions require your confirmation",
      "You can chat freely — approvals only for actions",
      "Best for: business use, client-facing bots, new users",
    ],
  },
  {
    id: "full-power" as const,
    icon: Zap,
    title: "Full Power",
    badge: "Advanced",
    description: "Your AI teammate runs autonomously — no approvals needed. Full access to all tools and commands.",
    details: [
      "Commands run without approval",
      "Plugins execute without approval",
      "Bot acts immediately on your requests",
      "Best for: personal automation, development, power users",
    ],
  },
];

export function StepHosting({ state, update }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Choose Your Hosting</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Both options include the same AI teammate — the difference is who manages the infrastructure.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((opt) => {
          const selected = state.hostingType === opt.id;
          return (
            <Card
              key={opt.id}
              className={`cursor-pointer transition-all ${
                selected
                  ? "border-primary ring-1 ring-primary"
                  : "border-border/50 hover:border-border"
              }`}
              onClick={() => {
                const patch: Partial<WizardState> = { hostingType: opt.id };
                if (opt.id === "managed") {
                  patch.machineType = "e2-medium";
                  patch.gcpProjectId = "__managed__";
                  patch.gcpZone = "us-central1-a";
                }
                if (opt.id === "self-hosted") {
                  patch.gcpProjectId = state.gcpProjectId === "__managed__" ? "" : state.gcpProjectId;
                }
                update(patch);
              }}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-primary/20" : "bg-muted"}`}>
                    <opt.icon className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{opt.title}</h3>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </div>
                <ul className="space-y-1.5 mt-3">
                  {opt.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className={`h-3 w-3 shrink-0 ${selected ? "text-primary" : "text-muted-foreground/50"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Security Mode */}
      <div>
        <h2 className="text-base font-semibold">Security Mode</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how much autonomy your AI teammate has. You can change this later in Settings.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {securityModes.map((mode) => {
          const selected = state.securityMode === mode.id;
          return (
            <Card
              key={mode.id}
              className={`cursor-pointer transition-all ${
                selected
                  ? mode.id === "secured"
                    ? "border-green-500 ring-1 ring-green-500"
                    : "border-yellow-500 ring-1 ring-yellow-500"
                  : "border-border/50 hover:border-border"
              }`}
              onClick={() => update({ securityMode: mode.id })}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    selected
                      ? mode.id === "secured" ? "bg-green-500/20" : "bg-yellow-500/20"
                      : "bg-muted"
                  }`}>
                    <mode.icon className={`h-5 w-5 ${
                      selected
                        ? mode.id === "secured" ? "text-green-500" : "text-yellow-500"
                        : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{mode.title}</h3>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      mode.id === "secured"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-yellow-500/10 text-yellow-500"
                    }`}>
                      {mode.badge}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{mode.description}</p>
                <ul className="space-y-1.5">
                  {mode.details.map((d) => (
                    <li key={d} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className={`h-3 w-3 shrink-0 ${
                        selected
                          ? mode.id === "secured" ? "text-green-500" : "text-yellow-500"
                          : "text-muted-foreground/50"
                      }`} />
                      {d}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {state.securityMode === "full-power" && (
        <div className="flex gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <Info className="h-5 w-5 shrink-0 text-yellow-500 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-yellow-500">Full Power mode gives your bot unrestricted access</p>
            <p className="text-muted-foreground">
              Your AI teammate will execute commands and use plugins without asking for permission.
              This is great for personal automation but means the bot can take actions on your behalf
              without confirmation. Your admin can see this setting for advisory purposes.
            </p>
          </div>
        </div>
      )}

      {/* Telegram Access */}
      <div>
        <h2 className="text-base font-semibold">Telegram Access</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {state.securityMode === "secured"
            ? "Only you will be able to chat with your bot. Enter your Telegram user ID below."
            : "Anyone can message your bot. Optionally restrict access to your Telegram ID."}
        </p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="telegramUserId">
              Your Telegram User ID {state.securityMode === "secured" && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="telegramUserId"
              placeholder="e.g. 123456789"
              value={state.telegramUserId}
              onChange={(e) => update({ telegramUserId: e.target.value.replace(/[^0-9]/g, "") })}
            />
          </div>
          <div className="flex gap-3 rounded-md bg-muted/50 p-3">
            <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">How to find your Telegram ID:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Open Telegram and search for <span className="font-mono bg-muted px-1 rounded">@userinfobot</span></li>
                <li>Send it any message</li>
                <li>It replies with your numeric ID (e.g. <span className="font-mono bg-muted px-1 rounded">123456789</span>)</li>
              </ol>
              <p className="mt-1">
                {state.securityMode === "secured"
                  ? "Your bot will only respond to messages from this Telegram account."
                  : "Leave blank to allow anyone, or enter your ID to restrict access."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
