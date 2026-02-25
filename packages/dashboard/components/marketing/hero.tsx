import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { LogoIcon } from "@/components/logo";

const stats = [
  { value: "99.9%", label: "Uptime SLA" },
  { value: "<5min", label: "Deploy Time" },
  { value: "24/7", label: "AI Teammate" },
];

export function Hero() {
  return (
    <section className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      {/* Glow effect */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur">
          <LogoIcon size={14} />
          Enterprise AI Teammate Platform
        </div>

        <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          Your AI teammate,
          <br />
          <span className="gradient-brand-text">deployed in minutes</span>
        </h1>

        <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
          DynoClaw deploys an always-on AI agent to your GCP project — equipped
          with plugins, scheduled skills, and full enterprise controls.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/overview">
            <Button size="lg" className="gradient-brand text-white text-base px-8">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="#how-it-works">
            <Button variant="outline" size="lg" className="text-base px-8">
              See How It Works
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-8 pt-4 sm:gap-12">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
