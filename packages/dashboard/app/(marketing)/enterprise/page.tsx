import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Zap, BarChart3, Lock, Server, Users, ArrowRight, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "DynoClaw Enterprise — Managed AI Orchestration (MAIO)",
  description:
    "Secure, private AI infrastructure deployed in your environment. We audit your operations, automate your friction, and guarantee the outcome.",
};

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-bold text-white sm:text-4xl">{value}</p>
      <p className="mt-1 text-sm text-blue-200">{label}</p>
    </div>
  );
}

function Pillar({ icon: Icon, title, description }: { icon: typeof Shield; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 mb-4">
        <Icon className="h-5 w-5 text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

export default function EnterprisePage() {
  return (
    <div className="bg-slate-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400 mb-4">
            Managed AI Orchestration
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            We Engineer Operational Leverage
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-300 max-w-2xl mx-auto">
            We audit your operations, automate your friction using secure, proprietary AI
            infrastructure, and guarantee the outcome. Your data never leaves your environment.
            Stop scaling by hiring — scale by orchestrating.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://calendly.com/bayo-parallelscore/maio-diagnostic"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 transition-colors"
            >
              Schedule a Diagnostic Audit
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/#pricing"
              className="text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Looking for self-serve? View plans &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-800 bg-slate-900/50 px-6 py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 sm:grid-cols-4">
          <StatCard value="0" label="Public IP addresses" />
          <StatCard value="100%" label="Data stays in your VPC" />
          <StatCard value="<4hr" label="Deployment time" />
          <StatCard value="49K+" label="Pre-built automations" />
        </div>
      </section>

      {/* The Problem */}
      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold sm:text-3xl">The Problem We Solve</h2>
          <div className="mt-8 space-y-6 text-slate-300 leading-relaxed">
            <p>
              Your team is drowning in disconnected SaaS tools and expensive, underutilized
              &ldquo;enterprise AI&rdquo; subscriptions. They bought the hype — ChatGPT Enterprise,
              Microsoft Copilot, Jasper — but adoption has flatlined because these tools are
              generic blank slates that don&apos;t understand your workflows.
            </p>
            <p>
              Meanwhile, your highly-paid staff spends 40% of their workweek on manual operational
              drag — copy-pasting between systems, updating spreadsheets, reconciling data — instead
              of strategic thinking. And frustrated employees are secretly pasting proprietary data
              into public LLMs. Shadow AI is an infrastructure crisis, not a policy problem.
            </p>
            <p className="text-white font-medium">
              We don&apos;t sell you another tool. We permanently eliminate operational friction
              by orchestrating the tools you already have — securely, privately, with human
              accountability at every step.
            </p>
          </div>
        </div>
      </section>

      {/* Security Pillars */}
      <section className="px-6 py-20 lg:px-8 bg-slate-900/30">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold sm:text-3xl">Enterprise-Grade by Default</h2>
            <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
              Every deployment runs in an isolated environment with zero shared infrastructure.
              Built for the CISO, approved by Legal, loved by Operations.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Pillar
              icon={Lock}
              title="Isolated Infrastructure"
              description="Each client gets a dedicated GCP VM with no public IP. Data stays within your VPC boundaries. API keys in Secret Manager with per-instance IAM conditions."
            />
            <Pillar
              icon={Shield}
              title="Human in the Loop"
              description="Every automation includes human checkpoints. The AI proposes; your team approves. When the agent encounters an edge case, it pauses and routes to our engineering team."
            />
            <Pillar
              icon={Server}
              title="No Data Leakage"
              description="Your data never trains a public model. We connect to your existing tools via private APIs. All traffic routes through Cloud NAT — no inbound internet access."
            />
            <Pillar
              icon={BarChart3}
              title="Measurable ROI"
              description="Every engagement starts with a hard business case. We quantify hours saved, error costs eliminated, and payback period before building anything."
            />
            <Pillar
              icon={Users}
              title="Ongoing Accountability"
              description="We don't deploy and disappear. Our engineers monitor, tune, and fix your automations when models drift, APIs deprecate, or edge cases surface."
            />
            <Pillar
              icon={Zap}
              title="Skill Library Economics"
              description="We've built 49,000+ reusable automation modules. Your custom build leverages existing, battle-tested components — reducing cost and increasing reliability."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold sm:text-3xl mb-12 text-center">How We Engage</h2>
          <div className="space-y-12">
            <Step
              number="1"
              title="The Diagnostic Audit"
              price="$5,000 - $15,000 | 2 weeks"
              items={[
                "We embed with your ops team and shadow their workflows",
                "We identify the 3-5 processes bleeding the most hours and dollars",
                "We deliver a priority-ranked automation blueprint with hard ROI projections",
                "You get a clear business case — not a sales pitch",
              ]}
            />
            <Step
              number="2"
              title="The Orchestration Build"
              price="$25,000 - $100,000 | 4-8 weeks"
              items={[
                "We deploy secure DynoClaw infrastructure in your environment",
                "We connect your CRM, email, ERP, and internal tools",
                "We build and test the automated workflows from the audit",
                "We train your team and handle change management",
              ]}
            />
            <Step
              number="3"
              title="The MAIO Retainer"
              price="$10,000 - $30,000/month"
              items={[
                "Infrastructure licensing, hosting, and compute",
                "Active maintenance — we fix it before you notice it broke",
                "Continuous optimization — lower latency, higher accuracy, new workflows",
                "Quarterly Business Reviews with ROI reporting",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Verticals */}
      <section className="px-6 py-20 lg:px-8 bg-slate-900/30">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold sm:text-3xl mb-4 text-center">Built for Regulated Industries</h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Where security is paramount, compliance is strict, and manual paperwork is the bottleneck.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Financial Services", example: "Invoice reconciliation, PO matching, variance flagging" },
              { name: "Healthcare", example: "Patient intake routing, referral fax analysis, schedule optimization" },
              { name: "Legal & Compliance", example: "Contract variance analysis, redline review, clause risk scoring" },
              { name: "Logistics & Supply Chain", example: "BOL processing, customs docs, carrier payout calculation" },
              { name: "B2B SaaS / RevOps", example: "Meeting transcript → CRM update → follow-up email → Jira ticket" },
              { name: "Commercial Real Estate", example: "Lease abstraction, deadline tracking, property management" },
            ].map((v) => (
              <div key={v.name} className="rounded-lg border border-slate-700 bg-slate-800/30 p-5">
                <p className="font-semibold text-white text-sm">{v.name}</p>
                <p className="mt-1 text-xs text-slate-400">{v.example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Stop scaling by hiring.<br />Scale by orchestrating.
          </h2>
          <p className="mt-6 text-lg text-slate-300">
            A 2-week diagnostic audit will show you exactly where your operations are bleeding
            money — and the automated workflows that will stop it.
          </p>
          <div className="mt-10">
            <a
              href="https://calendly.com/bayo-parallelscore/maio-diagnostic"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-blue-500 transition-colors"
            >
              Schedule Your Diagnostic Audit
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            ParallelScore + DynoClaw | bayo@parallelscore.com
          </p>
        </div>
      </section>
    </div>
  );
}

function Step({ number, title, price, items }: { number: string; title: string; price: string; items: string[] }) {
  return (
    <div className="flex gap-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
        {number}
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-blue-400 mt-0.5">{price}</p>
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
