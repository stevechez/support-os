"use server";

import { revalidatePath } from "next/cache";

import { requireMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export async function dismissGettingStarted() {
  const gate = await requireMember("agent");
  if (!gate.ok) return;

  const supabase = await createClient();
  await supabase.from("settings").upsert({
    organization_id: gate.current.member.organization_id,
    key: "onboarding_checklist",
    value: { dismissed: true },
    updated_at: new Date().toISOString(),
  });

  revalidatePath("/dashboard");
}
