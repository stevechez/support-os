#!/usr/bin/env bash
# End-to-end channel walk for SupportOS.
#
# Exercises every inbound path (email, chat) against a live deployment,
# so you can catch integration bugs unit tests can't (Resend delivery,
# Supabase RLS, the cron-driven job/CSAT loop) before a beta cohort does.
#
# Prereqs (one-time, already done for the "chez-plnh" workspace as of
# 2026-07-05 — re-run if you rotate tokens or test a different org):
#   1. Settings > Integrations: enable Chat widget + Inbound email,
#      or seed `settings` rows directly (see CLAUDE.md / conversation history).
#   2. An automation scoped to a test marker so it never touches real
#      traffic, e.g. trigger "ticket.created", condition
#      subject_contains "e2e-test", steps: ai_classify -> ai_auto_reply
#      (resolve: true) -> slack_notify. This single automation exercises
#      AI classification, AI auto-resolve, the CSAT-on-resolve hook, and
#      Slack notification in one pass.
#   3. RESEND_API_KEY / EMAIL_FROM and an AI provider key set on the
#      deployment (Vercel env), and NEXT_PUBLIC_SITE_URL set (survey
#      email links need it).
#
# Usage:
#   BASE_URL=https://support-os-five.vercel.app \
#   EMAIL_TOKEN=... CHAT_TOKEN=... TEST_EMAIL=you@example.com \
#   ./scripts/e2e-channels.sh
#
# Run from a machine with normal internet access (not a sandboxed agent
# shell — this needs to reach the public deployment and, for the email
# leg, your real inbox).

set -euo pipefail

BASE_URL="${BASE_URL:?Set BASE_URL, e.g. https://support-os-five.vercel.app}"
EMAIL_TOKEN="${EMAIL_TOKEN:?Set EMAIL_TOKEN from Settings > Integrations}"
CHAT_TOKEN="${CHAT_TOKEN:?Set CHAT_TOKEN from Settings > Integrations}"
TEST_EMAIL="${TEST_EMAIL:?Set TEST_EMAIL to an address you can read (Resend delivers here)}"
MARKER="e2e-test-$(date +%s)"

echo "== 1. Inbound email: new ticket =="
CREATE_RESP=$(curl -sf -X POST "$BASE_URL/api/channels/email?token=$EMAIL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"from\":\"$TEST_EMAIL\",\"name\":\"E2E Tester\",\"subject\":\"$MARKER password reset\",\"text\":\"Hi, my reset link expired. Can you help?\"}")
echo "$CREATE_RESP"
TICKET_ID=$(echo "$CREATE_RESP" | grep -o '"ticketId":"[^"]*"' | cut -d'"' -f4)
echo "ticketId=$TICKET_ID"
echo
echo "Expected: threaded:false, a ticketId. Within a few seconds the test"
echo "automation should classify + AI-auto-resolve + Slack-notify + send"
echo "a CSAT survey email to $TEST_EMAIL. Check your inbox for two emails:"
echo "the AI's reply and the CSAT survey — both subjects carry a [#ref] tag."
echo

read -p "Paste the [#ref] token from the AI reply's subject line (e.g. ab12cd34ef), or press enter to skip threading test: " REF
if [ -n "$REF" ]; then
  echo "== 2. Inbound email: threaded reply =="
  REPLY_RESP=$(curl -sf -X POST "$BASE_URL/api/channels/email?token=$EMAIL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"from\":\"$TEST_EMAIL\",\"subject\":\"Re: $MARKER password reset [#$REF]\",\"text\":\"Thanks, that fixed it!\"}")
  echo "$REPLY_RESP"
  echo "Expected: threaded:true and the SAME ticketId as step 1. The ticket"
  echo "should also reopen (status -> open) since a customer replied to a"
  echo "resolved ticket."
  echo
fi

echo "== 3. Chat widget: start conversation =="
CHAT_RESP=$(curl -sf -X POST "$BASE_URL/api/channels/chat" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$CHAT_TOKEN\",\"action\":\"start\",\"email\":\"$TEST_EMAIL\",\"name\":\"Chat Tester\",\"message\":\"$MARKER I can't find the invite teammate button\"}")
echo "$CHAT_RESP"
CHAT_TICKET_ID=$(echo "$CHAT_RESP" | grep -o '"ticketId":"[^"]*"' | cut -d'"' -f4)
echo "chatTicketId=$CHAT_TICKET_ID"
echo

echo "Waiting 8s for the automation + job processor..."
sleep 8

echo "== 4. Chat widget: poll for the AI's reply =="
curl -sf "$BASE_URL/api/channels/chat?token=$CHAT_TOKEN&ticketId=$CHAT_TICKET_ID"
echo
echo "Expected: status:\"resolved\", messages including the AI's reply."
echo

echo "== 5. Chat widget: submit CSAT rating =="
curl -sf -X POST "$BASE_URL/api/channels/chat" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$CHAT_TOKEN\",\"action\":\"rate\",\"ticketId\":\"$CHAT_TICKET_ID\",\"rating\":5}"
echo
echo "Expected: {\"ok\":true}. Re-run step 4's poll — rating should now show 5."
echo

echo "Done. Check the deployment's Slack channel for the automation's"
echo "notification, and the Analytics/Dashboard CSAT numbers for both tickets."
