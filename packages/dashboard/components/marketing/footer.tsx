"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const fallbackColumns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features", isExternal: false },
      { label: "Pricing", href: "/#pricing", isExternal: false },
      { label: "Guide", href: "/guide", isExternal: false },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#", isExternal: false },
      { label: "Blog", href: "/#", isExternal: false },
      { label: "Careers", href: "/#", isExternal: false },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/#", isExternal: false },
      { label: "Terms", href: "/#", isExternal: false },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Twitter", href: "/#", isExternal: true },
      { label: "GitHub", href: "/#", isExternal: true },
      { label: "Discord", href: "/#", isExternal: true },
    ],
  },
];

const sectionOrder = ["product", "company", "legal", "connect"];

export function Footer() {
  const navLinks = useQuery(api.navLinks.listVisible);

  // Only use fallback while loading (undefined). Once loaded, use DB data exclusively.
  const isLoading = navLinks === undefined;
  const footerLinks = navLinks?.filter((l) => l.placement.includes("footer")) ?? [];

  const columns = isLoading
    ? fallbackColumns
    : sectionOrder
        .map((section) => {
          const links = footerLinks
            .filter((l) => l.section === section)
            .sort((a, b) => a.sortOrder - b.sortOrder);
          if (links.length === 0) return null;
          return {
            title: section.charAt(0).toUpperCase() + section.slice(1),
            links: links.map((l) => ({
              label: l.label,
              href: l.href,
              isExternal: l.isExternal,
            })),
          };
        })
        .filter(Boolean);

  return (
    <footer className="border-t border-border/50 py-16">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Zap className="h-5 w-5 text-primary" />
            DynoClaw
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            Enterprise AI teammate platform.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col!.title}>
            <h4 className="mb-3 text-sm font-semibold">{col!.title}</h4>
            <ul className="space-y-2">
              {col!.links.map((l) => (
                <li key={l.label}>
                  {l.isExternal ? (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-6xl border-t border-border/50 px-4 pt-6">
        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} DynoClaw. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
