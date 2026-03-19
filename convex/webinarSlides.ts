import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByWebinar = query({
  args: { webinarId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webinarSlides")
      .withIndex("by_webinarId", (q) => q.eq("webinarId", args.webinarId))
      .collect()
      .then((slides) => slides.sort((a, b) => a.order - b.order));
  },
});

export const get = query({
  args: { id: v.id("webinarSlides") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    webinarId: v.string(),
    order: v.number(),
    type: v.union(
      v.literal("cover"),
      v.literal("content"),
      v.literal("section"),
      v.literal("interactive"),
      v.literal("demo"),
      v.literal("cta"),
    ),
    title: v.string(),
    subtitle: v.optional(v.string()),
    bullets: v.optional(v.array(v.string())),
    speakerNotes: v.optional(v.string()),
    highlightBox: v.optional(v.string()),
    demoSteps: v.optional(v.array(v.string())),
    demoSpeakerNote: v.optional(v.string()),
    options: v.optional(v.array(v.string())),
    instruction: v.optional(v.string()),
    tableRows: v.optional(v.array(v.object({
      cells: v.array(v.string()),
    }))),
    tableHeaders: v.optional(v.array(v.string())),
    twoColumns: v.optional(v.object({
      left: v.object({ heading: v.string(), items: v.array(v.string()) }),
      right: v.object({ heading: v.string(), items: v.array(v.string()) }),
    })),
    presenterInfo: v.optional(v.object({
      name: v.string(),
      title: v.string(),
      subtitle: v.optional(v.string()),
      event: v.optional(v.string()),
    })),
    ctaButton: v.optional(v.object({
      label: v.string(),
      url: v.string(),
    })),
    showInPublic: v.boolean(),
    showDynoclawCta: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("webinarSlides", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("webinarSlides"),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("cover"),
      v.literal("content"),
      v.literal("section"),
      v.literal("interactive"),
      v.literal("demo"),
      v.literal("cta"),
    )),
    order: v.optional(v.number()),
    bullets: v.optional(v.array(v.string())),
    speakerNotes: v.optional(v.string()),
    highlightBox: v.optional(v.string()),
    demoSteps: v.optional(v.array(v.string())),
    demoSpeakerNote: v.optional(v.string()),
    options: v.optional(v.array(v.string())),
    instruction: v.optional(v.string()),
    tableRows: v.optional(v.array(v.object({
      cells: v.array(v.string()),
    }))),
    tableHeaders: v.optional(v.array(v.string())),
    twoColumns: v.optional(v.object({
      left: v.object({ heading: v.string(), items: v.array(v.string()) }),
      right: v.object({ heading: v.string(), items: v.array(v.string()) }),
    })),
    presenterInfo: v.optional(v.object({
      name: v.string(),
      title: v.string(),
      subtitle: v.optional(v.string()),
      event: v.optional(v.string()),
    })),
    ctaButton: v.optional(v.object({
      label: v.string(),
      url: v.string(),
    })),
    showInPublic: v.optional(v.boolean()),
    showDynoclawCta: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("webinarSlides") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const reorder = mutation({
  args: {
    updates: v.array(v.object({
      id: v.id("webinarSlides"),
      order: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    for (const { id, order } of args.updates) {
      await ctx.db.patch(id, { order, updatedAt: Date.now() });
    }
  },
});
