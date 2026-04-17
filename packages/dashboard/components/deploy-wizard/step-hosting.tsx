"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Server, Cloud, Check } from "lucide-react";
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

export function StepHosting({ state, update }: Props) {
  return (
    <div className="space-y-4">
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
    </div>
  );
}
