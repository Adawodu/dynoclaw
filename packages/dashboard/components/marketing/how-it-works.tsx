const steps = [
  {
    num: "01",
    title: "Connect Your GCP Project",
    description:
      "Sign in with Google, grant cloud-platform scope, and DynoClaw gets access to deploy into your project.",
  },
  {
    num: "02",
    title: "Configure Your Teammate",
    description:
      "Pick a personality, choose plugins (Postiz, Beehiiv, etc.), set skill schedules, and add your API keys.",
  },
  {
    num: "03",
    title: "Deploy & Go",
    description:
      "One click to provision a VM, install the agent, and start your 24/7 AI teammate. Monitor from the dashboard.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-4xl px-4 py-24">
      <div className="mb-16 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Up and running in{" "}
          <span className="gradient-brand-text">three steps</span>
        </h2>
      </div>

      <div className="space-y-12">
        {steps.map((s) => (
          <div key={s.num} className="flex gap-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-lg font-bold text-primary">
              {s.num}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-muted-foreground">{s.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
