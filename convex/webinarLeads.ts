import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const submit = mutation({
  args: {
    webinarId: v.string(),
    name: v.string(),
    email: v.string(),
    businessType: v.optional(v.string()),
    biggestChallenge: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("webinarLeads", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const listByWebinar = query({
  args: { webinarId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webinarLeads")
      .withIndex("by_webinarId", (q) => q.eq("webinarId", args.webinarId))
      .collect()
      .then((leads) => leads.sort((a, b) => b.createdAt - a.createdAt));
  },
});
