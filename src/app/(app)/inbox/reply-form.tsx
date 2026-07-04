"use client";

import { useRef, useState, useTransition } from "react";
import { Lock, SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sendReply } from "../tickets/actions";
import { useInbox } from "./inbox-context";

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const { draft, setDraft } = useInbox();
  const [internal, setInternal] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await sendReply(formData);
          formRef.current?.reset();
          setDraft("");
          setInternal(false);
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
