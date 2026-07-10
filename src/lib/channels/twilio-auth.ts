import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify a Twilio webhook request signature (X-Twilio-Signature).
 * Optional hardening on top of the per-org URL token: if TWILIO_AUTH_TOKEN
 * isn't set, verification is skipped (the org token in the URL is still
 * required either way) so voice works without extra setup, but is fully
 * request-forgery-proof once the auth token is configured.
 *
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function verifyTwilioSignature(
  fullUrl: string,
  params: Record<string, string>,
  signatureHeader: string | null
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return true; // not configured — skip, rely on the URL token
  if (!signatureHeader) return false;

  const data =
    fullUrl +
    Object.keys(params)
      .sort()
      .map((key) => key + params[key])
      .join("");

  const expected = createHmac("sha1", authToken).update(data, "utf8").digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
