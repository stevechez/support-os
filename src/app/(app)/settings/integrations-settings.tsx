"use client";

import { useActionState, useState, useTransition } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Mail,
  MessageSquare,
  Package,
  RefreshCw,
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
  regenerateOrderSyncToken,
  saveEmailFrom,
  saveSlackWebhook,
  toggleChatWidget,
  toggleInboundEmail,
  toggleOrderSync,
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
  inboundEmail,
  orderSync,
  slackWebhookUrl,
  emailFromAddress,
  resendConfigured,
  serviceRoleConfigured,
}: {
  chatWidget: { enabled?: boolean; token?: string };
  inboundEmail: { enabled?: boolean; token?: string };
  orderSync: { enabled?: boolean; token?: string };
  slackWebhookUrl: string;
  emailFromAddress: string;
  resendConfigured: boolean;
  serviceRoleConfigured: boolean;
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

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const chatEnabled = chatWidget.enabled === true;
  const emailEnabled = inboundEmail.enabled === true;
  const orderSyncEnabled = orderSync.enabled === true;

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
