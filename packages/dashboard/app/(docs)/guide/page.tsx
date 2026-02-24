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
            DynoClaw deploys a fully configured AI agent into your own Google Cloud project.
            The agent runs 24/7, equipped with plugins for social media, newsletters, research, and more.
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Sign up for a DynoClaw account</li>
            <li>Connect your Google Cloud project (OAuth)</li>
            <li>Configure your agent&apos;s personality, plugins, and skills</li>
            <li>Deploy with one click</li>
          </ol>
          <p>
            Your 14-day free trial starts when you sign up. No credit card required.
          </p>
        </div>
      </Section>

      <Section id="gcp-setup" title="GCP Setup">
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            DynoClaw needs access to your GCP project to create a VM and manage secrets.
            When you sign in with Google, grant the <code className="rounded bg-card px-1.5 py-0.5 text-xs">cloud-platform</code> scope.
          </p>
          <h3 className="text-base font-semibold text-foreground">Requirements</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>A GCP project with billing enabled</li>
            <li>Compute Engine API enabled</li>
            <li>Secret Manager API enabled</li>
            <li>Owner or Editor role on the project</li>
          </ul>
          <h3 className="text-base font-semibold text-foreground">What Gets Created</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>An <code className="rounded bg-card px-1.5 py-0.5 text-xs">e2-small</code> VM (~$12/mo)</li>
            <li>Secrets in GCP Secret Manager for API keys</li>
            <li>A firewall rule for health checks</li>
          </ul>
        </div>
      </Section>

      <Section id="plugins" title="Plugins">
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Plugins extend your AI teammate with new capabilities. Enable them from the Plugins page in your dashboard.
          </p>
          <h3 className="text-base font-semibold text-foreground">Available Plugins</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-foreground">Postiz</strong> — Post to X/Twitter, Instagram, LinkedIn, and more</li>
            <li><strong className="text-foreground">Beehiiv</strong> — Create newsletter drafts</li>
            <li><strong className="text-foreground">Twitter Research</strong> — Search and analyze tweets</li>
            <li><strong className="text-foreground">Brave Search</strong> — Web search capability</li>
            <li><strong className="text-foreground">Google Drive</strong> — Save generated media to Drive</li>
          </ul>
          <p>
            Each plugin requires its own API keys, which you configure on the API Keys page.
          </p>
        </div>
      </Section>

      <Section id="skills" title="Skills">
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Skills are scheduled tasks that your AI teammate runs automatically.
            Configure cron schedules from the Skills page.
          </p>
          <h3 className="text-base font-semibold text-foreground">Examples</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Daily content generation at 9am</li>
            <li>Weekly research reports every Monday</li>
            <li>Hourly social media monitoring</li>
          </ul>
          <p>
            Skills use cron syntax. You can override the default schedule for each skill.
          </p>
        </div>
      </Section>

      <Section id="api-keys" title="API Keys">
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            API keys are stored securely in GCP Secret Manager within your own project.
            DynoClaw never stores your keys on our servers.
          </p>
          <h3 className="text-base font-semibold text-foreground">Required Keys</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-foreground">OpenRouter API Key</strong> — Powers the AI models</li>
            <li><strong className="text-foreground">Google API Key</strong> — For Gemini and other Google services</li>
          </ul>
          <h3 className="text-base font-semibold text-foreground">Optional Keys</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Postiz API Key</li>
            <li>Beehiiv API Key</li>
            <li>Brave Search API Key</li>
            <li>Twitter Bearer Token</li>
          </ul>
        </div>
      </Section>

      <Section id="billing" title="Billing">
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            DynoClaw offers three plans: Starter ($49/mo), Pro ($149/mo), and Enterprise (custom).
            All plans include a 14-day free trial.
          </p>
          <p>
            Manage your subscription from the Billing page in your dashboard.
            You can upgrade, downgrade, or cancel at any time through the Stripe customer portal.
          </p>
          <p>
            Note: GCP infrastructure costs (VM, secrets, network) are billed directly by Google to your GCP project.
            DynoClaw pricing covers the platform, plugins, and support.
          </p>
        </div>
      </Section>

      <Section id="faq" title="Frequently Asked Questions">
        <div>
          <FAQ q="What happens when my free trial ends?">
            You&apos;ll be prompted to choose a plan. If you don&apos;t subscribe, your dashboard
            access will be paused but your GCP resources will keep running. You can subscribe
            at any time to regain access.
          </FAQ>

          <FAQ q="Can I use my own GCP project?">
            Yes — DynoClaw deploys directly into your GCP project. You maintain full ownership
            and control of all resources. We never access your project without your OAuth consent.
          </FAQ>

          <FAQ q="What AI models are supported?">
            DynoClaw supports any model available through OpenRouter, including Claude, GPT-4,
            Gemini, Llama, and more. You can set primary and fallback models in your deployment config.
          </FAQ>

          <FAQ q="Is my data secure?">
            All API keys are stored in GCP Secret Manager within your own project. DynoClaw uses
            Clerk for authentication and never stores sensitive credentials on our infrastructure.
            All publishing actions default to draft mode.
          </FAQ>

          <FAQ q="Can I cancel at any time?">
            Yes. You can cancel your subscription from the Billing page. Your access continues
            until the end of the current billing period.
          </FAQ>

          <FAQ q="How do I get support?">
            Starter plans get community support. Pro plans get priority email support.
            Enterprise plans get a dedicated support channel. Contact us at hello@dynoclaw.com.
          </FAQ>
        </div>
      </Section>
    </article>
  );
}
