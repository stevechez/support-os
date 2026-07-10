"use client";

import { useRef, useState, useTransition } from "react";
import { Lock, SendHorizontal, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { listMacros, type MacroOption } from "../macros/actions";
import { sendReply } from "../tickets/actions";
import { useInbox } from "./inbox-context";

function fillMacro(body: string, customerName: string, memberName: string): string {
  return body
    .replace(/\{\{\s*customer_name\s*\}\}/gi, customerName)
    .replace(/\{\{\s*agent_name\s*\}\}/gi, memberName);
}

function MacroPicker({
  customerName,
  memberName,
  onPick,
}: {
  customerName: string;
  memberName: string;
  onPick: (text: string) => void;
}) {
  const [macros, setMacros] = useState<MacroOption[] | null>(null);
  const [, startTransition] = useTransition();

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && macros === null) {
          startTransition(async () => {
            setMacros(await listMacros());
          });
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
          title="Insert a macro"
        >
          <Zap className="size-3" />
          Macros
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Insert a saved reply</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {macros === null ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</p>
        ) : macros.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            No macros yet — create one on the Macros page.
          </p>
        ) : (
          macros.map((macro) => (
            <DropdownMenuItem
              key={macro.id}
              onSelect={() =>
                onPick(fillMacro(macro.body, customerName, memberName))
              }
            >
              {macro.title}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ReplyForm({
  ticketId,
  customerName,
  memberName,
  onOptimisticSend,
}: {
  ticketId: string;
  customerName: string;
  memberName: string;
  onOptimisticSend?: (body: string, isInternal: boolean) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const { draft, setDraft } = useInbox();
  const [internal, setInternal] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        const body = (formData.get("body") as string)?.trim();
        startTransition(async () => {
          if (body) onOptimisticSend?.(body, internal);
          setDraft("");
          setInternal(false);
          await sendReply(formData);
          formRef.current?.reset();
        });
      }}
      className="shrink-0 border-t p-4"
    >
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="internal" value={internal ? "on" : ""} />

      <div
        className={cn(
          "rounded-xl border transition-colors focus-within:ring-1 focus-within:ring-ring",
          internal && "border-amber-500/30 bg-amber-500/5"
        )}
      >
        <Textarea
          name="body"
          required
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            internal ? "Add an internal note…" : "Write a reply…"
          }
          className="min-h-20 resize-none border-0 shadow-none focus-visible:ring-0"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="flex items-center justify-between px-3 pb-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setInternal((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
                internal
                  ? "bg-amber-500/15 text-amber-400"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <Lock className="size-3" />
              Internal note
            </button>
            <MacroPicker
              customerName={customerName}
              memberName={memberName}
              onPick={(text) =>
                setDraft(draft ? `${draft}\n\n${text}` : text)
              }
            />
          </div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Sending…" : "Send"}
            <SendHorizontal className="size-3.5" />
          </Button>
        </div>
      </div>
      <p className="mt-1.5 text-right text-[11px] text-muted-foreground">
        ⌘↵ to send
      </p>
    </form>
  );
}
