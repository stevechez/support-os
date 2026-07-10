"use client";

import { useActionState, useState, useTransition } from "react";
import {
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  Mail,
  MessageSquare,
  MessageSquareText,
  Package,
  Phone,
  RefreshCw,
  Sparkles,
  Wand2,
  Webhook,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  regenerateChatToken,
  regenerateHelpCenterToken,
  regenerateOrderSyncToken,
  regenerateSmsToken,
  regenerateVoiceToken,
  saveActionWebhook,
  saveEmailFrom,
  saveSlackWebhook,
  saveSmsFromNumber,
  toggleChatWidget,
  toggleHelpCenter,
  toggleInboundEmail,
  toggleOrderSync,
  toggleProactiveSupport,
  toggleSms,
  toggleVoice,
} from "./actions";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 shrink-0"
      title="Copy"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-400" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </Button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="flex items-start gap-1 rounded-lg border bg-muted/50 p-3">
      <pre className="flex-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-muted-foreground">
        {code}
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-emerald-500" : "bg-muted"
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function IntegrationsSettings({
  chatWidget,
  helpCenter,
  inboundEmail,
  orderSync,
  proactiveSupport,
  voice,
  sms,
  actionWebhookUrl,
  actionWebhookSecret,
  slackWebhookUrl,
  emailFromAddress,
  resendConfigured,
  serviceRoleConfigured,
  smsConfigured,
}: {
  chatWidget: { enabled?: boolean; token?: string };
  helpCenter: { enabled?: boolean; token?: string };
  inboundEmail: { enabled?: boolean; token?: string };
  orderSync: { enabled?: boolean; token?: string };
  proactiveSupport: { enabled?: boolean };
  voice: { enabled?: boolean; token?: string };
  sms: { enabled?: boolean; token?: string; from_number?: string };
  actionWebhookUrl: string;
  actionWebhookSecret: string;
  slackWebhookUrl: string;
  emailFromAddress: string;
  resendConfigured: boolean;
  serviceRoleConfigured: boolean;
  smsConfigured: boolean;
}) {
  const [, startTransition] = useTransition();
  const [slackState, slackAction, slackPending] = useActionState(
    saveSlackWebhook,
    {}
  );
  const [fromState, fromAction, fromPending] = useActionState(
    saveEmailFrom,
    {}
  );
  const [actionWebhookState, actionWebhookAction, actionWebhookPending] =
    useActionState(saveActionWebhook, {});

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const chatEnabled = chatWidget.enabled === true;
  const helpCenterEnabled = helpCenter.enabled === true;
  const emailEnabled = inboundEmail.enabled === true;
  const orderSyncEnabled = orderSync.enabled === true;
  const proactiveEnabled = proactiveSupport.enabled === true;
  const voiceEnabled = voice.enabled === true;
  const smsEnabled = sms.enabled === true;

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold text-muted-foreground">
        Integrations
      </h2>

      {!serviceRoleConfigured && (
        <p className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-400">
          Public channels (chat widget, inbound email) need{" "}
          <code className="rounded bg-muted px-1">
            SUPABASE_SERVICE_ROLE_KEY
          </code>{" "}
          in .env.local — copy it from your Supabase dashboard under Project
          Settings → API keys.
        </p>
      )}

      {/* Chat widget */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="size-4" />
              <div>
                <CardTitle className="text-base">Web chat widget</CardTitle>
                <CardDescription>
                  A floating chat bubble for your website. Conversations land
                  in the Inbox; automations and AI auto-replies apply.
                </CardDescription>
              </div>
            </div>
            <Toggle
              checked={chatEnabled}
              onChange={(v) =>
                startTransition(() => toggleChatWidget(v, chatWidget.token))
              }
            />
          </div>
        </CardHeader>
        {chatEnabled && chatWidget.token && (
          <CardContent className="space-y-3">
            <Label>Embed on your site</Label>
            <CodeBlock
              code={`<script src="${origin}/widget.js" data-token="${chatWidget.token}" async></script>`}
            />
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <a
                  href={`/widget?token=${chatWidget.token}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="size-3.5" /> Preview
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => startTransition(() => regenerateChatToken())}
              >
                <RefreshCw className="size-3.5" /> Regenerate token
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Public help center */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BookOpen className="size-4" />
              <div>
                <CardTitle className="text-base">Public help center</CardTitle>
                <CardDescription>
                  A self-serve page where customers can search your help
                  articles before ever opening a ticket. Only knowledge base
                  documents marked &quot;Help center&quot; are shown — mark
                  them from the Knowledge Base page.
                </CardDescription>
              </div>
            </div>
            <Toggle
              checked={helpCenterEnabled}
              onChange={(v) =>
                startTransition(() => toggleHelpCenter(v, helpCenter.token))
              }
            />
          </div>
        </CardHeader>
        {helpCenterEnabled && helpCenter.token && (
          <CardContent className="space-y-3">
            <Label>Public URL</Label>
            <CodeBlock code={`${origin}/help?org=${helpCenter.token}`} />
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <a
                  href={`/help?org=${helpCenter.token}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="size-3.5" /> Preview
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() =>
                  startTransition(() => regenerateHelpCenterToken())
                }
              >
                <RefreshCw className="size-3.5" /> Regenerate link
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Inbound email */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Mail className="size-4" />
              <div>
                <CardTitle className="text-base">Inbound email</CardTitle>
                <CardDescription>
                  Turn emails into tickets. Point your provider&apos;s
                  inbound webhook (Resend, Postmark, SendGrid) at this
                  endpoint.
                </CardDescription>
              </div>
            </div>
            <Toggle
              checked={emailEnabled}
              onChange={(v) =>
                startTransition(() =>
                  toggleInboundEmail(v, inboundEmail.token)
                )
              }
            />
          </div>
        </CardHeader>
        {emailEnabled && inboundEmail.token && (
          <CardContent className="space-y-3">
            <Label>Webhook endpoint</Label>
            <CodeBlock
              code={`${origin}/api/channels/email?token=${inboundEmail.token}`}
            />
            <Label>Expected payload</Label>
            <CodeBlock
              code={`{ "from": "customer@email.com", "name": "Jane", "subject": "Help!", "text": "Message body" }`}
            />
          </CardContent>
        )}
      </Card>

      {/* Order sync */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Package className="size-4" />
              <div>
                <CardTitle className="text-base">Order sync</CardTitle>
                <CardDescription>
                  Point your store or CRM&apos;s order webhook here to ground
                  AI replies in real order status — the AI won&apos;t answer
                  order questions it can&apos;t verify.
                </CardDescription>
              </div>
            </div>
            <Toggle
              checked={orderSyncEnabled}
              onChange={(v) =>
                startTransition(() => toggleOrderSync(v, orderSync.token))
              }
            />
          </div>
        </CardHeader>
        {orderSyncEnabled && orderSync.token && (
          <CardContent className="space-y-3">
            <Label>Webhook endpoint</Label>
            <CodeBlock
              code={`${origin}/api/integrations/orders/webhook?token=${orderSync.token}`}
            />
            <Label>Expected payload</Label>
            <CodeBlock
              code={`{
  "customerEmail": "jane@email.com",
  "customerName": "Jane Doe",
  "orderNumber": "4471",
  "status": "shipped",
  "description": "2x Wireless Mouse",
  "total": 49.98,
  "trackingNumber": "1Z999AA1",
  "trackingUrl": "https://…",
  "orderedAt": "2026-07-01T00:00:00Z",
  "expectedDelivery": "2026-07-10T00:00:00Z"
}`}
            />
            <p className="text-xs text-muted-foreground">
              Safe to resend the same order — it upserts on order number, so
              status-update webhooks just update the existing record.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => startTransition(() => regenerateOrderSyncToken())}
            >
              <RefreshCw className="size-3.5" /> Regenerate token
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Voice */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Phone className="size-4" />
              <div>
                <CardTitle className="text-base">Voice (phone support)</CardTitle>
                <CardDescription>
                  Answer calls with AI — the same grounded replies and
                  business-rule guardrails as chat and email, spoken aloud.
                  Risky requests hand off to a human instead of guessing.
                </CardDescription>
              </div>
            </div>
            <Toggle
              checked={voiceEnabled}
              onChange={(v) => startTransition(() => toggleVoice(v, voice.token))}
            />
          </div>
        </CardHeader>
        {voiceEnabled && voice.token && (
          <CardContent className="space-y-3">
            <Label>Twilio &quot;A call comes in&quot; webhook</Label>
            <CodeBlock
              code={`${origin}/api/channels/voice?token=${voice.token}`}
            />
            <p className="text-xs text-muted-foreground">
              In your Twilio Console, open your phone number&apos;s
              configuration and set this as the webhook for &quot;A call
              comes in&quot; (HTTP POST). Optionally set{" "}
              <code className="rounded bg-muted px-1">TWILIO_AUTH_TOKEN</code>{" "}
              in your environment to verify requests actually came from
              Twilio.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => startTransition(() => regenerateVoiceToken())}
            >
              <RefreshCw className="size-3.5" /> Regenerate token
            </Button>
          </CardContent>
        )}
      </Card>

      {/* SMS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MessageSquareText className="size-4" />
              <div>
                <CardTitle className="text-base">SMS (text messaging)</CardTitle>
                <CardDescription>
                  Two-way texting — customers text your number, AI replies
                  through the same grounded, rule-gated pipeline as every
                  other channel. Also powers the &quot;Send SMS&quot;
                  automation step.
                  {!smsConfigured &&
                    " Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env.local to send real messages — outbound is simulated (logged only) until then."}
                </CardDescription>
              </div>
            </div>
            <Toggle
              checked={smsEnabled}
              onChange={(v) =>
                startTransition(() => toggleSms(v, sms.token, sms.from_number))
              }
            />
          </div>
        </CardHeader>
        {smsEnabled && sms.token && (
          <CardContent className="space-y-3">
            <form
              action={async (formData) => {
                const num = (formData.get("from_number") as string) ?? "";
                startTransition(() => saveSmsFromNumber(num, sms.token));
              }}
              className="flex items-end gap-2"
            >
              <div className="flex-1 space-y-2">
                <Label htmlFor="sms_from_number">Sending number</Label>
                <Input
                  id="sms_from_number"
                  name="from_number"
                  defaultValue={sms.from_number ?? ""}
                  placeholder="+15551234567"
                />
              </div>
              <Button type="submit">Save</Button>
            </form>

            <Label>Twilio &quot;A message comes in&quot; webhook</Label>
            <CodeBlock code={`${origin}/api/channels/sms?token=${sms.token}`} />
            <p className="text-xs text-muted-foreground">
              In your Twilio Console, open this number&apos;s messaging
              configuration and set this as the webhook for &quot;A message
              comes in&quot; (HTTP POST).
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() =>
                startTransition(() => regenerateSmsToken(sms.from_number))
              }
            >
              <RefreshCw className="size-3.5" /> Regenerate token
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Proactive support */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="size-4" />
              <div>
                <CardTitle className="text-base">Proactive support</CardTitle>
                <CardDescription>
                  Reach out to customers before they file a ticket — when an
                  order runs past its expected delivery date, AI sends a
                  heads-up automatically. Requires order sync above.
                </CardDescription>
              </div>
            </div>
            <Toggle
              checked={proactiveEnabled}
              disabled={!orderSyncEnabled}
              onChange={(v) => startTransition(() => toggleProactiveSupport(v))}
            />
          </div>
        </CardHeader>
        {!orderSyncEnabled && (
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Turn on order sync first — proactive alerts are driven by order
              status and delivery dates.
            </p>
          </CardContent>
        )}
        {proactiveEnabled && orderSyncEnabled && (
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Checked every minute. Each order gets at most one proactive
              alert — a ticket is opened and, if the customer has an email on
              file, they&apos;re notified directly.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Action fulfillment webhook */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Wand2 className="size-4" />
            <div>
              <CardTitle className="text-base">Action fulfillment</CardTitle>
              <CardDescription>
                When you approve an AI-requested action (refund, cancel
                order, update shipping) in Actions, SupportOS sends it here
                as a signed webhook — point it at whatever actually
                processes it (Shopify, Stripe, an internal tool). SupportOS
                never executes these itself.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={actionWebhookAction} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="action_webhook_url">Webhook URL</Label>
              <Input
                id="action_webhook_url"
                name="url"
                type="url"
                defaultValue={actionWebhookUrl}
                placeholder="https://your-system.example.com/hooks/support-actions"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action_webhook_secret">
                Signing secret (optional)
              </Label>
              <Input
                id="action_webhook_secret"
                name="secret"
                defaultValue={actionWebhookSecret}
                placeholder="Used to sign requests via X-SupportOS-Signature (HMAC-SHA256)"
              />
            </div>
            <Button type="submit" disabled={actionWebhookPending}>
              {actionWebhookPending ? "Saving…" : "Save"}
            </Button>
          </form>
          {actionWebhookState.error && (
            <p className="mt-2 text-sm text-destructive">
              {actionWebhookState.error}
            </p>
          )}
          {actionWebhookState.success && (
            <p className="mt-2 text-sm text-emerald-400">
              {actionWebhookState.success}
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Without this configured, approving an action request will fail
            delivery — it&apos;ll still be recorded, just marked as failed
            until fulfillment is wired up.
          </p>
        </CardContent>
      </Card>

      {/* Outbound email */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Mail className="size-4" />
            <div>
              <CardTitle className="text-base">Outbound email</CardTitle>
              <CardDescription>
                Replies on email tickets are delivered to the customer via
                Resend — including AI auto-replies.
                {!resendConfigured &&
                  " Set RESEND_API_KEY in .env.local to enable."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={fromAction} className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="from_address">Sender address</Label>
              <Input
                id="from_address"
                name="from_address"
                defaultValue={emailFromAddress}
                placeholder="Support <help@yourdomain.com>"
              />
            </div>
            <Button type="submit" disabled={fromPending}>
              {fromPending ? "Saving…" : "Save"}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            The domain must be verified in your Resend account. Left empty,
            Resend&apos;s test sender is used (delivers only to your own
            address).
          </p>
          {fromState.error && (
            <p className="mt-2 text-sm text-destructive">{fromState.error}</p>
          )}
          {fromState.success && (
            <p className="mt-2 text-sm text-emerald-400">
              {fromState.success}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Slack */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Webhook className="size-4" />
            <div>
              <CardTitle className="text-base">Slack notifications</CardTitle>
              <CardDescription>
                Used by the “Send to Slack” automation step. Create an
                incoming webhook in Slack and paste it here.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={slackAction} className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="webhook_url">Incoming webhook URL</Label>
              <Input
                id="webhook_url"
                name="webhook_url"
                type="url"
                defaultValue={slackWebhookUrl}
                placeholder="https://hooks.slack.com/services/…"
              />
            </div>
            <Button type="submit" disabled={slackPending}>
              {slackPending ? "Saving…" : "Save"}
            </Button>
          </form>
          {slackState.error && (
            <p className="mt-2 text-sm text-destructive">{slackState.error}</p>
          )}
          {slackState.success && (
            <p className="mt-2 text-sm text-emerald-400">
              {slackState.success}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
