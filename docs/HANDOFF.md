# SupportOS — Handoff (as of 2026-07-05)

Live deployment: https://support-os-five.vercel.app
Repo: github.com/stevechez/support-os (main branch, deploys via Vercel git integration)
Database: Supabase project `support-os` (sitflprwcjzeyykxffhw)

This doc is a snapshot of exactly where the product stands: what's built, what's been proven working against the live deployment (not just unit tests), what's still soft, and what stands between here and letting real people into a beta.

## 1. What the product is

SupportOS is an AI-native helpdesk: one inbox pulling in email, an embeddable chat widget, and Slack alerts; a knowledge base that embeds uploaded docs/URLs/text for retrieval-grounded AI replies; visual automations that classify, draft, or auto-resolve tickets; per-workspace AI agent personas; CSAT surveys; analytics; and standard SaaS scaffolding (org-based multi-tenancy, roles, billing, audit log, 2FA, data export).

Positioning: "the calm inbox for AI-powered customer operations" — wedge against Zendesk/Intercom for small teams who want AI resolution as a first-class feature, not a bolt-on.

## 2. Feature status

### Fully built and proven working end-to-end (live deployment, not just unit tests)

These were walked manually against production this week — real HTTP calls, real Resend delivery, real Slack webhook, verified via direct database inspection at each step:

- **Inbound email**: webhook creates a ticket + customer; a reply threads onto the same ticket via a `[#ref]` token stamped on every outbound subject, with a same-customer/same-subject fallback for clients that strip the token. A reply to a resolved ticket reopens it.
- **Chat widget**: start → poll → reply → CSAT rating, all via the public token-authenticated API (`/api/channels/chat`).
- **AI auto-resolve**: automations can classify a ticket (sentiment/intent/priority/tags), draft or send an AI reply, and optionally auto-resolve — confirmed working with a real AI provider call.
- **CSAT loop**: fires automatically on any resolve (manual or automation-driven), email channel gets a "how did we do?" email with 1–5 links to a public `/rate/[token]` page, chat channel rates inline in the widget. Dashboard/Analytics CSAT numbers update from real ratings.
- **Slack notifications**: `slack_notify` automation step posts to a real incoming webhook — confirmed multiple times in an actual Slack channel.
- **Outbound email delivery**: works via Resend with a verified custom domain (`buildrailhq.com` — see §4 for the setup story and what to watch for).
- **RLS + roles**: org-level isolation and viewer/agent/admin/owner hierarchy enforced at the database level (not just app code) as of the `rls_role_hardening` migration.
- **Durable background jobs**: knowledge indexing goes through a `jobs` table + `claim_jobs` RPC, with a pg_cron sweep hitting `/api/jobs/process` every minute for retries — survives serverless timeouts, not just `after()` fire-and-forget.
- **2FA (TOTP)**: enroll/verify/unenroll in Settings, login challenge flow (`/login/mfa`), enforced both at login and as a layout-level safety net.
- **Data export**: admin/owner-only JSON dump of customers/tickets/messages/knowledge docs/members via `/api/export`.

### Built, unit-tested, but not walked live this round

- Knowledge base upload/indexing (PDF/DOCX/MD/URL/text → chunk → embed → store) — code path is solid and covered by chunking unit tests, but wasn't part of this week's channel walk. Worth a manual pass: upload a real PDF, confirm it goes `indexing` → `ready` and that AI replies actually cite it.
- AI Copilot panel in the inbox (summarize, suggest reply, sentiment, translate) — built, not re-verified this round.
- Stripe billing (`/api/stripe/webhook`, plan gating) — code exists but **Stripe isn't configured** (see §4). Free-tier gating (member/AI-action/doc limits) should still work since that's independent of Stripe.
- Agent personas (custom system prompts/models per automation step) — built, not exercised in this test round.
- Automations builder UI — used programmatically (direct SQL) for this test round rather than through the UI; worth clicking through the builder once to confirm the UI writes the same shape of `trigger`/`steps` JSON the engine expects.

### Known bug (found this round, not yet fixed)

`sendCsatSurvey` (`src/lib/csat.ts`) sets `csat_sent_at` **before** confirming the Resend call succeeded. If the email send fails, the ticket is permanently marked "survey sent" and will never retry — this is exactly the bug class the E2E walk was designed to catch, and it did: we saw it during testing when the Resend key was briefly misconfigured. Low urgency (doesn't affect the AI-reply failure path, which does surface correctly as an internal note), but worth fixing before relying on CSAT data being complete — e.g. only set `csat_sent_at` on success, or add a `csat_send_error` column and a retry sweep.

## 3. Infrastructure / config status

| Item | Status |
|---|---|
| Vercel deploy | Live, auto-deploys from `main` |
| Supabase | Live, all migrations applied (`durable_jobs`, `rls_role_hardening`, `csat_columns`, `email_threading_ref`, etc.) |
| Resend (email) | **Working** — `buildrailhq.com` verified (DKIM + SPF + MX), `EMAIL_FROM` and `RESEND_API_KEY` set correctly on Vercel as of this session |
| AI provider | Only `OPENAI_API_KEY` is set (Anthropic and Google keys blank). Works fine single-provider, but no fallback if OpenAI has an outage |
| Slack | Real incoming webhook wired into Settings for the test org |
| pg_cron job sweep | Confirmed scheduled (`supportos-process-jobs`, every minute) hitting `/api/jobs/process` with `JOBS_SECRET` |
| Stripe | **Not configured** — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO` all blank. Pro plan can't actually be purchased yet; Free-tier limits should still enforce |
| Sentry | **Not configured** — `NEXT_PUBLIC_SENTRY_DSN` blank, so no production error monitoring right now |
| CI | `.github/workflows/ci.yml` runs lint + typecheck + unit tests on every push/PR to `main`. A Playwright e2e job exists but is gated behind an `E2E_ENABLED` repo variable that isn't set — so e2e tests aren't running in CI yet, even though the test file (`e2e/critical-path.spec.ts`) exists and covers login/onboarding/inbox/reply/escalate |
| Unit tests | 6 test files covering roles, email threading, automation matching, chunking, billing plans — good coverage of the risky pure-logic pieces |
| `scripts/e2e-channels.sh` | New this session — a repeatable script that walks inbound email, threading, chat, AI auto-resolve, CSAT, and Slack against a live deployment. Re-run this after any change to the channel/automation/CSAT code before shipping |

Test org used for the E2E walk (`chez-plnh`, org id `709d4b32-78ba-4cb4-a838-61f8a10a3b5a`) has been cleaned back to a fresh state: 0 tickets, 0 automations, 0 knowledge docs, just the 4 seeded demo customers from onboarding.

## 4. The Resend/domain story (context for future you)

Early in this session, outbound email was silently failing in production (`RESEND_API_KEY not configured`) even though it was set locally — env vars don't sync from `.env.local` to Vercel automatically. After adding the key on Vercel, a second failure appeared (`API key is invalid` — likely a copy-paste issue), which was fixed by regenerating the key in Resend and re-pasting carefully. Separately, the sender address started on Resend's shared test sender (`onboarding@resend.dev`), which **only delivers to the Resend account's own verified email** — fine for testing with your own inbox, but real customers wouldn't have received anything. `buildrailhq.com` (a domain from another Resend account of yours) was transferred over and verified with DKIM + SPF + MX records, and `EMAIL_FROM` now points at `support@buildrailhq.com`. If email delivery ever silently breaks again, check in this order: is `RESEND_API_KEY` still valid (Resend keys can be revoked/rotated), is the domain still verified in Resend, and is `EMAIL_FROM` still pointing at a verified address.

## 5. Prioritized punch list for public beta

Roughly in order of what would actually bite you first:

1. **Fix the CSAT send-tracking bug** (§2) — small fix, protects data integrity of your key differentiator metric.
2. **Set up Sentry** — you have zero visibility into production errors right now. This is the cheapest, highest-leverage thing left undone.
3. **Decide on Stripe** — if beta is free-only for now, fine to defer. If you want to charge anyone during beta, this needs real keys and a test purchase end to end.
4. **Terms of Service / Privacy Policy** — not addressed anywhere in this project. You're handling customer PII across multiple tenants (emails, names, ticket content); you need at minimum a privacy policy before real customer data flows through, especially once you're not the only person feeding it data.
5. **Manually verify the knowledge base path once** — upload a real PDF to the test org, confirm indexing completes and an AI reply actually cites it. This is the one major feature area this session's testing didn't touch.
6. **Multi-tenant security spot-check** — create a second org, try reading/writing across org boundaries as each role. The RLS hardening migration should block this, but it hasn't been adversarially tested since it landed.
7. **Enable the e2e CI job** — set the `E2E_ENABLED` repo variable and the `E2E_EMAIL`/`E2E_PASSWORD`/Supabase secrets so `e2e/critical-path.spec.ts` actually runs on every PR instead of sitting dormant.
8. **Recruit 5–10 real beta users**, not just yourself — real ticket volume, real knowledge base content, real customers. Watch AI auto-resolve accuracy (are customers reopening tickets the AI marked resolved?) and time-to-first-response versus whatever they use today. Those two numbers are your actual go/no-go signal, more than any more code changes.
9. **Build a couple of real automations through the UI** (not test-only ones) before beta users show up — right now the test org has zero automations after cleanup, so out of the box nothing will auto-resolve anything until you configure it.

## 6. Quick reference

- Re-run the full channel test any time: see `scripts/e2e-channels.sh` header comment for prereqs and usage.
- Org/database access: Supabase project `sitflprwcjzeyykxffhw`, test org `709d4b32-78ba-4cb4-a838-61f8a10a3b5a` (chez-plnh, owner stevechez@gmail.com).
- A stray git lock file issue came up a few times this session in the local dev sandbox (unrelated to your actual Mac terminal) — if `git commit` ever complains about `index.lock`/`HEAD.lock` "File exists" *in this tool's sandbox*, that's an environment quirk, not a repo problem; your own terminal on your Mac doesn't have this issue.
