"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Monitor } from "lucide-react";

interface Props {
  slot: string;
  fallbackAlt: string;
  className?: string;
}

export function ProductScreenshot({ slot, fallbackAlt, className = "" }: Props) {
  const image = useQuery(api.marketingImages.getBySlot, { slot });

  if (image?.url) {
    return (
      <div className={`relative overflow-hidden rounded-xl border border-border/50 shadow-2xl shadow-primary/10 ${className}`}>
        <img
          src={image.url}
          alt={image.alt || fallbackAlt}
          className="w-full"
          loading="lazy"
        />
      </div>
    );
  }

  // Placeholder: stylized mockup
  return (
    <div className={`relative overflow-hidden rounded-xl border border-border/50 bg-card/80 shadow-2xl shadow-primary/10 ${className}`}>
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/50 px-4 py-2">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400/60" />
          <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
          <div className="h-3 w-3 rounded-full bg-green-400/60" />
        </div>
        <div className="flex-1 mx-8">
          <div className="h-5 rounded-md bg-muted w-48 mx-auto" />
        </div>
      </div>
      <div className="p-6 space-y-4">
        {/* Sidebar + content mockup */}
        <div className="flex gap-4">
          <div className="w-40 shrink-0 space-y-2">
            <div className="h-8 rounded bg-primary/20 w-full" />
            <div className="h-6 rounded bg-muted w-full" />
            <div className="h-6 rounded bg-muted w-full" />
            <div className="h-6 rounded bg-muted w-3/4" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="h-8 rounded bg-muted w-1/3" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-20 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">247</span>
              </div>
              <div className="h-20 rounded-lg bg-green-500/10 flex items-center justify-center">
                <span className="text-lg font-bold text-green-500">~18h</span>
              </div>
              <div className="h-20 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <span className="text-lg font-bold text-blue-500">$810</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 rounded-lg border border-border/50 p-3 space-y-2">
                <div className="h-4 rounded bg-muted w-1/2" />
                <div className="h-3 rounded bg-muted/60 w-full" />
                <div className="h-3 rounded bg-muted/60 w-3/4" />
              </div>
              <div className="h-24 rounded-lg border border-border/50 p-3 space-y-2">
                <div className="h-4 rounded bg-muted w-1/2" />
                <div className="h-3 rounded bg-muted/60 w-full" />
                <div className="h-3 rounded bg-muted/60 w-3/4" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/20">
        <div className="text-center">
          <Monitor className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-xs text-muted-foreground/60">Product preview</p>
        </div>
      </div>
    </div>
  );
}
