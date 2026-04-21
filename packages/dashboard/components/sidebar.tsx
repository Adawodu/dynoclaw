"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Rocket,
  DollarSign,
  Image,
  Brain,
  Shield,
  Mail,
  ScrollText,
  Settings,
  CreditCard,
  ShieldCheck,
  FileText,
  Users,
  Presentation,
  Menu,
  Terminal,
  Bot,
} from "lucide-react";
import { LogoIcon } from "@/components/logo";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// ── Customer nav (simple, focused) ───────────────────────────────

const customerNavBeforeDeploy: NavItem[] = [
  { href: "/deploy", label: "Deploy", icon: Rocket },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

const customerNavAfterDeploy: NavItem[] = [
  { href: "/overview", label: "Dashboard", icon: LayoutDashboard },
  { href: "/openclaw", label: "AI Teammate", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

// ── Admin nav (full visibility) ──────────────────────────────────

const adminMainNav: NavItem[] = [
  { href: "/overview", label: "Dashboard", icon: LayoutDashboard },
  { href: "/openclaw", label: "AI Teammate", icon: Bot },
  { href: "/deploy", label: "Deploy", icon: Rocket },
];

const adminToolsNav: NavItem[] = [
  { href: "/costs", label: "Costs", icon: DollarSign },
  { href: "/knowledge", label: "Knowledge", icon: Brain },
  { href: "/media", label: "Media", icon: Image },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/privacy", label: "Privacy", icon: Shield },
  { href: "/email", label: "Email", icon: Mail },
];

const adminPlatformNav: NavItem[] = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/pricing", label: "Pricing", icon: ShieldCheck },
  { href: "/admin/marketing", label: "Marketing", icon: Image },
  { href: "/admin/cms", label: "CMS", icon: FileText },
  { href: "/webinar-admin", label: "Webinar", icon: Presentation },
];

const adminBottomNav: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

// ── Navigation renderer ─────────────────────────────────────────

function NavSection({
  items,
  label,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  label?: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <>
      {label && (
        <>
          <div className="my-2 border-t" />
          <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
        </>
      )}
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isAdminUser = useQuery(api.admin.isAdmin, {});
  const deployments = useQuery(api.deployments.list);
  const hasDeployment = deployments && deployments.length > 0;
  const isLoading = isAdminUser === undefined || deployments === undefined;

  return (
    <>
      <div className="flex h-14 items-center border-b px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold"
          onClick={onNavigate}
        >
          <LogoIcon size={20} />
          <span>DynoClaw</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded-md bg-muted"
              />
            ))}
          </div>
        ) : isAdminUser ? (
          // ── Admin view ──────────────────────────────────────
          <>
            <NavSection
              items={adminMainNav}
              pathname={pathname}
              onNavigate={onNavigate}
            />
            <NavSection
              items={adminToolsNav}
              label="Tools & Data"
              pathname={pathname}
              onNavigate={onNavigate}
            />
            <NavSection
              items={adminPlatformNav}
              label="Platform"
              pathname={pathname}
              onNavigate={onNavigate}
            />
            <NavSection
              items={adminBottomNav}
              label=""
              pathname={pathname}
              onNavigate={onNavigate}
            />
          </>
        ) : (
          // ── Customer view ───────────────────────────────────
          <NavSection
            items={hasDeployment ? customerNavAfterDeploy : customerNavBeforeDeploy}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        )}
      </nav>

      <div className="border-t p-4">
        <UserButton
          userProfileProps={{
            additionalOAuthScopes: {
              google: ["https://www.googleapis.com/auth/cloud-platform"],
            },
          }}
        />
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-64 flex-col border-r bg-card md:flex">
      <NavContent />
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-14 items-center border-b px-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="mr-2 p-0">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent>
          <div className="flex h-full flex-col">
            <NavContent onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <LogoIcon size={20} />
        <span>DynoClaw</span>
      </Link>
    </div>
  );
}
