import { Type } from "@sinclair/typebox";

const API_BASE = "https://api.hubapi.com";

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

async function hubspotApi(
  apiKey: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot API error ${res.status}: ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : { success: true };
}

// ── Plugin ────────────────────────────────────────────────────────────

const hubspotPlugin = {
  id: "hubspot",
  name: "HubSpot CRM",
  description:
    "Manage contacts, deals, companies, notes, and pipelines in HubSpot CRM",
  configSchema: {
    type: "object" as const,
    properties: {
      hubspotApiKey: { type: "string" as const },
    },
    required: ["hubspotApiKey"],
  },
  register(pluginApi: any) {
    const apiKey = pluginApi.pluginConfig?.hubspotApiKey;

    if (!apiKey) {
      pluginApi.logger?.warn?.("HubSpot API key not configured");
      return;
    }

    // ── Contacts ────────────────────────────────────────────────────

    pluginApi.registerTool({
      name: "hubspot_create_contact",
      label: "Create HubSpot Contact",
      description: "Create a new contact in HubSpot CRM.",
      parameters: Type.Object({
        email: Type.String({ description: "Contact email address" }),
        firstname: Type.Optional(Type.String({ description: "First name" })),
        lastname: Type.Optional(Type.String({ description: "Last name" })),
        phone: Type.Optional(Type.String({ description: "Phone number" })),
        company: Type.Optional(Type.String({ description: "Company name" })),
        jobtitle: Type.Optional(Type.String({ description: "Job title" })),
        lifecyclestage: Type.Optional(
          Type.String({ description: "Lifecycle stage (e.g. lead, opportunity, customer)" }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        const properties: Record<string, string> = { email: params.email };
        if (params.firstname) properties.firstname = params.firstname;
        if (params.lastname) properties.lastname = params.lastname;
        if (params.phone) properties.phone = params.phone;
        if (params.company) properties.company = params.company;
        if (params.jobtitle) properties.jobtitle = params.jobtitle;
        if (params.lifecyclestage) properties.lifecyclestage = params.lifecyclestage;

        const result = await hubspotApi(apiKey, "POST", "/crm/v3/objects/contacts", { properties });
        return json({ success: true, id: result.id, properties: result.properties });
      },
    });

    pluginApi.registerTool({
      name: "hubspot_search_contacts",
      label: "Search HubSpot Contacts",
      description: "Search contacts by name, email, or company.",
      parameters: Type.Object({
        query: Type.String({ description: "Search query (name, email, or company)" }),
        limit: Type.Optional(Type.Number({ description: "Max results (default 10)" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const result = await hubspotApi(apiKey, "POST", "/crm/v3/objects/contacts/search", {
          query: params.query,
          limit: params.limit || 10,
          properties: ["email", "firstname", "lastname", "phone", "company", "jobtitle", "lifecyclestage"],
        });
        return json({
          total: result.total,
          contacts: (result.results || []).map((c: any) => ({ id: c.id, ...c.properties })),
        });
      },
    });

    pluginApi.registerTool({
      name: "hubspot_update_contact",
      label: "Update HubSpot Contact",
      description: "Update properties on an existing contact.",
      parameters: Type.Object({
        contactId: Type.String({ description: "Contact ID" }),
        properties: Type.Object({}, {
          additionalProperties: Type.String(),
          description: "Properties to update (e.g. { email, firstname, lifecyclestage })",
        }),
      }),
      async execute(_toolCallId: string, params: any) {
        const result = await hubspotApi(
          apiKey, "PATCH", `/crm/v3/objects/contacts/${params.contactId}`,
          { properties: params.properties },
        );
        return json({ success: true, id: result.id, properties: result.properties });
      },
    });

    pluginApi.registerTool({
      name: "hubspot_list_contacts",
      label: "List HubSpot Contacts",
      description: "List contacts with pagination.",
      parameters: Type.Object({
        limit: Type.Optional(Type.Number({ description: "Max results (default 20)" })),
        after: Type.Optional(Type.String({ description: "Pagination cursor" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const qs = new URLSearchParams();
        qs.set("limit", String(params.limit || 20));
        qs.set("properties", "email,firstname,lastname,phone,company,jobtitle,lifecyclestage");
        if (params.after) qs.set("after", params.after);

        const result = await hubspotApi(apiKey, "GET", `/crm/v3/objects/contacts?${qs}`);
        return json({
          contacts: (result.results || []).map((c: any) => ({ id: c.id, ...c.properties })),
          paging: result.paging,
        });
      },
    });

    // ── Deals ───────────────────────────────────────────────────────

    pluginApi.registerTool({
      name: "hubspot_create_deal",
      label: "Create HubSpot Deal",
      description: "Create a new deal in HubSpot CRM.",
      parameters: Type.Object({
        dealname: Type.String({ description: "Deal name" }),
        pipeline: Type.Optional(Type.String({ description: "Pipeline ID (default: default pipeline)" })),
        dealstage: Type.Optional(Type.String({ description: "Deal stage ID" })),
        amount: Type.Optional(Type.String({ description: "Deal amount" })),
        closedate: Type.Optional(Type.String({ description: "Expected close date (YYYY-MM-DD)" })),
        contactId: Type.Optional(Type.String({ description: "Associate with this contact ID" })),
        companyId: Type.Optional(Type.String({ description: "Associate with this company ID" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const properties: Record<string, string> = { dealname: params.dealname };
        if (params.pipeline) properties.pipeline = params.pipeline;
        if (params.dealstage) properties.dealstage = params.dealstage;
        if (params.amount) properties.amount = params.amount;
        if (params.closedate) properties.closedate = params.closedate;

        const result = await hubspotApi(apiKey, "POST", "/crm/v3/objects/deals", { properties });

        // Associate with contact/company if provided
        if (params.contactId) {
          await hubspotApi(
            apiKey, "PUT",
            `/crm/v4/objects/deals/${result.id}/associations/contacts/${params.contactId}`,
            [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }],
          );
        }
        if (params.companyId) {
          await hubspotApi(
            apiKey, "PUT",
            `/crm/v4/objects/deals/${result.id}/associations/companies/${params.companyId}`,
            [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 5 }],
          );
        }

        return json({ success: true, id: result.id, properties: result.properties });
      },
    });

    pluginApi.registerTool({
      name: "hubspot_update_deal",
      label: "Update HubSpot Deal",
      description: "Update deal properties including moving to a new stage.",
      parameters: Type.Object({
        dealId: Type.String({ description: "Deal ID" }),
        properties: Type.Object({}, {
          additionalProperties: Type.String(),
          description: "Properties to update (e.g. { dealstage, amount, dealname })",
        }),
      }),
      async execute(_toolCallId: string, params: any) {
        const result = await hubspotApi(
          apiKey, "PATCH", `/crm/v3/objects/deals/${params.dealId}`,
          { properties: params.properties },
        );
        return json({ success: true, id: result.id, properties: result.properties });
      },
    });

    pluginApi.registerTool({
      name: "hubspot_list_deals",
      label: "List HubSpot Deals",
      description: "List deals with pagination.",
      parameters: Type.Object({
        limit: Type.Optional(Type.Number({ description: "Max results (default 20)" })),
        after: Type.Optional(Type.String({ description: "Pagination cursor" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const qs = new URLSearchParams();
        qs.set("limit", String(params.limit || 20));
        qs.set("properties", "dealname,dealstage,pipeline,amount,closedate");
        if (params.after) qs.set("after", params.after);

        const result = await hubspotApi(apiKey, "GET", `/crm/v3/objects/deals?${qs}`);
        return json({
          deals: (result.results || []).map((d: any) => ({ id: d.id, ...d.properties })),
          paging: result.paging,
        });
      },
    });

    pluginApi.registerTool({
      name: "hubspot_search_deals",
      label: "Search HubSpot Deals",
      description: "Search deals by name or properties.",
      parameters: Type.Object({
        query: Type.String({ description: "Search query" }),
        limit: Type.Optional(Type.Number({ description: "Max results (default 10)" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const result = await hubspotApi(apiKey, "POST", "/crm/v3/objects/deals/search", {
          query: params.query,
          limit: params.limit || 10,
          properties: ["dealname", "dealstage", "pipeline", "amount", "closedate"],
        });
        return json({
          total: result.total,
          deals: (result.results || []).map((d: any) => ({ id: d.id, ...d.properties })),
        });
      },
    });

    // ── Companies ───────────────────────────────────────────────────

    pluginApi.registerTool({
      name: "hubspot_create_company",
      label: "Create HubSpot Company",
      description: "Create a new company in HubSpot CRM.",
      parameters: Type.Object({
        name: Type.String({ description: "Company name" }),
        domain: Type.Optional(Type.String({ description: "Company website domain" })),
        industry: Type.Optional(Type.String({ description: "Industry" })),
        phone: Type.Optional(Type.String({ description: "Phone number" })),
        city: Type.Optional(Type.String({ description: "City" })),
        state: Type.Optional(Type.String({ description: "State/region" })),
        country: Type.Optional(Type.String({ description: "Country" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const properties: Record<string, string> = { name: params.name };
        if (params.domain) properties.domain = params.domain;
        if (params.industry) properties.industry = params.industry;
        if (params.phone) properties.phone = params.phone;
        if (params.city) properties.city = params.city;
        if (params.state) properties.state = params.state;
        if (params.country) properties.country = params.country;

        const result = await hubspotApi(apiKey, "POST", "/crm/v3/objects/companies", { properties });
        return json({ success: true, id: result.id, properties: result.properties });
      },
    });

    pluginApi.registerTool({
      name: "hubspot_search_companies",
      label: "Search HubSpot Companies",
      description: "Search companies by name or domain.",
      parameters: Type.Object({
        query: Type.String({ description: "Search query (name or domain)" }),
        limit: Type.Optional(Type.Number({ description: "Max results (default 10)" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const result = await hubspotApi(apiKey, "POST", "/crm/v3/objects/companies/search", {
          query: params.query,
          limit: params.limit || 10,
          properties: ["name", "domain", "industry", "phone", "city", "state", "country"],
        });
        return json({
          total: result.total,
          companies: (result.results || []).map((c: any) => ({ id: c.id, ...c.properties })),
        });
      },
    });

    pluginApi.registerTool({
      name: "hubspot_update_company",
      label: "Update HubSpot Company",
      description: "Update properties on an existing company.",
      parameters: Type.Object({
        companyId: Type.String({ description: "Company ID" }),
        properties: Type.Object({}, {
          additionalProperties: Type.String(),
          description: "Properties to update",
        }),
      }),
      async execute(_toolCallId: string, params: any) {
        const result = await hubspotApi(
          apiKey, "PATCH", `/crm/v3/objects/companies/${params.companyId}`,
          { properties: params.properties },
        );
        return json({ success: true, id: result.id, properties: result.properties });
      },
    });

    pluginApi.registerTool({
      name: "hubspot_list_companies",
      label: "List HubSpot Companies",
      description: "List companies with pagination.",
      parameters: Type.Object({
        limit: Type.Optional(Type.Number({ description: "Max results (default 20)" })),
        after: Type.Optional(Type.String({ description: "Pagination cursor" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const qs = new URLSearchParams();
        qs.set("limit", String(params.limit || 20));
        qs.set("properties", "name,domain,industry,phone,city,state,country");
        if (params.after) qs.set("after", params.after);

        const result = await hubspotApi(apiKey, "GET", `/crm/v3/objects/companies?${qs}`);
        return json({
          companies: (result.results || []).map((c: any) => ({ id: c.id, ...c.properties })),
          paging: result.paging,
        });
      },
    });

    // ── Notes / Activities ──────────────────────────────────────────

    pluginApi.registerTool({
      name: "hubspot_create_note",
      label: "Create HubSpot Note",
      description:
        "Create a note and associate it with a contact, deal, or company.",
      parameters: Type.Object({
        body: Type.String({ description: "Note content" }),
        associatedObjectType: Type.String({
          description: "Object type to associate: contacts, deals, or companies",
        }),
        associatedObjectId: Type.String({ description: "ID of the object to associate with" }),
      }),
      async execute(_toolCallId: string, params: any) {
        // Create the note
        const note = await hubspotApi(apiKey, "POST", "/crm/v3/objects/notes", {
          properties: {
            hs_note_body: params.body,
            hs_timestamp: new Date().toISOString(),
          },
        });

        // Association type IDs: notes→contacts=202, notes→deals=214, notes→companies=190
        const assocTypeMap: Record<string, number> = {
          contacts: 202,
          deals: 214,
          companies: 190,
        };
        const assocTypeId = assocTypeMap[params.associatedObjectType];
        if (assocTypeId) {
          await hubspotApi(
            apiKey, "PUT",
            `/crm/v4/objects/notes/${note.id}/associations/${params.associatedObjectType}/${params.associatedObjectId}`,
            [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: assocTypeId }],
          );
        }

        return json({
          success: true,
          noteId: note.id,
          associatedWith: { type: params.associatedObjectType, id: params.associatedObjectId },
        });
      },
    });

    pluginApi.registerTool({
      name: "hubspot_list_notes",
      label: "List HubSpot Notes",
      description: "List notes associated with a contact, deal, or company.",
      parameters: Type.Object({
        objectType: Type.String({ description: "Object type: contacts, deals, or companies" }),
        objectId: Type.String({ description: "Object ID" }),
        limit: Type.Optional(Type.Number({ description: "Max results (default 20)" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const limit = params.limit || 20;
        const result = await hubspotApi(
          apiKey, "GET",
          `/crm/v4/objects/${params.objectType}/${params.objectId}/associations/notes?limit=${limit}`,
        );

        const noteIds = (result.results || []).map((a: any) => a.toObjectId);
        if (noteIds.length === 0) return json({ notes: [], count: 0 });

        // Batch read note details
        const notes = await hubspotApi(apiKey, "POST", "/crm/v3/objects/notes/batch/read", {
          inputs: noteIds.map((id: string) => ({ id })),
          properties: ["hs_note_body", "hs_timestamp", "hs_lastmodifieddate"],
        });

        return json({
          notes: (notes.results || []).map((n: any) => ({
            id: n.id,
            body: n.properties?.hs_note_body,
            timestamp: n.properties?.hs_timestamp,
            modified: n.properties?.hs_lastmodifieddate,
          })),
          count: noteIds.length,
        });
      },
    });

    // ── Pipelines ───────────────────────────────────────────────────

    pluginApi.registerTool({
      name: "hubspot_list_pipelines",
      label: "List HubSpot Pipelines",
      description: "List all deal pipelines and their stages.",
      parameters: Type.Object({}),
      async execute() {
        const result = await hubspotApi(apiKey, "GET", "/crm/v3/pipelines/deals");
        return json({
          pipelines: (result.results || []).map((p: any) => ({
            id: p.id,
            label: p.label,
            stages: (p.stages || []).map((s: any) => ({
              id: s.id,
              label: s.label,
              displayOrder: s.displayOrder,
            })),
          })),
        });
      },
    });
  },
};

export default hubspotPlugin;
