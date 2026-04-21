"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const DEFAULT_TESTIMONIALS = [
  {
    quote: "I went from spending 3 hours a day on follow-up emails to 15 minutes reviewing what my AI teammate already drafted. It paid for itself in the first week.",
    name: "Operations Leader",
    role: "Small Business Owner",
    avatarSlot: "testimonial-avatar-1",
  },
  {
    quote: "The CRM auto-imports contacts from my email. I didn't have to enter a single record manually. My pipeline went from a messy spreadsheet to a morning digest on my phone.",
    name: "Sales Professional",
    role: "Agency Founder",
    avatarSlot: "testimonial-avatar-2",
  },
];

export function Testimonials() {
  const images = useQuery(api.marketingImages.getAll, {});

  return (
    <section className="mx-auto max-w-5xl px-4 py-24">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          What <span className="gradient-brand-text">operators</span> are saying
        </h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {DEFAULT_TESTIMONIALS.map((t) => {
          const avatar = images?.[t.avatarSlot];
          return (
            <Card key={t.name} className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-3">
                  {avatar?.url ? (
                    <img
                      src={avatar.url}
                      alt={t.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {t.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
