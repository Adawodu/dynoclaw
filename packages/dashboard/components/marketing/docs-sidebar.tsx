"use client";

const sections = [
  { id: "getting-started", label: "Getting Started" },
  { id: "gcp-setup", label: "GCP Setup" },
  { id: "plugins", label: "Plugins" },
  { id: "skills", label: "Skills" },
  { id: "api-keys", label: "API Keys" },
  { id: "billing", label: "Billing" },
  { id: "faq", label: "FAQ" },
];

export function DocsSidebar() {
  return (
    <nav className="sticky top-20 space-y-1">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        On this page
      </p>
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}
