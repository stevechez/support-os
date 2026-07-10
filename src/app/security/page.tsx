import type { Metadata } from "next";
import { Database, FileClock, KeyRound, Lock, ShieldCheck, Webhook } from "lucide-react";

import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = {
  title: "Security & Trust — SupportOS",
  description:
    "How SupportOS isolates your data, verifies access, and keeps AI actions under human control.",
};

const pillars = [
  {
    icon: Database,
    title: "Every workspace is isolated at the database layer",
    body: "SupportOS runs on Postgres with row-level security (RLS) enabled on every table. Each policy scopes reads and writes to the requesting user's organization — there is no query path, including ours, that can return another workspace's data. This isn't an application-layer check that a bug could bypass; it's enforced by the database itself on every request.",
  },
  {
    icon: Lock,
    title: "Encryption in transit and at rest",
    body: "All traffic to SupportOS is served over TLS. Data at rest is encrypted by our infrastructure provider (Supabase, running on managed Postgres with disk-level encryption). Secrets such as webhook signing keys and channel tokens are never displayed in full after creation.",
  },
  {
    icon: KeyRound,
    title: "Two-factor authentication",
    body: "Every SupportOS account can enable TOTP-based two-factor authentication. When enabled, sign-in requires a second factor before reaching the app — enforced server-side on every session, not just at the login form.",
  },
  {
    icon: FileClock,
    title: "Complete audit history",
    body: "Every automated action, rule execution, and status change is written to an append-only activity log tied to the ticket and the actor (AI or human) that performed it. Nothing an automation does happens silently.",
  },
  {
    icon: Webhook,
    title: "AI actions always require human approval",
    body: "SupportOS's AI can draft a refund, cancellation, or account change — but it cannot execute one. Every AI-proposed action lands in an approval queue and only reaches your systems, via a signed outbound webhook, after a human on your team explicitly approves it.",
  },
  {
    icon: ShieldCheck,
    title: "Bring your own AI keys",
    body: "You connect your own Anthropic, OpenAI, or Google API keys. Your conversation data is sent directly to the provider you chose, under that provider's own data-handling terms — SupportOS does not proxy your data through a shared AI backend or use it to train models.",
  },
];

export default function SecurityPage() {
  return (
    <MarketingShell>
      <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">
        Security &amp; trust
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        Customer support data is sensitive — order details, account information, and
        conversation history. Here&apos;s specifically how SupportOS protects it.
      </p>

      <div className="mt-12 space-y-10">
        {pillars.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-foreground">
              <Icon className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-2xl border bg-card/50 p-6">
        <h2 className="font-semibold">Tested, not just designed</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Our workspace isolation has been adversarially tested against direct
          read-by-ID access, broad table scans, unscoped queries, cross-tenant
          updates, cross-tenant deletes, and role-escalation attempts — all blocked
          by RLS with zero data leaked and zero unauthorized writes.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border bg-card/50 p-6">
        <h2 className="font-semibold">Questions or a security review?</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          If your team needs a security questionnaire completed or wants to talk
          through our architecture before rolling out SupportOS, reach out and
          we&apos;ll work through it directly.
        </p>
      </div>
    </MarketingShell>
  );
}
