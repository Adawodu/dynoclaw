"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { generateEmbedding } from "./lib/embeddings";
import { Id } from "./_generated/dataModel";

export const search = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const embedding = await generateEmbedding(args.query);
    const results = await ctx.vectorSearch("knowledge", "by_embedding", {
      vector: embedding,
      limit: args.limit ?? 5,
    });

    const entries: Array<Record<string, unknown>> = await Promise.all(
      results.map(async (result) => {
        const doc: Record<string, unknown> | null = await ctx.runQuery(api.knowledge.getById, {
          id: result._id,
        });
        return {
          ...doc,
          score: result._score,
        };
      })
    );

    return entries;
  },
});

export const ingest = action({
  args: {
    text: v.string(),
    tags: v.optional(v.array(v.string())),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"knowledge">> => {
    const embedding = await generateEmbedding(args.text);
    const id: Id<"knowledge"> = await ctx.runMutation(api.knowledge.store, {
      text: args.text,
      tags: args.tags ?? [],
      source: args.source ?? "telegram",
      embedding,
    });
    return id;
  },
});

/**
 * Backfill embeddings for existing knowledge entries using the current embedding model.
 * Run this once after switching embedding providers to rebuild the vector index.
 * Pass batchSize to control how many to process per invocation (default 20).
 */
export const reembedBatch = action({
  args: {
    offset: v.optional(v.number()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ processed: number; nextOffset: number }> => {
    const batchSize = args.batchSize ?? 20;
    const offset = args.offset ?? 0;

    const entries: Array<{ _id: Id<"knowledge">; text: string }> = await ctx.runQuery(
      api.knowledge.listForReembed,
      { limit: batchSize, offset }
    );

    let processed = 0;
    for (const entry of entries) {
      try {
        const embedding = await generateEmbedding(entry.text);
        await ctx.runMutation(api.knowledge.updateEmbedding, {
          id: entry._id,
          embedding,
        });
        processed++;
      } catch (err) {
        console.error(`Failed to re-embed ${entry._id}:`, err);
      }
    }

    return { processed, nextOffset: offset + batchSize };
  },
});
