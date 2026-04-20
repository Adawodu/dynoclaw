import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Pricing } from "@/components/marketing/pricing";
import { SocialProof } from "@/components/marketing/social-proof";

export const metadata: Metadata = {
  title: "DynoClaw — AI Teammate for CRM, Email, and Operations",
  description:
    "Deploy a private AI agent in 5 minutes. Manages your CRM, drafts emails, posts content, and runs operations on autopilot via Telegram. 14-day free trial.",
  openGraph: {
    title: "DynoClaw — AI Teammate for CRM, Email, and Operations",
    description:
      "Deploy a private AI agent in 5 minutes. Manages your CRM, drafts emails, posts content, and runs operations on autopilot via Telegram.",
    type: "website",
    url: "https://www.dynoclaw.com",
  },
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <Pricing />
      <EnterpriseCTA />
    </>
  );
}

function EnterpriseCTA() {
  return (
    <section className="mx-auto max-w-4xl px-4 pb-24">
      <div className="rounded-xl border border-border/50 bg-card/50 p-8 text-center backdrop-blur sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
          Enterprise &amp; Agencies
        </p>
        <h2 className="text-2xl font-bold sm:text-3xl">
          Need more than self-serve?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          We audit your operations, deploy secure AI infrastructure in your environment,
          and manage it as a retainer. Your CISO will love it.
        </p>
        <div className="mt-6">
          <a href="/enterprise">
            <button className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-8 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
              Learn About Managed AI Orchestration
            </button>
          </a>
        </div>
      </div>
    </section>
  );
}
