import { XCircle, CheckCircle2 } from "lucide-react";

const comparisons = [
  {
    before: "3 hours/day drafting follow-up emails",
    after: "AI drafts them. You review in 15 minutes.",
  },
  {
    before: "CRM is a spreadsheet you forgot to update",
    after: "Contacts auto-import from email. Pipeline digest every morning.",
  },
  {
    before: "Posting on LinkedIn 'when I get around to it'",
    after: "Content scheduled automatically, every week.",
  },
  {
    before: "Friday afternoon: updating reports for Monday",
    after: "Friday afternoon: reviewing what your AI already did.",
  },
];

export function BeforeAfter() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-24">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Your week,{" "}
          <span className="gradient-brand-text">before and after</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Replaces ~$4,500/mo in manual operations work.
        </p>
      </div>

      <div className="space-y-4">
        {comparisons.map((c) => (
          <div
            key={c.before}
            className="grid gap-3 sm:grid-cols-2 rounded-lg border border-border/50 overflow-hidden"
          >
            <div className="flex items-center gap-3 bg-red-500/5 p-4">
              <XCircle className="h-5 w-5 shrink-0 text-red-400" />
              <p className="text-sm text-muted-foreground">{c.before}</p>
            </div>
            <div className="flex items-center gap-3 bg-green-500/5 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
              <p className="text-sm font-medium">{c.after}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
