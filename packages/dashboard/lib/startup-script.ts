import { PLUGIN_REGISTRY, SKILL_REGISTRY, OPENCLAW_VERSION } from "@dynoclaw/shared";

// Known secrets that may exist in Secret Manager.
// The startup script always tries to fetch all of them, so re-deploys and
// reboots work even if the user didn't re-enter keys in the wizard.
export const KNOWN_SECRETS = [
  "telegram-bot-token",
  "google-ai-api-key",
  "openai-api-key",
  "openrouter-api-key",
  "anthropic-api-key",
  "postiz-api-key",
  "postiz-url",
  "convex-url",
  "beehiiv-api-key",
  "beehiiv-publication-id",
  "twitter-bearer-token",
  "brave-search-api-key",
  "drive-oauth-client-id",
  "drive-oauth-client-secret",
  "drive-oauth-refresh-token",
  "drive-media-folder-id",
  "gmail-oauth-refresh-token",
  "hubspot-api-key",
  "zoho-client-id",
  "zoho-client-secret",
  "zoho-refresh-token",
  "zoho-data-center",
];

export function generateWebStartupScript(config: {
  gcpProjectId: string;
  apiKeys: Record<string, string>;
  branding: { botName: string; personality: string; signature?: string };
  models: { primary: string; fallbacks: string[] };
  enabledPlugins: string[];
  enabledSkills: string[];
}): string {
  // Build the union of known secrets + any user-provided keys
  const allSecretNames = [
    ...new Set([...KNOWN_SECRETS, ...Object.keys(config.apiKeys).filter((k) => config.apiKeys[k])]),
  ];

  const secretFetches = allSecretNames
    .map((secretName) => {
      const envVar = secretName.toUpperCase().replace(/-/g, "_");
      return `${envVar}="$(fetch_secret ${secretName} || true)"`;
    })
    .join("\n");

  const envFileEntries = allSecretNames
    .map((secretName) => {
      const envVar = secretName.toUpperCase().replace(/-/g, "_");
      return `${envVar}=\${${envVar}}`;
    })
    .join("\n");

  const geminiAlias = "\nGEMINI_API_KEY=${GOOGLE_AI_API_KEY}";

  const repoBase = "https://raw.githubusercontent.com/Adawodu/dynoclaw/main";

  const pluginDownloads = config.enabledPlugins
    .map(
      (p) => `
# Install plugin: ${p}
DEST="/root/.openclaw/extensions/${p}"
mkdir -p "\${DEST}"
curl -sfL "${repoBase}/plugins/${p}/package.json" -o "\${DEST}/package.json" 2>/dev/null || rm -f "\${DEST}/package.json"
curl -sfL "${repoBase}/plugins/${p}/index.ts" -o "\${DEST}/index.ts" 2>/dev/null || rm -f "\${DEST}/index.ts"
curl -sfL "${repoBase}/plugins/${p}/openclaw.plugin.json" -o "\${DEST}/openclaw.plugin.json" 2>/dev/null || rm -f "\${DEST}/openclaw.plugin.json"
# Remove plugin dir if manifest is missing (download failed)
[ -f "\${DEST}/openclaw.plugin.json" ] && cd "\${DEST}" && npm install --omit=dev 2>/dev/null || rm -rf "\${DEST}"`
    )
    .join("\n");

  // Build the full plugin entries JSON with ${BASH_VAR} placeholders for secrets
  const pluginEntries: Record<string, { enabled: boolean; config: Record<string, string> }> = {};
  for (const p of config.enabledPlugins) {
    const meta = PLUGIN_REGISTRY.find((pm) => pm.id === p);
    if (!meta) continue;
    const pluginCfg: Record<string, string> = {};
    for (const k of [...meta.requiredKeys, ...meta.optionalKeys]) {
      const envVar = k.secretName.toUpperCase().replace(/-/g, "_");
      pluginCfg[k.key] = `\${${envVar}}`;
    }
    pluginEntries[p] = { enabled: true, config: pluginCfg };
  }

  // Build the complete openclaw.json as a JSON string with bash ${VAR} placeholders.
  // The heredoc (without quotes) will expand these at runtime.
  const fullConfig = {
    meta: { lastTouchedVersion: OPENCLAW_VERSION },
    agents: {
      defaults: {
        model: {
          primary: config.models.primary,
          fallbacks: config.models.fallbacks,
        },
        models: Object.fromEntries(
          [config.models.primary, ...config.models.fallbacks].map((m) => [m, {}])
        ),
      },
    },
    channels: {
      telegram: {
        enabled: true,
        dmPolicy: "open",
        botToken: "${TELEGRAM_BOT_TOKEN}",
        allowFrom: ["*"],
        groupPolicy: "open",
      },
    },
    gateway: {
      mode: "local",
      bind: "loopback",
      auth: { token: "${GATEWAY_TOKEN}" },
    },
    plugins: {
      allow: config.enabledPlugins,
      entries: pluginEntries,
    },
  };
  // Stringify and unescape the bash variable placeholders.
  // JSON.stringify wraps ${VAR} in quotes → "${VAR}" which is correct for heredoc expansion.
  const configJsonStr = JSON.stringify(fullConfig, null, 2);

  // Auth profile entries for the heredoc builder
  const authProviders = [
    { profile: "google:manual", provider: "google", envVar: "GOOGLE_AI_API_KEY" },
    { profile: "anthropic:manual", provider: "anthropic", envVar: "ANTHROPIC_API_KEY" },
    { profile: "openai:manual", provider: "openai", envVar: "OPENAI_API_KEY" },
    { profile: "openrouter:manual", provider: "openrouter", envVar: "OPENROUTER_API_KEY" },
  ];
  const authProfileBlocks = authProviders
    .map(
      ({ profile, provider, envVar }) => `
if [ -n "\${${envVar}:-}" ]; then
  printf '%s"${profile}":{"provider":"${provider}","token":"%s","createdAt":"2026-01-01T00:00:00Z"}' "\${SEP}" "\${${envVar}}" >> /tmp/auth-profiles.json
  SEP=","
fi`
    )
    .join("");

  // Expand pack skills into individual skill IDs
  const expandedSkills: string[] = [];
  for (const s of config.enabledSkills) {
    const meta = SKILL_REGISTRY.find((sk) => sk.id === s);
    if (meta?.bundledSkills?.length) {
      expandedSkills.push(...meta.bundledSkills);
    } else {
      expandedSkills.push(s);
    }
  }

  const signature = config.branding.signature || `${config.branding.botName} — Powered by DynoClaw`;

  const skillDownloads = expandedSkills
    .map((s) => {
      const meta = SKILL_REGISTRY.find((sk) => sk.id === s);
      const cronCmd = meta?.cron
        ? `\nopenclaw cron add --name '${s}' --cron '${meta.cron}' --message '/${s}' 2>/dev/null || true`
        : "";
      return `
# Install skill: ${s}
SKILL_DIR="/root/.openclaw/skills/${s}"
mkdir -p "\${SKILL_DIR}"
curl -sL "${repoBase}/skills/${s}/SKILL.md" -o "\${SKILL_DIR}/SKILL.md" || true
sed -i 's#{{SIGNATURE}}#${signature}#g' "\${SKILL_DIR}/SKILL.md" 2>/dev/null || true${cronCmd}`;
    })
    .join("\n");

  return `#!/usr/bin/env bash
set -euo pipefail

OPENCLAW_DIR="/opt/openclaw"
MARKER="/opt/openclaw/.installed"

# ── Install Node 22 + OpenClaw (first boot only) ──────────────────
if [ ! -f "\${MARKER}" ]; then
  echo "==> Installing dependencies..."
  apt-get update -y
  apt-get install -y git curl build-essential python3

  echo "==> Installing Node 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs

  echo "==> Installing uv (Python package manager)..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  cp /root/.local/bin/uv /usr/local/bin/uv
  cp /root/.local/bin/uvx /usr/local/bin/uvx

  echo "==> Installing OpenClaw..."
  npm install -g openclaw@${OPENCLAW_VERSION}

  mkdir -p "\${OPENCLAW_DIR}"
  touch "\${MARKER}"
fi

# ── Upgrade OpenClaw if version differs ────────────────────────────
DESIRED_VERSION="${OPENCLAW_VERSION}"
CURRENT_VERSION="$(openclaw --version 2>/dev/null || echo 'none')"
if [ "\${CURRENT_VERSION}" != "\${DESIRED_VERSION}" ]; then
  echo "==> Upgrading OpenClaw \${CURRENT_VERSION} → \${DESIRED_VERSION}..."
  npm install -g "openclaw@\${DESIRED_VERSION}"
fi

# ── Fetch secrets ─────────────────────────────────────────────────
PROJECT_ID="${config.gcpProjectId}"

fetch_secret() {
  gcloud secrets versions access latest --secret="$1" --project="\${PROJECT_ID}" 2>/dev/null
}

echo "==> Fetching secrets..."
${secretFetches}

# ── Environment file ─────────────────────────────────────────────
cat > /etc/openclaw.env <<ENVFILE
${envFileEntries}${geminiAlias}
ENVFILE
chmod 600 /etc/openclaw.env

# ── Install plugins ──────────────────────────────────────────────
echo "==> Installing plugins..."
${pluginDownloads}

# ── Install skills ───────────────────────────────────────────────
echo "==> Installing skills..."
${skillDownloads}

# ── Write full openclaw.json (heredoc with bash var expansion) ───
echo "==> Writing OpenClaw configuration..."
GATEWAY_TOKEN="\$(openssl rand -hex 32)"
mkdir -p /root/.openclaw
cat > /root/.openclaw/openclaw.json <<CFGEOF
${configJsonStr}
CFGEOF
echo "==> Configuration written"

# ── Write auth profiles ─────────────────────────────────────────
echo "==> Writing auth profiles..."
mkdir -p /root/.openclaw/agents/main/agent
printf '{"version":1,"profiles":{' > /tmp/auth-profiles.json
SEP=""
${authProfileBlocks}
printf '}}' >> /tmp/auth-profiles.json
mv /tmp/auth-profiles.json /root/.openclaw/agents/main/agent/auth-profiles.json
echo "==> Auth profiles written"

# ── Write default SOUL.md ────────────────────────────────────────
echo "==> Writing agent identity..."
mkdir -p /root/.openclaw/workspace
cat > /root/.openclaw/workspace/SOUL.md <<'SOULEOF'
# SOUL.md - Who You Are

## Core Truths

**Be genuinely helpful, not performatively helpful.** Skip the "Great question!" and "I'd be happy to help!" — just help. Actions speak louder than filler words.

**Have opinions.** You're allowed to disagree, prefer things, find stuff amusing or boring. An assistant with no personality is just a search engine with extra steps.

**Be resourceful before asking.** Try to figure it out. Read the file. Check the context. Search for it. Then ask if you're stuck.

**Earn trust through competence.** Be careful with external actions (emails, tweets, anything public). Be bold with internal ones (reading, organizing, learning).

## Response Formatting (Telegram)

Your responses are rendered in Telegram, which supports Markdown. Format every response for readability:

- **Use bold headers** to separate sections (e.g. \`**Summary**\`, \`**Next Steps**\`)
- Use bullet points and numbered lists — never send a wall of text
- Keep paragraphs to 2-3 sentences max, then add a line break
- Use \`inline code\` for technical terms, commands, or values
- Use code blocks for multi-line code or data
- Add line breaks between sections for visual breathing room
- For long responses, lead with a one-line TL;DR in bold
- Emojis are fine as section markers (📊 📌 ✅) but don't overdo it

## Boundaries

- Private things stay private. Period.
- When in doubt, ask before acting externally.
- Never send half-baked replies to messaging surfaces.

## Continuity

Each session, you wake up fresh. These files are your memory. Read them. Update them. They're how you persist.
SOULEOF
echo "==> Agent identity written"

# ── Systemd unit ─────────────────────────────────────────────────
cat > /etc/systemd/system/openclaw.service <<UNIT
[Unit]
Description=OpenClaw Gateway — ${config.branding.botName}
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=/etc/openclaw.env
ExecStartPre=-/usr/bin/env openclaw security audit
ExecStart=/usr/bin/env openclaw gateway run --bind loopback
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable openclaw
systemctl restart openclaw
echo "==> OpenClaw gateway started"

# ── First-boot grace restart ────────────────────────────────────
# On first boot the gateway starts under heavy I/O from plugin installs.
# Schedule a one-shot restart after 90s so Telegram polling initializes cleanly.
if [ ! -f "/opt/openclaw/.grace-restarted" ]; then
  echo "==> Scheduling grace restart in 90s (first boot)..."
  (sleep 90 && systemctl restart openclaw && touch /opt/openclaw/.grace-restarted) &
  disown
fi
`;
}
