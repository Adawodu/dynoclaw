"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { WizardShell } from "@/components/deploy-wizard/wizard-shell";
import { StepHosting } from "@/components/deploy-wizard/step-hosting";
import { StepGcpProject } from "@/components/deploy-wizard/step-gcp-project";
import { StepBranding } from "@/components/deploy-wizard/step-branding";
import { StepTools } from "@/components/deploy-wizard/step-tools";
import { StepApiKeys } from "@/components/deploy-wizard/step-api-keys";
import { StepConfirm } from "@/components/deploy-wizard/step-confirm";
import type { BrandingConfig, ModelsConfig } from "@dynoclaw/shared";

export interface WizardState {
  hostingType: "managed" | "self-hosted";
  gcpProjectId: string;
  gcpZone: string;
  vmName: string;
  machineType: string;
  branding: BrandingConfig;
  models: ModelsConfig;
  plugins: Record<string, boolean>;
  skills: Record<string, boolean>;
  apiKeys: Record<string, string>;
}

const STORAGE_KEY = "claw-deploy-wizard";

const defaultState: WizardState = {
  hostingType: "managed",
  gcpProjectId: "__managed__",
  gcpZone: "us-central1-a",
  vmName: "openclaw-vm",
  machineType: "e2-medium",
  branding: { botName: "Claw", personality: "A helpful AI teammate" },
  models: {
    primary: "google/gemini-2.5-pro",
    fallbacks: ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"],
  },
  plugins: {},
  skills: {},
  apiKeys: {},
};

function loadSavedState(): { state: WizardState; step: number } {
  if (typeof window === "undefined") return { state: defaultState, step: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return {
        state: { ...defaultState, ...saved.state, apiKeys: {} },
        step: saved.step ?? 0,
      };
    }
  } catch {
    // Corrupted data — start fresh
  }
  return { state: defaultState, step: 0 };
}

export default function DeployPage() {
  const [initialized, setInitialized] = useState(false);
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(defaultState);

  useEffect(() => {
    const saved = loadSavedState();
    setState(saved.state);
    setStep(saved.step);
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { ...state, apiKeys: {} }, step }));
    } catch {}
  }, [state, step, initialized]);

  const update = useCallback(
    (patch: Partial<WizardState>) =>
      setState((prev) => ({ ...prev, ...patch })),
    []
  );

  const handleStepChange = useCallback((newStep: number) => {
    setStep(newStep);
  }, []);

  // Dynamic steps based on hosting choice
  // Managed: 4 steps (Setup → Tools → API Keys → Confirm)
  // Self-hosted: 5 steps (adds GCP Project after Hosting)
  const steps = useMemo(() => {
    const base = [{ id: "setup", label: "Setup" }];
    if (state.hostingType === "self-hosted") {
      base.push({ id: "gcp", label: "GCP Project" });
    }
    base.push(
      { id: "tools", label: "Tools" },
      { id: "api-keys", label: "API Keys" },
      { id: "confirm", label: "Confirm" },
    );
    return base;
  }, [state.hostingType]);

  const stepComponents = useMemo(() => {
    // Step 1: Setup combines hosting choice + branding + model selection
    const components: React.ReactNode[] = [
      <div key="setup" className="space-y-6">
        <StepHosting state={state} update={update} />
        <StepBranding state={state} update={update} />
      </div>,
    ];
    if (state.hostingType === "self-hosted") {
      components.push(<StepGcpProject key="gcp" state={state} update={update} />);
    }
    // Step 2: Tools combines plugins + skills with recommendations
    components.push(
      <StepTools key="tools" state={state} update={update} />,
      <StepApiKeys key="api-keys" state={state} update={update} />,
      <StepConfirm key="confirm" state={state} />,
    );
    return components;
  }, [state, update]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Deploy Your Teammate</h1>

      <WizardShell
        steps={steps}
        currentStep={step}
        onStepChange={handleStepChange}
        state={state}
      >
        {stepComponents[step]}
      </WizardShell>
    </div>
  );
}
