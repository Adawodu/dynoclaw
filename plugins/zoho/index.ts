import { Type } from "@sinclair/typebox";

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

// ── OAuth2 token management ───────────────────────────────────────────

function createTokenManager(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  dataCenter: string,
) {
  let accessToken = "";
  let expiresAt = 0;

  return async function getToken(): Promise<string> {
    if (accessToken && Date.now() < expiresAt - 60_000) return accessToken;

    const res = await fetch(`https://accounts.zoho.${dataCenter}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Zoho token refresh failed ${res.status}: ${text}`);
    }

    const data = await res.json();
    accessToken = data.access_token;
    expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    return accessToken;
  };
}

async function zohoApi(
  getToken: () => Promise<string>,
  dataCenter: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<any> {
  const doRequest = async (token: string) => {
    const res = await fetch(`https://www.zohoapis.${dataCenter}/crm/v2${path}`, {
      method,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return res;
  };

  let token = await getToken();
  let res = await doRequest(token);

  // Retry once on 401 with a fresh token
  if (res.status === 401) {
    token = await getToken();
    res = await doRequest(token);
  }

  // 204 = no content (empty collection)
  if (res.status === 204) return { data: [], info: { more_records: false } };

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho CRM API error ${res.status}: ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : { success: true };
}

// ── Plugin ────────────────────────────────────────────────────────────

const zohoPlugin = {
  id: "zoho",
  name: "Zoho CRM",
  description:
    "Manage contacts, deals, accounts, notes, and pipelines in Zoho CRM",
  configSchema: {
    type: "object" as const,
    properties: {
      zohoClientId: { type: "string" as const },
      zohoClientSecret: { type: "string" as const },
      zohoRefreshToken: { type: "string" as const },
      zohoDataCenter: { type: "string" as const },
    },
    required: ["zohoClientId", "zohoClientSecret", "zohoRefreshToken"],
  },
  register(pluginApi: any) {
    const clientId = pluginApi.pluginConfig?.zohoClientId;
    const clientSecret = pluginApi.pluginConfig?.zohoClientSecret;
    const refreshToken = pluginApi.pluginConfig?.zohoRefreshToken;
    const dataCenter = pluginApi.pluginConfig?.zohoDataCenter || "com";

    if (!clientId || !clientSecret || !refreshToken) {
      pluginApi.logger?.warn?.("Zoho CRM credentials not configured");
      return;
    }

    const getToken = createTokenManager(clientId, clientSecret, refreshToken, dataCenter);

    // ── Contacts ────────────────────────────────────────────────────

    pluginApi.registerTool({
      name: "zoho_create_contact",
      label: "Create Zoho Contact",
      description: "Create a new contact in Zoho CRM.",
      parameters: Type.Object({
        Email: Type.Optional(Type.String({ description: "Email address" })),
        First_Name: Type.Optional(Type.String({ description: "First name" })),
        Last_Name: Type.String({ description: "Last name (required by Zoho)" }),
        Phone: Type.Optional(Type.String({ description: "Phone number" })),
        Title: Type.Optional(Type.String({ description: "Job title" })),
        Account_Name: Type.Optional(Type.String({ description: "Associated account/company name" })),
        Lead_Source: Type.Optional(Type.String({ description: "Lead source (e.g. Web, Referral)" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const result = await zohoApi(getToken, dataCenter, "POST", "/Contacts", { data: [params] });
        const record = result.data?.[0];
        return json({
          success: record?.status === "success",
          id: record?.details?.id,
          message: record?.message,
        });
      },
    });

    pluginApi.registerTool({
      name: "zoho_search_contacts",
      label: "Search Zoho Contacts",
      description: "Search contacts by field value.",
      parameters: Type.Object({
        criteria: Type.String({
          description: 'Search criteria, e.g. (Email:equals:john@example.com) or (Last_Name:contains:Smith)',
        }),
        limit: Type.Optional(Type.Number({ description: "Max results (default 10)" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const limit = params.limit || 10;
        const result = await zohoApi(
          getToken, dataCenter, "GET",
          `/Contacts/search?criteria=${encodeURIComponent(params.criteria)}&per_page=${limit}`,
        );
        return json({
          contacts: (result.data || []).map((c: any) => ({
            id: c.id,
            First_Name: c.First_Name,
            Last_Name: c.Last_Name,
            Email: c.Email,
            Phone: c.Phone,
            Title: c.Title,
            Account_Name: c.Account_Name?.name || c.Account_Name,
          })),
          count: result.data?.length || 0,
        });
      },
    });

    pluginApi.registerTool({
      name: "zoho_update_contact",
      label: "Update Zoho Contact",
      description: "Update fields on an existing contact.",
      parameters: Type.Object({
        contactId: Type.String({ description: "Contact ID" }),
        fields: Type.Object({}, {
          additionalProperties: Type.String(),
          description: "Fields to update (e.g. { Email, Phone, Title })",
        }),
      }),
      async execute(_toolCallId: string, params: any) {
        const result = await zohoApi(
          getToken, dataCenter, "PUT", "/Contacts",
          { data: [{ id: params.contactId, ...params.fields }] },
        );
        const record = result.data?.[0];
        return json({ success: record?.status === "success", id: record?.details?.id });
      },
    });

    pluginApi.registerTool({
      name: "zoho_list_contacts",
      label: "List Zoho Contacts",
      description: "List contacts with pagination.",
      parameters: Type.Object({
        limit: Type.Optional(Type.Number({ description: "Max results (default 20)" })),
        page: Type.Optional(Type.Number({ description: "Page number (default 1)" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const limit = params.limit || 20;
        const page = params.page || 1;
        const result = await zohoApi(
          getToken, dataCenter, "GET",
          `/Contacts?per_page=${limit}&page=${page}&fields=First_Name,Last_Name,Email,Phone,Title,Account_Name,Lead_Source`,
        );
        return json({
          contacts: (result.data || []).map((c: any) => ({
            id: c.id,
            First_Name: c.First_Name,
            Last_Name: c.Last_Name,
            Email: c.Email,
            Phone: c.Phone,
            Title: c.Title,
            Account_Name: c.Account_Name?.name || c.Account_Name,
          })),
          hasMore: result.info?.more_records || false,
          page,
        });
      },
    });

    // ── Deals ───────────────────────────────────────────────────────

    pluginApi.registerTool({
      name: "zoho_create_deal",
      label: "Create Zoho Deal",
      description: "Create a new deal in Zoho CRM.",
      parameters: Type.Object({
        Deal_Name: Type.String({ description: "Deal name" }),
        Stage: Type.Optional(Type.String({ description: "Deal stage" })),
        Amount: Type.Optional(Type.Number({ description: "Deal amount" })),
        Closing_Date: Type.Optional(Type.String({ description: "Expected close date (YYYY-MM-DD)" })),
        Contact_Name: Type.Optional(Type.String({ description: "Associated contact ID" })),
        Account_Name: Type.Optional(Type.String({ description: "Associated account ID" })),
        Pipeline: Type.Optional(Type.String({ description: "Pipeline name" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const data: Record<string, any> = { Deal_Name: params.Deal_Name };
        if (params.Stage) data.Stage = params.Stage;
        if (params.Amount) data.Amount = params.Amount;
        if (params.Closing_Date) data.Closing_Date = params.Closing_Date;
        if (params.Contact_Name) data.Contact_Name = { id: params.Contact_Name };
        if (params.Account_Name) data.Account_Name = { id: params.Account_Name };
        if (params.Pipeline) data.Pipeline = params.Pipeline;

        const result = await zohoApi(getToken, dataCenter, "POST", "/Deals", { data: [data] });
        const record = result.data?.[0];
        return json({
          success: record?.status === "success",
          id: record?.details?.id,
          message: record?.message,
        });
      },
    });

    pluginApi.registerTool({
      name: "zoho_update_deal",
      label: "Update Zoho Deal",
      description: "Update deal fields including stage changes.",
      parameters: Type.Object({
        dealId: Type.String({ description: "Deal ID" }),
        fields: Type.Object({}, {
          additionalProperties: Type.Any(),
          description: "Fields to update (e.g. { Stage, Amount, Deal_Name })",
        }),
      }),
      async execute(_toolCallId: string, params: any) {
        const result = await zohoApi(
          getToken, dataCenter, "PUT", "/Deals",
          { data: [{ id: params.dealId, ...params.fields }] },
        );
        const record = result.data?.[0];
        return json({ success: record?.status === "success", id: record?.details?.id });
      },
    });

    pluginApi.registerTool({
      name: "zoho_list_deals",
      label: "List Zoho Deals",
      description: "List deals with pagination.",
      parameters: Type.Object({
        limit: Type.Optional(Type.Number({ description: "Max results (default 20)" })),
        page: Type.Optional(Type.Number({ description: "Page number (default 1)" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const limit = params.limit || 20;
        const page = params.page || 1;
        const result = await zohoApi(
          getToken, dataCenter, "GET",
          `/Deals?per_page=${limit}&page=${page}&fields=Deal_Name,Stage,Amount,Closing_Date,Pipeline,Contact_Name,Account_Name`,
        );
        return json({
          deals: (result.data || []).map((d: any) => ({
            id: d.id,
            Deal_Name: d.Deal_Name,
            Stage: d.Stage,
            Amount: d.Amount,
            Closing_Date: d.Closing_Date,
            Pipeline: d.Pipeline,
          })),
          hasMore: result.info?.more_records || false,
          page,
        });
      },
    });

    pluginApi.registerTool({
      name: "zoho_search_deals",
      label: "Search Zoho Deals",
      description: "Search deals by criteria.",
      parameters: Type.Object({
        criteria: Type.String({
          description: 'Search criteria, e.g. (Deal_Name:contains:Enterprise) or (Stage:equals:Negotiation)',
        }),
        limit: Type.Optional(Type.Number({ description: "Max results (default 10)" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const limit = params.limit || 10;
        const result = await zohoApi(
          getToken, dataCenter, "GET",
          `/Deals/search?criteria=${encodeURIComponent(params.criteria)}&per_page=${limit}`,
        );
        return json({
          deals: (result.data || []).map((d: any) => ({
            id: d.id,
            Deal_Name: d.Deal_Name,
            Stage: d.Stage,
            Amount: d.Amount,
            Closing_Date: d.Closing_Date,
          })),
          count: result.data?.length || 0,
        });
      },
    });

    // ── Accounts (Companies) ────────────────────────────────────────

    pluginApi.registerTool({
      name: "zoho_create_account",
      label: "Create Zoho Account",
      description: "Create a new account (company) in Zoho CRM.",
      parameters: Type.Object({
        Account_Name: Type.String({ description: "Account/company name" }),
        Website: Type.Optional(Type.String({ description: "Website URL" })),
        Industry: Type.Optional(Type.String({ description: "Industry" })),
        Phone: Type.Optional(Type.String({ description: "Phone number" })),
        Billing_City: Type.Optional(Type.String({ description: "City" })),
        Billing_State: Type.Optional(Type.String({ description: "State/region" })),
        Billing_Country: Type.Optional(Type.String({ description: "Country" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const result = await zohoApi(getToken, dataCenter, "POST", "/Accounts", { data: [params] });
        const record = result.data?.[0];
        return json({
          success: record?.status === "success",
          id: record?.details?.id,
          message: record?.message,
        });
      },
    });

    pluginApi.registerTool({
      name: "zoho_search_accounts",
      label: "Search Zoho Accounts",
      description: "Search accounts by criteria.",
      parameters: Type.Object({
        criteria: Type.String({
          description: 'Search criteria, e.g. (Account_Name:contains:Acme)',
        }),
        limit: Type.Optional(Type.Number({ description: "Max results (default 10)" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const limit = params.limit || 10;
        const result = await zohoApi(
          getToken, dataCenter, "GET",
          `/Accounts/search?criteria=${encodeURIComponent(params.criteria)}&per_page=${limit}`,
        );
        return json({
          accounts: (result.data || []).map((a: any) => ({
            id: a.id,
            Account_Name: a.Account_Name,
            Website: a.Website,
            Industry: a.Industry,
            Phone: a.Phone,
          })),
          count: result.data?.length || 0,
        });
      },
    });

    pluginApi.registerTool({
      name: "zoho_update_account",
      label: "Update Zoho Account",
      description: "Update fields on an existing account.",
      parameters: Type.Object({
        accountId: Type.String({ description: "Account ID" }),
        fields: Type.Object({}, {
          additionalProperties: Type.String(),
          description: "Fields to update",
        }),
      }),
      async execute(_toolCallId: string, params: any) {
        const result = await zohoApi(
          getToken, dataCenter, "PUT", "/Accounts",
          { data: [{ id: params.accountId, ...params.fields }] },
        );
        const record = result.data?.[0];
        return json({ success: record?.status === "success", id: record?.details?.id });
      },
    });

    pluginApi.registerTool({
      name: "zoho_list_accounts",
      label: "List Zoho Accounts",
      description: "List accounts with pagination.",
      parameters: Type.Object({
        limit: Type.Optional(Type.Number({ description: "Max results (default 20)" })),
        page: Type.Optional(Type.Number({ description: "Page number (default 1)" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const limit = params.limit || 20;
        const page = params.page || 1;
        const result = await zohoApi(
          getToken, dataCenter, "GET",
          `/Accounts?per_page=${limit}&page=${page}&fields=Account_Name,Website,Industry,Phone,Billing_City,Billing_State,Billing_Country`,
        );
        return json({
          accounts: (result.data || []).map((a: any) => ({
            id: a.id,
            Account_Name: a.Account_Name,
            Website: a.Website,
            Industry: a.Industry,
            Phone: a.Phone,
          })),
          hasMore: result.info?.more_records || false,
          page,
        });
      },
    });

    // ── Notes ───────────────────────────────────────────────────────

    pluginApi.registerTool({
      name: "zoho_create_note",
      label: "Create Zoho Note",
      description: "Create a note associated with a contact, deal, or account.",
      parameters: Type.Object({
        Note_Content: Type.String({ description: "Note content" }),
        se_module: Type.String({
          description: "Parent module: Contacts, Deals, or Accounts",
        }),
        parentId: Type.String({ description: "Parent record ID" }),
        Note_Title: Type.Optional(Type.String({ description: "Note title" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const data: Record<string, any> = {
          Note_Content: params.Note_Content,
          se_module: params.se_module,
          Parent_Id: { id: params.parentId },
        };
        if (params.Note_Title) data.Note_Title = params.Note_Title;

        const result = await zohoApi(getToken, dataCenter, "POST", "/Notes", { data: [data] });
        const record = result.data?.[0];
        return json({
          success: record?.status === "success",
          id: record?.details?.id,
          message: record?.message,
        });
      },
    });

    pluginApi.registerTool({
      name: "zoho_list_notes",
      label: "List Zoho Notes",
      description: "List notes for a contact, deal, or account.",
      parameters: Type.Object({
        module: Type.String({ description: "Module: Contacts, Deals, or Accounts" }),
        recordId: Type.String({ description: "Record ID" }),
        limit: Type.Optional(Type.Number({ description: "Max results (default 20)" })),
        page: Type.Optional(Type.Number({ description: "Page number (default 1)" })),
      }),
      async execute(_toolCallId: string, params: any) {
        const limit = params.limit || 20;
        const page = params.page || 1;
        const result = await zohoApi(
          getToken, dataCenter, "GET",
          `/${params.module}/${params.recordId}/Notes?per_page=${limit}&page=${page}`,
        );
        return json({
          notes: (result.data || []).map((n: any) => ({
            id: n.id,
            Note_Title: n.Note_Title,
            Note_Content: n.Note_Content,
            Created_Time: n.Created_Time,
            Modified_Time: n.Modified_Time,
          })),
          hasMore: result.info?.more_records || false,
        });
      },
    });

    // ── Pipelines ───────────────────────────────────────────────────

    pluginApi.registerTool({
      name: "zoho_list_pipelines",
      label: "List Zoho Pipelines",
      description: "List all deal pipelines and their stages.",
      parameters: Type.Object({}),
      async execute() {
        // Get Deals layout ID (required for v2.1 pipeline endpoint)
        const layouts = await zohoApi(getToken, dataCenter, "GET", "/settings/layouts?module=Deals");
        const layoutId = layouts?.layouts?.[0]?.id;
        if (!layoutId) {
          return json({ pipelines: [], message: "No Deals layout found. Set up a Deals module in Zoho first." });
        }

        // Pipeline endpoint requires v2.1
        const token = await getToken();
        const res = await fetch(
          `https://www.zohoapis.${dataCenter}/crm/v2.1/settings/pipeline?layout_id=${layoutId}`,
          { headers: { Authorization: `Zoho-oauthtoken ${token}` } },
        );
        if (res.status === 204) {
          return json({ pipelines: [], message: "No custom pipelines configured. Deals use default stages." });
        }
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Zoho pipeline API error ${res.status}: ${text}`);
        }
        const result = await res.json();
        return json({
          pipelines: (result.pipelines || []).map((p: any) => ({
            id: p.id,
            display_value: p.display_value,
            default: p.default,
            maps: (p.maps || []).map((s: any) => ({
              id: s.id,
              display_value: s.display_value,
              sequence_number: s.sequence_number,
              forecast_type: s.forecast_type,
            })),
          })),
        });
      },
    });
  },
};

export default zohoPlugin;
