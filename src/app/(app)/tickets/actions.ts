"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { runAutomations } from "@/lib/automations/engine";
import type { TicketPriority, TicketStatus } from "@/lib/database.types";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

function revalidateTicketPages() {
  revalidatePath("/inbox");
  revalidatePath("/tickets");
  revalidatePath("/dashboard");
}

export type TicketFormState = { error?: string };

export async function createTicket(
  _prev: TicketFormState,
  formData: FormData
): Promise<TicketFormState> {
  const current = await getCurrentMember();
  if (!current) redirect("/login");

  const supabase = await createClient();
  const orgId = current.member.organization_id;

  const subject = (formData.get("subject") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const name = (formData.get("name") as string)?.trim();
  const priority = (formData.get("priority") as TicketPriority) || "medium";
  const body = (formData.get("body") as string)?.trim();

  if (!subject || !email) {
    return { error: "Subject and customer email are required." };
  }

  // Find or create the customer.
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("organization_id", orgId)
    .eq("email", email)
    .maybeSingle();

  let customerId = existing?.id;
  if (!customerId) {
    const { data: created, error } = await supabase
      .from("customers")
      .insert({
        organization_id: orgId,
        email,
        name: name || email.split("@")[0],
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    customerId = created.id;
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      organization_id: orgId,
      customer_id: customerId,
      subject,
      priority,
    })
    .select("id")
    .single();

  if (ticketError) return { error: ticketError.message };

  if (body) {
    await supabase.from("messages").insert({
      organization_id: orgId,
      ticket_id: ticket.id,
      sender: "customer",
      body,
    });
  }

  // Fire automations for the new ticket (and its first customer message).
  await runAutomations(supabase, orgId, "ticket.created", ticket.id);
  if (body) {
    await runAutomations(supabase, orgId, "message.created", ticket.id);
  }

  revalidateTicketPages();
  redirect(`/inbox?t=${ticket.id}`);
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus
) {
  const supabase = await createClient();
  await supabase
    .from("tickets")
    .update({
      status,
      resolved_at:
        status === "resolved" || status === "closed"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", ticketId);
  revalidateTicketPages();
}

export async function updateTicketPriority(
  ticketId: string,
  priority: TicketPriority
) {
  const supabase = await createClient();
  await supabase.from("tickets").update({ priority }).eq("id", ticketId);
  revalidateTicketPages();
}

export async function assignTicket(
  ticketId: string,
  memberId: string | null
) {
  const supabase = await createClient();
  await supabase
    .from("tickets")
    .update({ assignee_id: memberId })
    .eq("id", ticketId);
  revalidateTicketPages();
}

export async function sendReply(formData: FormData) {
  const current = await getCurrentMember();
  if (!current) redirect("/login");

  const supabase = await createClient();
  const ticketId = formData.get("ticketId") as string;
  const body = (formData.get("body") as string)?.trim();
  const isInternal = formData.get("internal") === "on";

  if (!body || !ticketId) return;

  await supabase.from("messages").insert({
    organization_id: current.member.organization_id,
    ticket_id: ticketId,
    sender: "agent",
    member_id: current.member.id,
    body,
    is_internal: isInternal,
  });

  if (!isInternal) {
    const { data: ticket } = await supabase
      .from("tickets")
      .select("first_response_at, status")
      .eq("id", ticketId)
      .single();

    await supabase
      .from("tickets")
      .update({
        first_response_at:
          ticket?.first_response_at ?? new Date().toISOString(),
        status: ticket?.status === "open" ? "waiting" : ticket?.status,
      })
      .eq("id", ticketId);
  }

  revalidateTicketPages();
}
