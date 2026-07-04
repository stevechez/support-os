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

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name, slug })
    .select()
    .single();

  if (orgError) return { error: orgError.message };

  const { data: member, error: memberError } = await supabase
    .from("members")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: "owner",
      display_name: user.email?.split("@")[0] ?? "Owner",
    })
    .select()
    .single();

  if (memberError) return { error: memberError.message };

  if (withDemo) {
    await seedDemoData(supabase, org.id, member.id);
  }

  redirect("/dashboard");
}
