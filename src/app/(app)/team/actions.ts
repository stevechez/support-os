"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { checkMemberBudget } from "@/lib/billing/usage";
import type { Enums } from "@/lib/database.types";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

type Role = Enums<"member_role">;

export type TeamActionState = { error?: string; success?: string };

async function requireAdmin() {
  const current = await getCurrentMember();
  if (!current) redirect("/login");
  if (current.member.role !== "owner" && current.member.role !== "admin") {
    return { current, allowed: false as const };
  }
  return { current, allowed: true as const };
}

export async function inviteMember(
  _prev: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const { current, allowed } = await requireAdmin();
  if (!allowed) return { error: "Only owners and admins can invite." };

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const role = (formData.get("role") as Role) || "agent";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (role === "owner") return { error: "Ownership can't be granted by invite." };

  const supabase = await createClient();
  const orgId = current.member.organization_id;

  const budget = await checkMemberBudget(supabase, orgId);
  if (!budget.ok) return { error: budget.error };

  const { error } = await supabase.from("invitations").insert({
    organization_id: orgId,
    email,
    role,
    invited_by: current.member.id,
  });

  if (error) {
    return {
      error: error.code === "23505" ? "Already invited." : error.message,
    };
  }

  await supabase.from("activity_log").insert({
    organization_id: orgId,
    actor_type: "member",
    member_id: current.member.id,
    action: "member.invited",
    metadata: { email, role },
  });

  revalidatePath("/team");
  return {
    success: `Invited ${email} — ask them to sign up with that email and they'll join automatically.`,
  };
}

export async function revokeInvitation(invitationId: string) {
  const { current, allowed } = await requireAdmin();
  if (!allowed) return;

  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invitations")
    .delete()
    .eq("id", invitationId)
    .is("accepted_at", null)
    .select("email")
    .maybeSingle();

  if (inv) {
    await supabase.from("activity_log").insert({
      organization_id: current.member.organization_id,
      actor_type: "member",
      member_id: current.member.id,
      action: "member.invite_revoked",
      metadata: { email: inv.email },
    });
  }
  revalidatePath("/team");
}

export async function updateMemberRole(
  memberId: string,
  role: Role
): Promise<TeamActionState> {
  const { current, allowed } = await requireAdmin();
  if (!allowed) return { error: "Only owners and admins can change roles." };
  if (role === "owner" && current.member.role !== "owner") {
    return { error: "Only an owner can grant ownership." };
  }

  const supabase = await createClient();
  const orgId = current.member.organization_id;

  // Never demote the last owner.
  const { data: target } = await supabase
    .from("members")
    .select("id, role, display_name")
    .eq("id", memberId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!target) return { error: "Member not found." };

  if (target.role === "owner" && role !== "owner") {
    const { count } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("role", "owner");
    if ((count ?? 0) <= 1) {
      return { error: "You can't demote the only owner." };
    }
  }

  await supabase.from("members").update({ role }).eq("id", memberId);
  await supabase.from("activity_log").insert({
    organization_id: orgId,
    actor_type: "member",
    member_id: current.member.id,
    action: "member.role_changed",
    metadata: { member: target.display_name, role },
  });

  revalidatePath("/team");
  return {};
}

export async function removeMember(
  memberId: string
): Promise<TeamActionState> {
  const { current, allowed } = await requireAdmin();
  if (!allowed) return { error: "Only owners and admins can remove members." };
  if (memberId === current.member.id) {
    return { error: "You can't remove yourself." };
  }

  const supabase = await createClient();
  const orgId = current.member.organization_id;

  const { data: target } = await supabase
    .from("members")
    .select("id, role, display_name")
    .eq("id", memberId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!target) return { error: "Member not found." };
  if (target.role === "owner") {
    return { error: "Owners can't be removed. Transfer ownership first." };
  }

  await supabase.from("members").delete().eq("id", memberId);
  await supabase.from("activity_log").insert({
    organization_id: orgId,
    actor_type: "member",
    member_id: current.member.id,
    action: "member.removed",
    metadata: { member: target.display_name },
  });

  revalidatePath("/team");
  return {};
}
