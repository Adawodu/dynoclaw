import { Type } from "@sinclair/typebox";

const API_BASE = "https://api.agentmail.to/v0";

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

async function agentmailApi(
  apiKey: string,
  path: string,
  options: RequestInit = {},
): Promise<any> {
  const url = `${API_BASE}/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AgentMail API error ${res.status}: ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : { success: true };
}

// ── Plugin ────────────────────────────────────────────────────────────

const agentmailPlugin = {
  id: "agentmail",
  name: "AgentMail",
  description:
    "Dedicated email inbox for AI agent — send, receive, list, and search emails via AgentMail",
  configSchema: {
    type: "object" as const,
    properties: {
      agentmailApiKey: { type: "string" as const },
      inboxId: { type: "string" as const },
    },
    required: ["agentmailApiKey"],
  },
  register(pluginApi: any) {
    const apiKey = pluginApi.pluginConfig?.agentmailApiKey;
    let defaultInboxId: string | undefined = pluginApi.pluginConfig?.inboxId;

    if (!apiKey) {
      pluginApi.logger?.warn?.("AgentMail API key not configured");
      return;
    }

    // ── Tool 1: Create Inbox ──────────────────────────────────────────

    pluginApi.registerTool({
      name: "agentmail_create_inbox",
      label: "Create AgentMail Inbox",
      description:
        "Create a new email inbox. Returns the inbox ID (full email address). " +
        "Use this once to provision an inbox, then use the inbox ID for other tools.",
      parameters: Type.Object({
        displayName: Type.Optional(
          Type.String({ description: "Display name for the inbox (e.g. 'JonnyMate Support')" }),
        ),
        domain: Type.Optional(
          Type.String({ description: "Email domain (default: agentmail.to)" }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        const body: Record<string, string> = {};
        if (params.displayName) body.displayName = params.displayName;
        if (params.domain) body.domain = params.domain;

        const result = await agentmailApi(apiKey, "inboxes", {
          method: "POST",
          body: JSON.stringify(body),
        });

        // Cache the inbox ID for subsequent calls in this session
        if (result.inbox_id || result.inboxId) {
          defaultInboxId = result.inbox_id || result.inboxId;
        }

        return json({
          success: true,
          inboxId: result.inbox_id || result.inboxId,
          email: result.inbox_id || result.inboxId,
          displayName: result.display_name || result.displayName || params.displayName,
        });
      },
    });

    // ── Tool 2: Send Email ────────────────────────────────────────────

    pluginApi.registerTool({
      name: "agentmail_send",
      label: "Send Email via AgentMail",
      description:
        "Send an email from the agent's inbox. Supports plain text and HTML bodies.",
      parameters: Type.Object({
        to: Type.String({ description: "Recipient email address(es), comma-separated" }),
        subject: Type.String({ description: "Email subject line" }),
        text: Type.String({ description: "Plain text email body" }),
        html: Type.Optional(Type.String({ description: "HTML email body (optional, improves deliverability)" })),
        inboxId: Type.Optional(
          Type.String({ description: "Inbox ID to send from (uses default if omitted)" }),
        ),
        cc: Type.Optional(Type.String({ description: "CC recipients, comma-separated" })),
        bcc: Type.Optional(Type.String({ description: "BCC recipients, comma-separated" })),
        inReplyTo: Type.Optional(
          Type.String({ description: "Message ID to reply to (for threading)" }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        const inbox = params.inboxId || defaultInboxId;
        if (!inbox) {
          throw new Error(
            "No inbox ID configured. Create an inbox first with agentmail_create_inbox, " +
            "or set inboxId in plugin config.",
          );
        }

        const toList = params.to.split(",").map((e: string) => e.trim());
        const body: Record<string, any> = {
          to: toList,
          subject: params.subject,
          text: params.text,
        };
        if (params.html) body.html = params.html;
        if (params.cc) body.cc = params.cc.split(",").map((e: string) => e.trim());
        if (params.bcc) body.bcc = params.bcc.split(",").map((e: string) => e.trim());
        if (params.inReplyTo) body.in_reply_to = params.inReplyTo;

        const result = await agentmailApi(apiKey, `inboxes/${encodeURIComponent(inbox)}/messages/send`, {
          method: "POST",
          body: JSON.stringify(body),
        });

        return json({
          success: true,
          messageId: result.message_id || result.messageId || result.id,
          from: inbox,
          to: toList,
          subject: params.subject,
        });
      },
    });

    // ── Tool 3: List Messages ─────────────────────────────────────────

    pluginApi.registerTool({
      name: "agentmail_list_messages",
      label: "List AgentMail Messages",
      description:
        "List recent messages in the agent's inbox. Shows sender, subject, date, and snippet.",
      parameters: Type.Object({
        inboxId: Type.Optional(
          Type.String({ description: "Inbox ID (uses default if omitted)" }),
        ),
        limit: Type.Optional(
          Type.Number({ description: "Max messages to return (default 20)" }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        const inbox = params.inboxId || defaultInboxId;
        if (!inbox) {
          throw new Error("No inbox ID configured. Create an inbox first or set inboxId in config.");
        }

        const limit = params.limit || 20;
        const result = await agentmailApi(
          apiKey,
          `inboxes/${encodeURIComponent(inbox)}/messages?limit=${limit}`,
        );

        const messages = (result.messages || result.data || []).map((m: any) => ({
          id: m.id || m.message_id || m.messageId,
          from: m.from,
          to: m.to,
          subject: m.subject,
          date: m.created_at || m.createdAt || m.date,
          snippet: m.snippet || m.extracted_text?.slice(0, 120) || m.text?.slice(0, 120) || "",
        }));

        return json({ messages, count: messages.length, inboxId: inbox });
      },
    });

    // ── Tool 4: Read Message ──────────────────────────────────────────

    pluginApi.registerTool({
      name: "agentmail_read_message",
      label: "Read AgentMail Message",
      description:
        "Read the full content of a specific email message. Use extracted_text for clean reply content.",
      parameters: Type.Object({
        messageId: Type.String({ description: "Message ID to read" }),
        inboxId: Type.Optional(
          Type.String({ description: "Inbox ID (uses default if omitted)" }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        const inbox = params.inboxId || defaultInboxId;
        if (!inbox) {
          throw new Error("No inbox ID configured.");
        }

        const result = await agentmailApi(
          apiKey,
          `inboxes/${encodeURIComponent(inbox)}/messages/${encodeURIComponent(params.messageId)}`,
        );

        return json({
          id: result.id || result.message_id,
          from: result.from,
          to: result.to,
          cc: result.cc,
          subject: result.subject,
          text: result.extracted_text || result.text,
          html: result.extracted_html || result.html,
          date: result.created_at || result.createdAt || result.date,
          threadId: result.thread_id || result.threadId,
          inReplyTo: result.in_reply_to || result.inReplyTo,
          hasAttachments: !!(result.attachments && result.attachments.length > 0),
          attachments: result.attachments || [],
        });
      },
    });

    // ── Tool 5: List Inboxes ──────────────────────────────────────────

    pluginApi.registerTool({
      name: "agentmail_list_inboxes",
      label: "List AgentMail Inboxes",
      description: "List all inboxes associated with your AgentMail account.",
      parameters: Type.Object({}),
      async execute() {
        const result = await agentmailApi(apiKey, "inboxes");

        const inboxes = (result.inboxes || result.data || []).map((i: any) => ({
          inboxId: i.inbox_id || i.inboxId || i.id,
          displayName: i.display_name || i.displayName,
          createdAt: i.created_at || i.createdAt,
        }));

        return json({ inboxes, count: inboxes.length });
      },
    });
  },
};

export default agentmailPlugin;
