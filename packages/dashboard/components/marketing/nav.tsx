"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/logo";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const fallbackLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/guide", label: "Guide" },
];

export function MarketingNav() {
  const navLinks = useQuery(api.navLinks.listVisible);

  // Only use fallback while loading (undefined). Once loaded, use DB data exclusively.
  const isLoading = navLinks === undefined;
  const navItems = (navLinks ?? []).filter((l) => l.placement.includes("nav"));

  const links = isLoading
    ? fallbackLinks.map((l) => ({ ...l, isExternal: false }))
    : navItems
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((l) => ({ href: l.href, label: l.label, isExternal: l.isExternal }));

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <LogoIcon size={24} />
          <span>DynoClaw</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) =>
            l.isExternal ? (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </SignInButton>
            <Link href="/overview">
              <Button size="sm" className="gradient-brand text-white">
                Get Started
              </Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/overview">
              <Button size="sm" className="gradient-brand text-white">
                Dashboard
              </Button>
            </Link>
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
