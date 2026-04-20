import Link from "next/link";
import { SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    num: "1",
    title: "Pick what your bot does",
    description:
      "Choose your plugins (CRM, social media, email) and skills (daily briefings, pipeline management). We recommend the best ones for your use case.",
    time: "2 minutes",
  },
  {
    num: "2",
    title: "Add your API keys",
    description:
      "Paste your Telegram bot token, Google AI key, and CRM credentials. We encrypt everything in Google Secret Manager — nothing stored in code.",
    time: "3 minutes",
  },
  {
    num: "3",
    title: "Your bot goes live",
    description:
      "One click deploys your AI teammate to a private cloud VM. Message it on Telegram immediately. It starts running your scheduled skills automatically.",
    time: "Under 5 minutes total",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-4xl px-4 py-24">
      <div className="mb-16 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Live in{" "}
          <span className="gradient-brand-text">under 5 minutes</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          No DevOps. No infrastructure setup. No code. Just pick, paste, and deploy.
        </p>
      </div>

      <div className="space-y-10">
        {steps.map((s) => (
          <div key={s.num} className="flex gap-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-lg font-bold text-primary">
              {s.num}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                  {s.time}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">{s.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Success state: what life looks like after */}
      <div className="mt-16 rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">After you deploy</h3>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Your AI teammate messages you on Telegram every morning with a pipeline digest.
          It drafts follow-up emails after your calls. It posts to your social channels on schedule.
          You review and approve — it handles the rest.
        </p>
        <div className="mt-6">
          <SignUpButton mode="modal">
            <Button size="lg" className="gradient-brand text-white px-8">
              Deploy Now — Free for 14 Days
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </SignUpButton>
        </div>
      </div>
    </section>
  );
}
