import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("marketingImages").collect();
  },
});

export const getBySlot = query({
  args: { slot: v.string() },
  handler: async (ctx, { slot }) => {
    return await ctx.db
      .query("marketingImages")
      .withIndex("by_slot", (q) => q.eq("slot", slot))
      .first();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db.query("marketingImages").collect();
    const map: Record<string, { url: string; alt: string }> = {};
    for (const img of images) {
      map[img.slot] = { url: img.url, alt: img.alt };
    }
    return map;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const upsert = mutation({
  args: {
    slot: v.string(),
    storageId: v.id("_storage"),
    alt: v.string(),
  },
  handler: async (ctx, { slot, storageId, alt }) => {
    await requireAdmin(ctx);

    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("Storage file not found");

    const existing = await ctx.db
      .query("marketingImages")
      .withIndex("by_slot", (q) => q.eq("slot", slot))
      .first();

    if (existing) {
      // Delete old file from storage
      try { await ctx.storage.delete(existing.storageId); } catch {}
      await ctx.db.patch(existing._id, {
        storageId,
        url,
        alt,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("marketingImages", {
      slot,
      storageId,
      url,
      alt,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { slot: v.string() },
  handler: async (ctx, { slot }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("marketingImages")
      .withIndex("by_slot", (q) => q.eq("slot", slot))
      .first();
    if (existing) {
      try { await ctx.storage.delete(existing.storageId); } catch {}
      await ctx.db.delete(existing._id);
    }
  },
});
