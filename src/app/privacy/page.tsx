import type { Metadata } from "next";

import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = {
  title: "Privacy Policy — SupportOS",
};

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <div className="mb-10 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-200">
        <strong className="font-semibold">Draft — not legal advice.</strong> This is a
        starting template describing how SupportOS actually handles data. It has not
        been reviewed by a lawyer and should not be published as your binding privacy
        policy until qualified legal counsel reviews it for your jurisdiction (e.g.
        GDPR, CCPA) and customer obligations.
      </div>

      <h1 className="font-serif text-4xl tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: July 9, 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 font-semibold text-foreground">1. What we collect</h2>
          <p>
            Account data: your name, email, and organization membership. Customer
            Data: the tickets, customer records, messages, and knowledge base content
            your workspace stores in SupportOS on behalf of your own customers.
            Usage data: basic product analytics (pages visited, feature usage) used to
            improve the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-foreground">2. How data is isolated</h2>
          <p>
            Every workspace&apos;s data is stored in a shared database but enforced as
            isolated at the database layer via row-level security policies scoped to
            your organization. No workspace can query another workspace&apos;s data
            through the application, and this isolation has been directly tested
            against common attack patterns (see our{" "}
            <a href="/security" className="underline hover:text-foreground">
              Security page
            </a>
            ).
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-foreground">3. AI processing</h2>
          <p>
            When you connect your own AI provider key (Anthropic, OpenAI, or Google),
            relevant ticket and knowledge base content is sent directly to that
            provider to generate summaries, drafts, and classifications. That
            transmission is governed by the provider&apos;s own privacy policy and
            data-processing terms, not ours. We do not send your data to any AI
            provider you have not explicitly configured, and we do not use your data
            to train models.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-foreground">4. Subprocessors</h2>
          <p>
            We share data with the infrastructure providers necessary to run the
            Service: Supabase (database, authentication, file storage), Resend
            (transactional email delivery), Stripe (billing, if you subscribe to a
            paid plan), and Twilio (SMS and voice delivery, if you enable those
            channels). Each processes data only as needed to provide its respective
            function.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-foreground">5. Data retention and deletion</h2>
          <p>
            Customer Data is retained for as long as your account is active. You can
            delete individual records inside the product. On account closure, data is
            deleted from primary storage within [X days — to be finalized], subject to
            standard backup retention windows.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-foreground">6. Your rights</h2>
          <p>
            Depending on your jurisdiction, you and the customers whose data you
            process may have rights to access, correct, export, or delete personal
            data. Requests can be directed to [insert privacy contact email]. [Specific
            GDPR/CCPA mechanisms to be finalized with counsel.]
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-foreground">7. Security</h2>
          <p>
            All traffic is encrypted in transit (TLS). Data at rest is encrypted by our
            infrastructure provider. Two-factor authentication is available on every
            account. See our{" "}
            <a href="/security" className="underline hover:text-foreground">
              Security page
            </a>{" "}
            for details.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-foreground">8. Contact</h2>
          <p>Questions about this policy: [insert privacy contact email].</p>
        </section>
      </div>
    </MarketingShell>
  );
}
