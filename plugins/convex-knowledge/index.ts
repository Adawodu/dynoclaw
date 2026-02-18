import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const api = anyApi;

export default function register(pluginApi: any) {
  const convexUrl = pluginApi.pluginConfig?.convexUrl;
  if (!convexUrl) {
    pluginApi.logger?.warn?.("convexUrl not configured");
    return;
  }

  const client = new ConvexHttpClient(convexUrl);

  pluginApi.registerTool({
    id: "knowledge_store",
    name: "Knowledge Store",
    description: "Store a piece of knowledge for later retrieval. Use this when the user says 'remember this' or wants to save information.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The knowledge text to store",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional tags for categorizing the knowledge",
        },
      },
      required: ["text"],
    },
    handler: async (input: { text: string; tags?: string[] }) => {
      const id = await client.action(api.knowledgeActions.ingest, {
        text: input.text,
        tags: input.tags,
        source: "telegram",
      });
      return {
        success: true,
        id,
        message: `Stored: "${input.text.slice(0, 80)}${input.text.length > 80 ? "..." : ""}"`,
      };
    },
  });

  pluginApi.registerTool({
    id: "knowledge_search",
    name: "Knowledge Search",
    description: "Search the knowledge base for relevant information. Use this when the user asks 'what do I know about...' or wants to recall stored knowledge.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 5)",
        },
      },
      required: ["query"],
    },
    handler: async (input: { query: string; limit?: number }) => {
      const results = await client.action(api.knowledgeActions.search, {
        query: input.query,
        limit: input.limit ?? 5,
      });
      return {
        results: results.map((r: any) => ({
          text: r.text,
          tags: r.tags,
          score: r.score,
          createdAt: r.createdAt,
        })),
        count: results.length,
      };
    },
  });
}
