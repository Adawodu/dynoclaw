import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  knowledge: defineTable({
    text: v.string(),
    tags: v.array(v.string()),
    source: v.string(),
    createdAt: v.number(),
    embedding: v.array(v.float64()),
  }).vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["tags"],
  }),
});
