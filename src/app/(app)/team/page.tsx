import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { AuditLog } from "./audit-log";
import { InviteForm } from "./invite-form";
import { MembersList } from "./members-list";
import { PendingInvites } from "./pending-invites";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: members }, { data: invitations }, { data: activity }] =
    await Promise.all([
      supabase
        .from("members")
        .select("id, display_name, role, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("invitations")
        .select("id, email, role, created_at")
        .is("accepted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("activity_log")
        .select("id, action, actor_type, metadata, created_at, member:members(display_name)")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const isAdmin =
    current.member.role === "owner" || current.member.role === "admin";

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div>
        <h1 className="font-serif text-3xl">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Members, roles, and workspace activity.
        </p>
      </div>

      {isAdmin && <InviteForm />}

      <MembersList
        members={members ?? []}
        currentMemberId={current.member.id}
        canManage={isAdmin}
        isOwner={current.member.role === "owner"}
      />

      {isAdmin && (invitations ?? []).length > 0 && (
        <PendingInvites invitations={invitations ?? []} />
      )}

      <AuditLog entries={activity ?? []} />
    </div>
  );
}
