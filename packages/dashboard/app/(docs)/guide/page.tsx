import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guide — DynoClaw",
  description: "Learn how to set up and use DynoClaw, your enterprise AI teammate platform.",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      {children}
    </section>
  );
}

function FAQ({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-border/50 py-4">
      <summary className="cursor-pointer text-sm font-medium list-none flex items-center justify-between">
        {q}
        <span className="ml-2 text-muted-foreground transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </details>
  );
}

export default function GuidePage() {
  return (
    <article className="prose-invert max-w-none">
      <h1 className="text-3xl font-extrabold mb-2">DynoClaw Guide</h1>
      <p className="text-muted-foreground mb-12">
        Everything you need to deploy and manage your AI teammate.
      </p>

      <Section id="getting-started" title="Getting Started">
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            DynoClaw deploys a fully configured AI agent — either managed by us or into your own
            Google Cloud project. The agent runs 24/7, equipped with plugins for social media,
            newsletters, email management, privacy enforcement, and more.
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Sign up for a DynoClaw account</li>
            <li>Choose your hosting: <strong className="text-foreground">Managed</strong> (we handle infrastructure) or <strong className="text-foreground">Self-Hosted</strong> (your GCP project)</li>
            <li>Configure your agent&apos;s personality, plugins, and skills</li>
            <li>Deploy with one click</li>
          </ol>
          <p>
            Your 14-day free trial starts when you sign up. No credit card required.
          </p>
        </div>
      </Section>

      <Section id="hosting" title="Hosting Options">
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <h3 className="text-base font-semibold text-foreground">Managed Hosting (Starter & Pro)</h3>
          <p>
            We handle the infrastructure. Your AI teammate runs on an isolated VM managed by DynoClaw.
            No GCP account required — just configure your bot and deploy.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Isolated VM per customer</li>
            <li>API keys stored in GCP Secret Manager (AES-256 encrypted)</li>
            <li>Automatic updates and maintenance</li>
            <li>Data deletion on account cancellation</li>
          </ul>

          <h3 className="text-base font-semibold text-foreground">Self-Hosted (Enterprise)</h3>
          <p>
            Deploy to your own GCP project for full data ownership. DynoClaw creates a VM
            and configures it, then you own and control everything.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>A GCP project with billing enabled</li>
            <li>Owner or Editor role on the project</li>
            <li>Compute Engine and Secret Manager APIs (auto-enabled during deploy)</li>
            <li>Compatible with Domain Restricted Sharing and other org policies</li>
          </ul>
          <h3 className="text-base font-semibold text-foreground">What Gets Created</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>A VM (<code className="rounded bg-card px-1.5 py-0.5 text-xs">e2-medium</code> default, upgradeable) — infrastructure cost included in managed plans, billed by Google for self-hosted</li>
            <li>Secrets in GCP Secret Manager for API keys</li>
            <li>Firewall rules (SSH via IAP only, no public ingress)</li>
            <li>Cloud NAT for outbound internet without a public IP</li>
          </ul>
        </div>
      </Section>

      <Section id="plugins" title="Plugins">
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            17+ plugins extend your AI teammate with new capabilities. Enable them during deploy or from the dashboard.
          </p>
          <h3 className="text-base font-semibold text-foreground">Available Plugins</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-foreground">Postiz</strong> — Post to X/Twitter, Instagram, LinkedIn, and more</li>
            <li><strong className="text-foreground">Beehiiv</strong> — Create newsletter drafts</li>
            <li><strong className="text-foreground">DynoClux</strong> — Privacy enforcement, inbox scanning, CAN-SPAM compliance</li>
            <li><strong className="text-foreground">DynoSist</strong> — Gmail draft creation with attachments</li>
            <li><strong className="text-foreground">AgentMail</strong> — Dedicated agent email inbox</li>
            <li><strong className="text-foreground">Image/Video Gen</strong> — Generate images via Gemini and videos via Veo</li>
            <li><strong className="text-foreground">GitHub</strong> — Read code, create branches, open PRs</li>
            <li><strong className="text-foreground">HubSpot / Zoho</strong> — CRM integration</li>
            <li><strong className="text-foreground">Web Tools</strong> — Web crawling and PDF extraction</li>
            <li><strong className="text-foreground">Twitter Research</strong> — Search and analyze tweets</li>
            <li><strong className="text-foreground">Carousel Gen</strong> — HTML-to-PNG carousel images</li>
          </ul>
          <p>
            Each plugin requires its own API keys, configured during deploy or on the API Keys page.
          </p>
        </div>
      </Section>

      <Section id="skills" title="Skills">
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Skills are scheduled tasks that your AI teammate runs automatically.
            Configure cron schedules during deploy or from the Skills page.
          </p>
          <h3 className="text-base font-semibold text-foreground">Examples</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-foreground">Daily Briefing</strong> — Morning news across tech, health IT, Africa, and fintech</li>
            <li><strong className="text-foreground">Content Engine</strong> — Weekly content calendar from trending topics</li>
            <li><strong className="text-foreground">Daily Posts</strong> — Draft social media posts from your calendar</li>
            <li><strong className="text-foreground">Newsletter Writer</strong> — Weekly newsletter drafts for Beehiiv</li>
            <li><strong className="text-foreground">DynoClux Scan</strong> — Daily inbox scan + privacy enforcement</li>
            <li><strong className="text-foreground">Comic Brief</strong> — Visual daily briefing as a comic strip</li>
          </ul>
        </div>
      </Section>

      <Section id="api-keys" title="API Keys">
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            API keys are stored securely in GCP Secret Manager. For managed hosting, keys are
            in DynoClaw&apos;s GCP project (isolated per customer). For self-hosted, keys are in
            your own GCP project.
          </p>
          <h3 className="text-base font-semibold text-foreground">Required Keys</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-foreground">Telegram Bot Token</strong> — Your bot&apos;s identity on Telegram (from @BotFather)</li>
            <li><strong className="text-foreground">OpenRouter API Key</strong> — Powers the AI models</li>
          </ul>
          <h3 className="text-base font-semibold text-foreground">Recommended Keys</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Google AI (Gemini) API Key — For image generation and Gemini models</li>
            <li>Brave Search API Key — For web search capability</li>
            <li>Anthropic API Key — For Claude models directly</li>
          </ul>
          <h3 className="text-base font-semibold text-foreground">Plugin-Specific Keys</h3>
          <p>
            Each plugin may require additional keys (Postiz, Beehiiv, Twitter, GitHub, HubSpot, etc.).
            The deploy wizard shows which keys are needed based on your selected plugins.
          </p>
        </div>
      </Section>

      <Section id="billing" title="Billing">
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>DynoClaw offers four plans:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-foreground">Starter ($79/mo)</strong> — Managed hosting, e2-medium VM, 5 plugins, 3 skills</li>
            <li><strong className="text-foreground">Pro ($199/mo)</strong> — Managed hosting, e2-standard-2 VM, unlimited plugins & skills</li>
            <li><strong className="text-foreground">Enterprise ($399/mo)</strong> — Self-hosted in your GCP project, dedicated support, SLA</li>
            <li><strong className="text-foreground">Launchpad ($999 one-time)</strong> — Done-for-you setup, configuration, and onboarding</li>
          </ul>
          <p>
            All subscription plans include a 14-day free trial. Manage your subscription from the
            Billing page. You can upgrade, downgrade, or cancel at any time.
          </p>
          <p>
            <strong className="text-foreground">Managed plans:</strong> Infrastructure cost is included in your subscription.
          </p>
          <p>
            <strong className="text-foreground">Self-hosted plans:</strong> GCP infrastructure costs (~$15-35/mo) are billed directly
            by Google to your GCP project. DynoClaw pricing covers the platform, plugins, and support.
          </p>
        </div>
      </Section>

      <Section id="faq" title="Frequently Asked Questions">
        <div>
          <FAQ q="What happens when my free trial ends?">
            You&apos;ll be prompted to choose a plan. For managed hosting, if you don&apos;t subscribe,
            your VM will be stopped and dashboard access paused. For self-hosted, your GCP resources
            continue running but dashboard access is paused. Subscribe at any time to resume.
          </FAQ>

          <FAQ q="Do I need a GCP account?">
            Not for managed plans (Starter & Pro) — we handle the infrastructure. For the Enterprise
            plan (self-hosted), you need a GCP project with billing enabled.
          </FAQ>

          <FAQ q="What AI models are supported?">
            DynoClaw supports any model available through OpenRouter, including Claude, GPT-4,
            Gemini, Llama, and more. You can set primary and fallback models in your deployment config.
          </FAQ>

          <FAQ q="Is my data secure?">
            Yes. Every deployment runs on an isolated VM. API keys are encrypted in GCP Secret Manager
            (AES-256). We don&apos;t access your conversations or store your API keys on our servers.
            See our <a href="/security" className="text-primary hover:underline">Security page</a> for details.
          </FAQ>

          <FAQ q="Can I cancel at any time?">
            Yes. Cancel from the Billing page. Managed plans: your VM stops at the end of the billing
            period. Self-hosted: your GCP resources continue running, only dashboard access is paused.
          </FAQ>

          <FAQ q="How do I get support?">
            Starter: community support. Pro: priority email support. Enterprise: dedicated support channel.
            Contact us at hello@dynoclaw.com.
          </FAQ>

          <FAQ q="What about HIPAA compliance?">
            Enterprise customers can deploy to their own GCP project with HIPAA BAA from Google Cloud.
            DynoClaw as a company does not yet hold independent SOC 2 certification — use self-hosted
            for compliance-sensitive workloads.
          </FAQ>
        </div>
      </Section>
    </article>
  );
}
