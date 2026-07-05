"use server";

import { createClient } from "@/lib/supabase/server";

export type SecurityActionState = {
  error?: string;
  success?: string;
  factorId?: string;
  qrCode?: string;
  secret?: string;
};

/**
 * Step 1 of enrollment: register a TOTP factor and return the QR
 * code + secret so the user can add it to an authenticator app.
 * The factor is "unverified" until confirmed with a code below.
 */
export async function enrollMfa(): Promise<SecurityActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `SupportOS – ${new Date().toISOString().slice(0, 10)}`,
  });
  if (error) return { error: error.message };

  return {
    success: "Scan the QR code, then enter the 6-digit code to confirm.",
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

/**
 * Step 2 of enrollment: verify the code from the authenticator app
 * to activate the factor. Requires a challenge first.
 */
export async function confirmMfaEnrollment(
  _prev: SecurityActionState,
  formData: FormData
): Promise<SecurityActionState> {
  const factorId = formData.get("factorId") as string;
  const code = (formData.get("code") as string)?.trim();
  if (!factorId || !code) return { error: "Enter the 6-digit code." };

  const supabase = await createClient();

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) return { error: challengeError.message };

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) {
    return { error: "That code didn't match. Check the app and try again." };
  }

  return { success: "Two-factor authentication is now enabled." };
}

export async function unenrollMfa(factorId: string) {
  const supabase = await createClient();
  await supabase.auth.mfa.unenroll({ factorId });
}

export async function cancelMfaEnrollment(factorId: string) {
  // Removes an unverified (in-progress) factor if the user backs out.
  const supabase = await createClient();
  await supabase.auth.mfa.unenroll({ factorId });
}
