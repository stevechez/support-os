"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type MfaChallengeState = { error?: string };

export async function verifyMfaLogin(
  _prev: MfaChallengeState,
  formData: FormData
): Promise<MfaChallengeState> {
  const code = (formData.get("code") as string)?.trim();
  if (!code) return { error: "Enter the 6-digit code." };

  const supabase = await createClient();

  const { data: factors, error: factorsError } =
    await supabase.auth.mfa.listFactors();
  if (factorsError) return { error: factorsError.message };

  const factor = factors?.totp.find((f) => f.status === "verified");
  if (!factor) return { error: "No two-factor device found." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code,
  });
  if (error) {
    return { error: "That code didn't work. Check the app and try again." };
  }

  redirect("/dashboard");
}
