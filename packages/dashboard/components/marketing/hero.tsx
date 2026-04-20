import Link from "next/link";
import { SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";

export function Hero() {
  return (
    <section className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      {/* Glow effect */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl space-y-6">
        {/* One-liner: what you get */}
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Stop doing busywork.
          <br />
          <span className="gradient-brand-text">Your AI teammate handles it.</span>
        </h1>

        {/* The problem + the solution in one breath */}
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
          DynoClaw deploys a private AI agent that manages your CRM, drafts emails,
          posts content, and runs your operations — on autopilot, from your phone via Telegram.
          You approve. It executes.
        </p>

        {/* Dual CTA: direct + transitional */}
        <div className="flex flex-col items-center gap-4 pt-2 sm:flex-row sm:justify-center">
          <SignUpButton mode="modal">
            <Button size="lg" className="gradient-brand text-white text-base px-8">
              Deploy Your Teammate — Free for 14 Days
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </SignUpButton>
          <Link href="#how-it-works">
            <Button variant="outline" size="lg" className="text-base px-8">
              <Play className="mr-2 h-4 w-4" />
              See How It Works
            </Button>
          </Link>
        </div>

        {/* Stakes: what you avoid */}
        <p className="text-sm text-muted-foreground pt-2">
          No credit card required. Your data stays in a private cloud — never trains public AI models.
        </p>
      </div>
    </section>
  );
}
