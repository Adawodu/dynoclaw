"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import ReactMarkdown from "react-markdown";
import { Skeleton } from "@/components/ui/skeleton";

export default function CmsPage() {
  const params = useParams<{ slug: string }>();
  const page = useQuery(api.cmsPages.getBySlug, { slug: params.slug });

  if (page === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Skeleton className="mb-4 h-10 w-2/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (page === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-4 text-muted-foreground">
          This page doesn&apos;t exist yet.
        </p>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-8 text-4xl font-bold">{page.title}</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown>{page.body}</ReactMarkdown>
      </div>
    </article>
  );
}
