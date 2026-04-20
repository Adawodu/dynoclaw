import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, BarChart3, Plug, Calendar, Shield, Sparkles } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Talk to It on Telegram",
    description:
      "Message your AI teammate from your phone or laptop. Ask it to draft an email, check your pipeline, or generate a report. It responds in seconds.",
  },
  {
    icon: Plug,
    title: "Connects to Your Tools",
    description:
      "CRM (Clarify.ai, HubSpot, Zoho), social media (Postiz), newsletters (Beehiiv), GitHub, Gmail — 17+ plugins out of the box.",
  },
  {
    icon: Calendar,
    title: "Runs on Autopilot",
    description:
      "Schedule skills to run automatically — daily briefings, weekly content calendars, engagement reports. Your bot works while you sleep.",
  },
  {
    icon: BarChart3,
    title: "Manages Your Pipeline",
    description:
      "CRM auto-imports contacts from email. Your bot tracks deals, drafts follow-ups, and sends you a morning pipeline digest.",
  },
  {
    icon: Shield,
    title: "Private & Secure",
    description:
      "Your data runs in an isolated cloud VM with no public IP. API keys in encrypted Secret Manager. You choose who can talk to your bot.",
  },
  {
    icon: Sparkles,
    title: "49,000+ Skills on ClawHub",
    description:
      "Need something specific? Your bot can install skills from ClawHub — the largest AI skill marketplace. Just ask it on Telegram.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-24">
      <div className="mb-16 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          One bot that{" "}
          <span className="gradient-brand-text">actually does the work</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Not another chatbot. An AI teammate that manages your CRM, drafts emails,
          posts content, and runs your operations.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title} className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {f.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
