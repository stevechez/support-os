import type { Metadata } from "next";

import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = {
  title: "Terms of Service — SupportOS",
};

export default function TermsPage() {
  return (
    <MarketingShell>
      <div className="mb-10 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-200">
        <strong className="font-semibold">Draft — not legal advice.</strong> This is a
        starting template describing how SupportOS actually works. It has not been
        reviewed by a lawyer and should not be published or relied on as a binding
        agreement until qualified legal counsel reviews it for your entity, jurisdiction,
        and customer contracts.
      </div>

      <h1 className="font-serif text-4xl tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: July 9, 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 font-semibold text-foreground">1. The service</h2>
          <p>
            SupportOS (&quot;the Service&quot;) is a customer support platform that lets
            your team manage tickets across email, chat, SMS, and voice, and that uses
            AI models you connect to draft, classify, and — with your explicit
            configuration and human approval — take limited actions on customer
            accounts. These Terms govern your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-foreground">2. Your account and data</h2>
          <p>
            You retain ownership of all data you upload or generate through the Service,
            including tickets, customer records, knowledge base content, and
            conversation history (&quot;Customer Data&quot;). You are responsible for
            having the right to upload and process that data, including any personal
            data belonging to your own customers.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-foreground">3. AI processing and your own API keys</h2>
          <p>
            SupportOS uses a &quot;bring your own key&quot; model for AI. When you
            connect an API key for Anthropic, OpenAI, or Google, requests containing
            relevant Customer Data are sent directly to that provider using your key,
            subject to that provider&apos;s own terms and data-handling policies. We do
            not operate a shared AI backend on your behalf, and we do not use your
            Customer Data to train any model.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-foreground">4. AI-proposed actions require human approval</h2>
          <p>
            Where you enable Agentic Actions (e.g. refunds, order cancellations,
            shipping updates), the Service will never execute an action against your
            systems autonomously. Every AI-proposed action is held in an approval queue
            until a member of your team explicitly approves it, at which point the
            Service delivers a signed webhook to the endpoint you configure. You are
            responsible for how your own systems handle that webhook.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-foreground">5. Subprocessors</h2>
          <p>
            We use the following categories of subprocessors to operate the Service:
            database and authentication infrastructure (Supabase), transactional email
            delivery (Resend), billing (Stripe), and voice/SMS delivery (Twilio). AI
            providers (Anthropic, OpenAI, Google) act as your subprocessors when you
            connect your own keys, not ours. An up-to-date subprocessor list should be
            maintained and linked here.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-foreground">6. Acceptable use</h2>
          <p>
            You agree not to use the Service to process data you don&apos;t have the
            right to process, to attempt to access another workspace&apos;s data, or to
            configure automations that take irreversible actions on customer accounts
            without appropriate human review.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-foreground">7. Termination</h2>
          <p>
            You may stop using the Service and export your data at any time. We may
            suspend accounts that violate these Terms or that pose a security risk to
            other workspaces.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-foreground">8. Disclaimers and liability</h2>
          <p>
            The Service is provided &quot;as is.&quot; AI-generated content can be
            incorrect; you are responsible for reviewing AI-drafted or auto-resolved
            responses according to the confidence thresholds and rules you configure.
            [Standard limitation-of-liability and warranty disclaimer language to be
            finalized with counsel.]
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-foreground">9. Contact</h2>
          <p>Questions about these Terms: [insert legal/support contact email].</p>
        </section>
      </div>
    </MarketingShell>
  );
}
