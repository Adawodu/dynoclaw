import { Card, CardContent } from "@/components/ui/card";
import { Cloud, Server, Puzzle, Zap, Shield, Mail } from "lucide-react";

const features = [
  {
    icon: Server,
    title: "Managed Hosting",
    description:
      "We handle the infrastructure. Your AI teammate runs on an isolated VM — deployed, monitored, and maintained by DynoClaw.",
  },
  {
    icon: Cloud,
    title: "Self-Hosted Option",
    description:
      "Deploy to your own GCP project for full data ownership. Respects org policies including Domain Restricted Sharing.",
  },
  {
    icon: Puzzle,
    title: "Plugin Ecosystem",
    description:
      "17+ plugins — Postiz, Beehiiv, Gmail, GitHub, HubSpot, Zoho, image/video generation, and more. Extend with custom plugins.",
  },
  {
    icon: Zap,
    title: "Skill Scheduling",
    description:
      "Cron-powered skills that run automatically — content generation, research, reporting, privacy enforcement on your schedule.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Isolated VM per customer. API keys in GCP Secret Manager (AES-256). Dedicated service accounts with minimal permissions. Clerk auth.",
  },
  {
    icon: Mail,
    title: "Email & Communication",
    description:
      "Gmail drafts via DynoSist, dedicated agent inbox via AgentMail, privacy enforcement via DynoClux. All channels in one bot.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-24">
      <div className="mb-16 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Everything you need for an{" "}
          <span className="gradient-brand-text">AI-powered workflow</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Managed or self-hosted. DynoClaw combines deployment, orchestration,
          and enterprise controls into a single platform.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {features.map((f) => (
          <Card key={f.title} className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="flex gap-4 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {f.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
