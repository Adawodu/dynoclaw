import { Shield, Clock, Bot, Blocks } from "lucide-react";

const stats = [
  { icon: Clock, value: "5 min", label: "to deploy" },
  { icon: Bot, value: "24/7", label: "always on" },
  { icon: Blocks, value: "17+", label: "plugins" },
  { icon: Shield, value: "Private", label: "cloud — your data" },
];

export function SocialProof() {
  return (
    <section className="border-y border-border/50 py-12">
      <div className="mx-auto max-w-4xl px-4">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-2 text-center">
              <s.icon className="h-5 w-5 text-primary" />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
