/**
 * Minimal hand-built TwiML — no dependency needed for the handful of verbs
 * a turn-based voice IVR actually uses (Say, Gather, Hangup). Every
 * dynamic string is XML-escaped before being embedded.
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const VOICE = "Polly.Joanna";

/** Say something, then listen for speech; falls through to a goodbye + hangup on silence. */
export function twimlGather(sayText: string, actionUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${escapeXml(actionUrl)}" method="POST" speechTimeout="auto" timeout="6">
    <Say voice="${VOICE}">${escapeXml(sayText)}</Say>
  </Gather>
  <Say voice="${VOICE}">Sorry, I didn't catch anything. Goodbye for now.</Say>
  <Hangup/>
</Response>`;
}

/** Say something and end the call. */
export function twimlSayAndHangup(sayText: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${VOICE}">${escapeXml(sayText)}</Say>
  <Hangup/>
</Response>`;
}

/** Reply to an inbound SMS — Twilio sends this text back as the response. */
export function twimlMessage(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(body)}</Message>
</Response>`;
}

/** Acknowledge an inbound SMS with no reply (e.g. after handing off to a human). */
export function twimlEmptyResponse(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;
}

export function twimlResponse(xml: string): Response {
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
