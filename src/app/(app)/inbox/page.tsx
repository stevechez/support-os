import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Inbox as InboxIcon } from "lucide-react";

import { availableModels } from "@/lib/ai/models";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { ConversationList } from "./conversation-list";
import { CopilotPanel } from "./copilot-panel";
import { InboxProvider } from "./inbox-context";
import { Thread } from "./thread";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const supabase = await createClient();
  const { t: selectedId } = await searchParams;

  const { data: tickets } = await supabase
    .from("tickets")
    .select(
      "*, customer:customers(id, name, email), messages(body, created_at, sender)"
    )
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "messages", ascending: false })
    .limit(1, { foreignTable: "messages" });

  const list = tickets ?? [];
  const selected = selectedId
    ? list.find((t) => t.id === selectedId)
    : list[0];

  const [{ data: messages }, { data: members }, { data: modelSetting }] =
    await Promise.all([
      selected
        ? supabase
            .from("messages")
            .select("*, member:members(id, display_name)")
            .eq("ticket_id", selected.id)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: null }),
      supabase.from("members").select("id, display_name"),
      supabase
        .from("settings")
        .select("value")
        .eq("organization_id", current.member.organization_id)
        .eq("key", "ai_model")
        .maybeSingle(),
    ]);

  const models = availableModels();
  const currentModelId = (modelSetting?.value as { id?: string } | null)?.id;

  return (
    <div className="flex h-full">
      <ConversationList tickets={list} selectedId={selected?.id} />

      {selected ? (
        <InboxProvider>
          <Thread
            ticket={selected}
            messages={messages ?? []}
            members={members ?? []}
          />
          <CopilotPanel
            ticketId={selected.id}
            models={models}
            currentModelId={currentModelId}
          />
        </InboxProvider>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <InboxIcon className="size-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            No open conversations. Enjoy the quiet.
          </p>
        </div>
      )}
    </div>
  );
}
