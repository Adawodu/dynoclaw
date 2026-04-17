"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WizardState } from "@/app/(dashboard)/deploy/page";

interface Props {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}

interface ModelChain {
  id: string;
  label: string;
  description: string;
  primary: string;
  fallbacks: string[];
}

const MODEL_CHAINS: ModelChain[] = [
  {
    id: "gemini-pro",
    label: "Gemini 2.5 Pro (recommended)",
    description: "Most capable stable Google model. Best for agentic work and complex reasoning.",
    primary: "google/gemini-2.5-pro",
    fallbacks: ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"],
  },
  {
    id: "gemini-flash",
    label: "Gemini 2.5 Flash",
    description: "Fast and cost-effective. Good for high-volume tasks.",
    primary: "google/gemini-2.5-flash",
    fallbacks: ["google/gemini-2.5-flash-lite"],
  },
  {
    id: "gemini-25",
    label: "Gemini 2.5 Pro (stable)",
    description: "Stable Google Pro tier. Lower cost than 3.1 Pro.",
    primary: "google/gemini-2.5-pro",
    fallbacks: ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"],
  },
  {
    id: "claude-sonnet",
    label: "Claude Sonnet 4.5",
    description: "Anthropic's top model. Excellent for code and writing.",
    primary: "anthropic/claude-sonnet-4-5-20250929",
    fallbacks: ["google/gemini-3.1-pro-preview", "google/gemini-2.5-flash"],
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    description: "OpenAI's flagship multimodal model.",
    primary: "openai/gpt-4o",
    fallbacks: ["google/gemini-2.5-flash", "openai/gpt-4o-mini"],
  },
  {
    id: "custom",
    label: "Custom (advanced)",
    description: "Specify your own model and fallback chain.",
    primary: "",
    fallbacks: [],
  },
];

function detectChainId(primary: string): string {
  const match = MODEL_CHAINS.find((c) => c.primary === primary);
  return match?.id ?? "custom";
}

export function StepBranding({ state, update }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Branding</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="botName">Bot Name</Label>
          <Input
            id="botName"
            value={state.branding.botName}
            onChange={(e) =>
              update({
                branding: { ...state.branding, botName: e.target.value },
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="personality">Personality</Label>
          <Input
            id="personality"
            value={state.branding.personality}
            onChange={(e) =>
              update({
                branding: { ...state.branding, personality: e.target.value },
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signature">Content Signature</Label>
          <Input
            id="signature"
            placeholder="e.g. Jane Doe | CEO at Acme Corp — Like, Comment & Share | Powered by DynoClaw"
            value={state.branding.signature ?? ""}
            onChange={(e) =>
              update({
                branding: { ...state.branding, signature: e.target.value },
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Used as the footer on generated content like comic briefs
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="modelChain">Model Chain</Label>
          <Select
            value={detectChainId(state.models.primary)}
            onValueChange={(id) => {
              const chain = MODEL_CHAINS.find((c) => c.id === id);
              if (!chain) return;
              if (id === "custom") {
                // Keep current values for custom mode
                return;
              }
              update({
                models: {
                  primary: chain.primary,
                  fallbacks: chain.fallbacks,
                },
              });
            }}
          >
            <SelectTrigger id="modelChain">
              <SelectValue placeholder="Select a model chain" />
            </SelectTrigger>
            <SelectContent>
              {MODEL_CHAINS.map((chain) => (
                <SelectItem key={chain.id} value={chain.id}>
                  {chain.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {MODEL_CHAINS.find((c) => c.id === detectChainId(state.models.primary))?.description ??
              "Choose how your AI teammate handles requests."}
          </p>
        </div>

        {detectChainId(state.models.primary) === "custom" && (
          <div className="space-y-2">
            <Label htmlFor="primaryModel">Primary Model ID</Label>
            <Input
              id="primaryModel"
              placeholder="e.g. google/gemini-3.1-pro-preview"
              value={state.models.primary}
              onChange={(e) =>
                update({
                  models: { ...state.models, primary: e.target.value },
                })
              }
            />
            <Label htmlFor="fallbackModels" className="mt-2 block">
              Fallback Models (comma-separated)
            </Label>
            <Input
              id="fallbackModels"
              placeholder="google/gemini-2.5-flash, openai/gpt-4o-mini"
              value={state.models.fallbacks.join(", ")}
              onChange={(e) =>
                update({
                  models: {
                    ...state.models,
                    fallbacks: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                })
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
