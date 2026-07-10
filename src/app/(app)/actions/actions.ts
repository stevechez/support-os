"use server";

import { revalidatePath } from "next/cache";

import { dispatchActionRequest } from "@/lib/actions/dispatch";
import { requireMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export async function approveActionRequest(actionRequestId: string) {
  const gate = await requireMember("agent");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;

  const supabase = await createClient();
  const orgId = current.member.organization_id;

  const { data: request } = await supabase
    .from("action_requests")
    .select("id, ticket_id, status")
    .eq("id", actionRequestId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!request || request.status !== "pending") {
    return { error: "This request is no longer pending." };
  }

  await supabase
    .from("action_requests")
    .update({
      status: "approved",
      resolved_by: current.member.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", actionRequestId);

  const result = await dispatchActionRequest(supabase, orgId, actionRequestId);

  await supabase.from("messages").insert({
    organization_id: orgId,
    ticket_id: request.ticket_id,
    sender: "system",
    body: result.ok
      ? "Action approved and sent for fulfillment."
      : `Action approved but delivery failed: ${result.error}`,
    is_internal: true,
  });

  revalidatePath("/actions");
  revalidatePath("/inbox");
  return { ok: result.ok, error: result.error };
}

export async function rejectActionRequest(actionRequestId: string) {
  const gate = await requireMember("agent");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;

  const supabase = await createClient();
  const orgId = current.member.organization_id;

  const { data: request } = await supabase
    .from("action_requests")
    .select("id, ticket_id, action_type, status")
    .eq("id", actionRequestId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!request || request.status !== "pending") {
    return { error: "This request is no longer pending." };
  }

  await supabase
    .from("action_requests")
    .update({
      status: "rejected",
      resolved_by: current.member.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", actionRequestId);

  await supabase.from("messages").insert({
    organization_id: orgId,
    ticket_id: request.ticket_id,
    sender: "system",
    body: `Requested action (${request.action_type.replace("_", " ")}) was reviewed and rejected — no action taken.`,
    is_internal: true,
  });

  revalidatePath("/actions");
  revalidatePath("/inbox");
  return { ok: true };
}
