"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { seedDemoData } from "./seed";

export type OnboardingState = { error?: string };

export async function createWorkspace(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = (formData.get("name") as string)?.trim();
  const withDemo = formData.get("demo") === "on";
  if (!name) return { error: "Please name your workspace." };

  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) +
    "-" +
    Math.random().toString(36).slice(2, 6);

  // Atomic org + owner-membership creation (RLS-safe via SQL function).
  const { data: orgId, error: orgError } = await supabase.rpc(
    "create_workspace",
    { p_name: name, p_slug: slug }
  );

  if (orgError || !orgId) {
    return { error: orgError?.message ?? "Could not create workspace." };
  }

  if (withDemo) {
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (member) {
      await seedDemoData(supabase, orgId, member.id);
    }
  }

  redirect("/dashboard");
}
