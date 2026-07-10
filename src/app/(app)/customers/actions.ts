"use server";

import { revalidatePath } from "next/cache";

import { requireMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export type CustomerActionState = { error?: string; success?: boolean };

export async function updateCustomerDetails(
  _prev: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const gate = await requireMember("agent");
  if (!gate.ok) return { error: gate.error };

  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  const company = (formData.get("company") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  if (!id) return { error: "Missing customer." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name: name || null,
      company: company || null,
      phone: phone || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath(`/customers/${id}`);
  revalidatePath("/customers");
  return { success: true };
}

export async function updateCustomerNotes(
  _prev: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const gate = await requireMember("agent");
  if (!gate.ok) return { error: gate.error };

  const id = formData.get("id") as string;
  const notes = ((formData.get("notes") as string) ?? "").trim();
  if (!id) return { error: "Missing customer." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ notes: notes || null })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath(`/customers/${id}`);
  return { success: true };
}

export async function addCustomerTag(customerId: string, tag: string) {
  const gate = await requireMember("agent");
  if (!gate.ok) return;

  const clean = tag.trim().toLowerCase().slice(0, 40);
  if (!clean) return;

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("tags")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer || customer.tags.includes(clean)) return;

  await supabase
    .from("customers")
    .update({ tags: [...customer.tags, clean] })
    .eq("id", customerId);
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
}

export type OrderActionState = { error?: string };

export async function createOrder(
  _prev: OrderActionState,
  formData: FormData
): Promise<OrderActionState> {
  const gate = await requireMember("agent");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;

  const customerId = formData.get("customerId") as string;
  const orderNumber = ((formData.get("orderNumber") as string) ?? "").trim();
  const status = (formData.get("status") as string) || "processing";
  const description = ((formData.get("description") as string) ?? "").trim();
  const totalRaw = (formData.get("total") as string) ?? "";
  const trackingNumber = ((formData.get("trackingNumber") as string) ?? "").trim();
  const expectedDelivery = (formData.get("expectedDelivery") as string) ?? "";

  if (!customerId) return { error: "Missing customer." };
  if (!orderNumber) return { error: "Order number is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("orders").insert({
    organization_id: current.member.organization_id,
    customer_id: customerId,
    order_number: orderNumber,
    status,
    description: description || null,
    total: totalRaw ? Number(totalRaw) : null,
    tracking_number: trackingNumber || null,
    expected_delivery: expectedDelivery
      ? new Date(expectedDelivery).toISOString()
      : null,
  });

  if (error) {
    return {
      error: error.message.includes("duplicate")
        ? "An order with that number already exists for this customer."
        : error.message,
    };
  }
  revalidatePath(`/customers/${customerId}`);
  return {};
}

export async function deleteOrder(orderId: string, customerId: string) {
  const gate = await requireMember("agent");
  if (!gate.ok) return;

  const supabase = await createClient();
  await supabase.from("orders").delete().eq("id", orderId);
  revalidatePath(`/customers/${customerId}`);
}

export async function removeCustomerTag(customerId: string, tag: string) {
  const gate = await requireMember("agent");
  if (!gate.ok) return;

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("tags")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) return;

  await supabase
    .from("customers")
    .update({ tags: customer.tags.filter((t) => t !== tag) })
    .eq("id", customerId);
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
}
