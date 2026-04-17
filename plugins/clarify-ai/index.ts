import { Type } from "@sinclair/typebox";

const API_BASE = "https://api.clarify.ai/v1/workspaces";

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

async function clarifyApi(
  apiKey: string,
  workspaceSlug: string,
  path: string,
  options: RequestInit = {},
): Promise<any> {
  const url = `${API_BASE}/${workspaceSlug}/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `api-key ${apiKey}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Clarify API error ${res.status}: ${text}`);
  }
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

// ── Plugin ──────────────────────────────────────────────────────────

const clarifyPlugin = {
  id: "clarify-ai",
  name: "Clarify.ai CRM",
  description:
    "Clarify.ai CRM integration — search contacts, create/update records, manage deals, " +
    "find leads with enrichment, and pull meeting transcripts. " +
    "Clarify auto-builds your relationship graph from connected email.",
  configSchema: {
    type: "object" as const,
    properties: {
      clarifyApiKey: { type: "string" as const },
      clarifyWorkspaceSlug: { type: "string" as const },
    },
    required: ["clarifyApiKey", "clarifyWorkspaceSlug"] as const,
  },

  register(pluginApi: any) {
    const apiKey = pluginApi.pluginConfig?.clarifyApiKey;
    const workspaceSlug = pluginApi.pluginConfig?.clarifyWorkspaceSlug;

    if (!apiKey || !workspaceSlug) {
      console.warn(
        "[clarify-ai] Missing clarifyApiKey or clarifyWorkspaceSlug in plugin config. Tools will not work.",
      );
    }

    // ── Tool 1: Search Records ──────────────────────────────────
    pluginApi.registerTool({
      name: "clarify_search",
      label: "Search Clarify CRM",
      description:
        "Search for people, companies, deals, or meetings in Clarify CRM. " +
        "Supports filtering by any field, sorting, and pagination. " +
        "Use this to find contacts, look up companies, or browse your pipeline.",
      parameters: Type.Object({
        object: Type.String({
          description:
            'Object type to search: "person", "company", "deal", "meeting", "task"',
        }),
        query: Type.Optional(
          Type.String({
            description:
              "Free-text search query (searches across name, email, and other text fields)",
          }),
        ),
        filters: Type.Optional(
          Type.Record(Type.String(), Type.String(), {
            description:
              'Key-value filters. Example: {"job_title": "CEO", "location": "San Francisco"}',
          }),
        ),
        sortBy: Type.Optional(
          Type.String({ description: 'Field to sort by (e.g., "name", "created_at")' }),
        ),
        sortDir: Type.Optional(
          Type.String({ description: '"ASC" or "DESC" (default: DESC)' }),
        ),
        limit: Type.Optional(
          Type.Number({ description: "Max results to return (default: 25, max: 1000)" }),
        ),
        include: Type.Optional(
          Type.String({
            description:
              'Comma-separated relationship fields to include (e.g., "company,deals")',
          }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const queryParts: string[] = [];
          const limit = params.limit ?? 25;
          queryParts.push(`page[limit]=${limit}`);

          if (params.sortBy) {
            queryParts.push(
              `sortOrder[column]=${params.sortBy}&sortOrder[dir]=${params.sortDir ?? "DESC"}`,
            );
          }

          if (params.filters) {
            for (const [key, value] of Object.entries(params.filters)) {
              queryParts.push(
                `filter[${encodeURIComponent(key)}]=${encodeURIComponent(String(value))}`,
              );
            }
          }

          if (params.query) {
            queryParts.push(`filter[name][Contains]=${encodeURIComponent(params.query)}`);
          }

          if (params.include) {
            queryParts.push(`include=${encodeURIComponent(params.include)}`);
          }

          const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
          const result = await clarifyApi(
            apiKey,
            workspaceSlug,
            `objects/${params.object}/resources${qs}`,
          );

          const records = (result?.data || []).map((r: any) => ({
            id: r.id,
            type: r.type,
            ...r.attributes,
          }));

          return json({
            object: params.object,
            count: records.length,
            total: result?.meta?.total_records,
            records,
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Tool 2: Create / Upsert Contact ─────────────────────────
    pluginApi.registerTool({
      name: "clarify_create_contact",
      label: "Create Contact in Clarify",
      description:
        "Create or upsert a person or company in Clarify CRM. " +
        "For persons, providing an email enables upsert (updates if exists). " +
        "For companies, providing a domain enables upsert. " +
        "Returns the created/updated record.",
      parameters: Type.Object({
        object: Type.String({
          description: '"person" or "company"',
        }),
        attributes: Type.Record(Type.String(), Type.Any(), {
          description:
            "Record attributes. For person: name, email_addresses (array), job_title, phone_numbers. " +
            "For company: name, domains (array), industry, location. " +
            'Example: {"name": "Gary M", "email_addresses": ["gary@example.com"], "job_title": "CEO"}',
        }),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const result = await clarifyApi(
            apiKey,
            workspaceSlug,
            `objects/${params.object}/records`,
            {
              method: "POST",
              body: JSON.stringify({
                data: {
                  type: params.object,
                  attributes: params.attributes,
                },
              }),
            },
          );

          const record = result?.data;
          return json({
            status: "created",
            id: record?.id,
            type: record?.type,
            ...record?.attributes,
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Tool 3: Update Record ───────────────────────────────────
    pluginApi.registerTool({
      name: "clarify_update_record",
      label: "Update Clarify Record",
      description:
        "Update an existing record in Clarify CRM by ID. " +
        "Use clarify_search first to find the record ID, then update specific fields.",
      parameters: Type.Object({
        object: Type.String({
          description:
            'Object type: "person", "company", "deal", "meeting", "task"',
        }),
        id: Type.String({ description: "Record ID to update" }),
        attributes: Type.Record(Type.String(), Type.Any(), {
          description:
            "Fields to update. Only include fields you want to change. " +
            'Example: {"job_title": "CTO", "notes": "Met at conference"}',
        }),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const result = await clarifyApi(
            apiKey,
            workspaceSlug,
            `objects/${params.object}/records/${params.id}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                data: {
                  id: params.id,
                  type: params.object,
                  attributes: params.attributes,
                },
              }),
            },
          );

          const record = result?.data;
          return json({
            status: "updated",
            id: record?.id,
            type: record?.type,
            ...record?.attributes,
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Tool 4: Find Leads ──────────────────────────────────────
    pluginApi.registerTool({
      name: "clarify_find_leads",
      label: "Find Leads in Clarify",
      description:
        "Search for leads and prospects in Clarify using enriched data. " +
        "Clarify automatically enriches contacts from connected email — " +
        "this tool helps you find people by role, company, industry, or location. " +
        "Great for building outreach lists.",
      parameters: Type.Object({
        role: Type.Optional(
          Type.String({
            description: 'Job title or role to search for (e.g., "CEO", "VP Engineering")',
          }),
        ),
        company: Type.Optional(
          Type.String({ description: "Company name to filter by" }),
        ),
        industry: Type.Optional(
          Type.String({ description: "Industry to filter by" }),
        ),
        location: Type.Optional(
          Type.String({
            description: 'Location to filter by (e.g., "San Francisco", "West Coast")',
          }),
        ),
        limit: Type.Optional(
          Type.Number({ description: "Max results (default: 50)" }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const queryParts: string[] = [];
          queryParts.push(`page[limit]=${params.limit ?? 50}`);
          queryParts.push(`include=company`);

          if (params.role) {
            queryParts.push(
              `filter[job_title][Contains]=${encodeURIComponent(params.role)}`,
            );
          }
          if (params.location) {
            queryParts.push(
              `filter[location][Contains]=${encodeURIComponent(params.location)}`,
            );
          }

          const qs = queryParts.join("&");
          const result = await clarifyApi(
            apiKey,
            workspaceSlug,
            `objects/person/resources?${qs}`,
          );

          let records = (result?.data || []).map((r: any) => ({
            id: r.id,
            name: r.attributes?.name,
            email: r.attributes?.email_addresses?.[0],
            jobTitle: r.attributes?.job_title,
            company: r.attributes?.company_name,
            location: r.attributes?.location,
            lastInteraction: r.attributes?.last_interaction_at,
          }));

          // Client-side filter for company/industry if the API filter doesn't support it directly
          if (params.company) {
            const companyLower = params.company.toLowerCase();
            records = records.filter(
              (r: any) =>
                r.company && r.company.toLowerCase().includes(companyLower),
            );
          }

          return json({
            query: {
              role: params.role,
              company: params.company,
              location: params.location,
            },
            count: records.length,
            total: result?.meta?.total_records,
            leads: records,
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Tool 5: Manage Deals ────────────────────────────────────
    pluginApi.registerTool({
      name: "clarify_manage_deal",
      label: "Manage Deal in Clarify",
      description:
        "Create or update a deal in Clarify CRM pipeline. " +
        "Deals are upserted by name — if a deal with the same name exists, it updates. " +
        "Use this to track sales pipeline, move deals through stages, and set values.",
      parameters: Type.Object({
        action: Type.String({
          description: '"create" to create/upsert, "update" to update by ID, "list" to list all deals',
        }),
        id: Type.Optional(Type.String({ description: "Deal ID (for update action)" })),
        name: Type.Optional(
          Type.String({ description: "Deal name (for create — also used as upsert key)" }),
        ),
        attributes: Type.Optional(
          Type.Record(Type.String(), Type.Any(), {
            description:
              "Deal attributes: name, stage, value, currency, expected_close_date, notes, etc. " +
              'Example: {"name": "Phil - Agent Deploy", "stage": "Proposal", "value": 800}',
          }),
        ),
        limit: Type.Optional(Type.Number({ description: "Max results for list (default: 25)" })),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          if (params.action === "list") {
            const limit = params.limit ?? 25;
            const result = await clarifyApi(
              apiKey,
              workspaceSlug,
              `objects/deal/resources?page[limit]=${limit}&sortOrder[column]=created_at&sortOrder[dir]=DESC`,
            );

            const deals = (result?.data || []).map((r: any) => ({
              id: r.id,
              ...r.attributes,
            }));

            return json({ count: deals.length, deals });
          }

          if (params.action === "create") {
            const attrs = params.attributes || {};
            if (params.name) attrs.name = params.name;

            const result = await clarifyApi(
              apiKey,
              workspaceSlug,
              `objects/deal/records`,
              {
                method: "POST",
                body: JSON.stringify({
                  data: { type: "deal", attributes: attrs },
                }),
              },
            );

            return json({
              status: "created",
              id: result?.data?.id,
              ...result?.data?.attributes,
            });
          }

          if (params.action === "update" && params.id) {
            const result = await clarifyApi(
              apiKey,
              workspaceSlug,
              `objects/deal/records/${params.id}`,
              {
                method: "PATCH",
                body: JSON.stringify({
                  data: {
                    id: params.id,
                    type: "deal",
                    attributes: params.attributes || {},
                  },
                }),
              },
            );

            return json({
              status: "updated",
              id: result?.data?.id,
              ...result?.data?.attributes,
            });
          }

          return json({ error: "Invalid action. Use 'create', 'update', or 'list'." });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Tool 6: Get Meetings ────────────────────────────────────
    pluginApi.registerTool({
      name: "clarify_get_meetings",
      label: "Get Meetings from Clarify",
      description:
        "List recent meetings or get details for a specific meeting from Clarify. " +
        "Clarify auto-captures meetings from connected calendars. " +
        "Use this to review meeting history, get participant info, or access recordings.",
      parameters: Type.Object({
        action: Type.String({
          description: '"list" for recent meetings, "get" for a specific meeting by ID',
        }),
        id: Type.Optional(
          Type.String({ description: "Meeting ID (for get action)" }),
        ),
        limit: Type.Optional(
          Type.Number({ description: "Max meetings to return (default: 10)" }),
        ),
        include: Type.Optional(
          Type.String({
            description:
              'Relationships to include (e.g., "attendees,company,recordings")',
          }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          if (params.action === "get" && params.id) {
            const include = params.include
              ? `?include=${encodeURIComponent(params.include)}`
              : "";
            const result = await clarifyApi(
              apiKey,
              workspaceSlug,
              `objects/meeting/records/${params.id}${include}`,
            );

            return json({
              id: result?.data?.id,
              ...result?.data?.attributes,
              included: result?.included?.map((i: any) => ({
                id: i.id,
                type: i.type,
                ...i.attributes,
              })),
            });
          }

          // List recent meetings
          const limit = params.limit ?? 10;
          const include = params.include
            ? `&include=${encodeURIComponent(params.include)}`
            : "";
          const result = await clarifyApi(
            apiKey,
            workspaceSlug,
            `objects/meeting/resources?page[limit]=${limit}&sortOrder[column]=start_time&sortOrder[dir]=DESC${include}`,
          );

          const meetings = (result?.data || []).map((r: any) => ({
            id: r.id,
            ...r.attributes,
          }));

          return json({
            count: meetings.length,
            total: result?.meta?.total_records,
            meetings,
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });
  },
};

export default clarifyPlugin;
