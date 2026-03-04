---
name: agentmail
description: Send, receive, and manage emails through the agent's dedicated AgentMail inbox
user-invocable: true
metadata: {"openclaw":{"emoji":"📬"}}
---

# AgentMail — Agent Email Inbox

Manage the agent's dedicated email inbox powered by AgentMail. Send emails, read incoming messages, reply to threads, and manage inboxes.

## Step 1: Ask Before Acting

**CRITICAL: Do NOT auto-send.** When this skill is invoked, FIRST ask what the user wants. Present these options:

> **📬 AgentMail — What would you like to do?**
>
> 1. **Send email** — Compose and send an email from the agent's inbox
> 2. **Check inbox** — View recent incoming messages
> 3. **Read message** — Read the full content of a specific email
> 4. **Reply to email** — Reply to an incoming message in-thread
> 5. **Manage inboxes** — List or create agent inboxes
>
> You can also give a direct instruction, e.g. "email john@example.com about the project update"

**Wait for the user's response before taking any action.** If they give a direct instruction, skip the menu and act on it.

## Mode 1: Send Email

Gather the required info conversationally. Ask for anything missing:
- **To** — recipient email(s) (required)
- **Subject** — email subject (required)
- **Body** — email content (required)
- **CC / BCC** — optional

Before sending, show a preview:

> **📬 Email Preview**
> - **From:** agent-inbox@agentmail.to
> - **To:** recipient@example.com
> - **Subject:** Project Update
> - **Body:** (first 200 chars or full text if short)
>
> Send this email? (yes/no)

On confirmation, call `agentmail_send` with both `text` and `html` versions for better deliverability. Report the result:

> ✅ Email sent successfully.
> **Message ID:** msg_abc123

## Mode 2: Check Inbox

Call `agentmail_list_messages` and present results:

> **📬 Recent messages** (inbox-id@agentmail.to)
>
> | # | From | Subject | Date |
> |---|------|---------|------|
> | 1 | alice@example.com | Re: Meeting notes | Mar 3, 2026 |
> | 2 | ... | ... | ... |

Suggest: *"Want me to read any of these or reply to one?"*

## Mode 3: Read Message

Call `agentmail_read_message` with the message ID. Present the full content:

> **📬 Email from** alice@example.com
> **Subject:** Re: Meeting notes
> **Date:** Mar 3, 2026
>
> (full message body)

Suggest: *"Want me to reply to this?"*

## Mode 4: Reply to Email

When replying:
1. First read the original message with `agentmail_read_message` to get the thread context.
2. Gather the reply content from the user.
3. Show a preview before sending.
4. Call `agentmail_send` with `inReplyTo` set to the original message ID for proper threading.

## Mode 5: Manage Inboxes

- **List inboxes** — Call `agentmail_list_inboxes` and present as a table.
- **Create inbox** — Call `agentmail_create_inbox` with a display name. Report the new email address.

## Guidelines

- **Include both text and HTML** when sending. Wrap body in basic HTML for the `html` param.
- **Always preview before sending.** Unlike DynoSist, AgentMail sends directly — there is no draft stage.
- **Use threading** for replies. Always pass `inReplyTo` when replying to maintain conversation threads.
- **Be concise with body text.** If the user doesn't specify a body, ask for one — don't invent content.
- **After completing any action**, suggest a natural next step.
