import { Cloud, MessageCircle, Database } from "lucide-react";

const logos = [
  { icon: Cloud, label: "Google Cloud" },
  { icon: MessageCircle, label: "Telegram" },
  { icon: Database, label: "Convex" },
];

export function SocialProof() {
  return (
    <section className="border-y border-border/50 py-16">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <p className="mb-8 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Built on industry-leading infrastructure
        </p>
        <div className="flex items-center justify-center gap-12">
          {logos.map((l) => (
            <div
              key={l.label}
              className="flex flex-col items-center gap-2 text-muted-foreground"
            >
              <l.icon className="h-8 w-8" />
              <span className="text-xs">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
