"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, SendHorizontal, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  sender: "customer" | "agent" | "ai" | "system";
  body: string;
  created_at: string;
};

export function WidgetChat() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const storageKey = `supportos-chat-${token.slice(0, 8)}`;
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Deferred so hydration completes before state updates.
    const t = setTimeout(() => {
      setTicketId(localStorage.getItem(storageKey));
      setHydrated(true);
    }, 0);
    return () => clearTimeout(t);
  }, [storageKey]);

  const poll = useCallback(async () => {
    if (!ticketId) return;
    try {
      const res = await fetch(
        `/api/channels/chat?token=${encodeURIComponent(token)}&ticketId=${encodeURIComponent(ticketId)}`
      );
      if (res.status === 404) {
        localStorage.removeItem(storageKey);
        setTicketId(null);
        return;
      }
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch {
      // Network hiccup — keep the last known messages.
    }
  }, [ticketId, token, storageKey]);

  useEffect(() => {
    if (!ticketId) return;
    const first = setTimeout(poll, 0);
    const interval = setInterval(poll, 4000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [ticketId, poll]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const message = input.trim();
    if (!message || sending) return;
    setSending(true);
    setError(null);

    try {
      if (!ticketId) {
        const res = await fetch("/api/channels/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            action: "start",
            email,
            name,
            message,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Something went wrong");
        localStorage.setItem(storageKey, data.ticketId);
        setTicketId(data.ticketId);
        setMessages([
          {
            id: "local",
            sender: "customer",
            body: message,
            created_at: new Date().toISOString(),
          },
        ]);
      } else {
        const res = await fetch("/api/channels/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            action: "reply",
            ticketId,
            message,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Something went wrong");
        setMessages((m) => [
          ...m,
          {
            id: `local-${Date.now()}`,
            sender: "customer",
            body: message,
            created_at: new Date().toISOString(),
          },
        ]);
        setTimeout(poll, 1500);
      }
      setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  if (!hydrated) return null;

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-3.5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Support</p>
          <p className="text-[11px] text-muted-foreground">
            We usually reply within minutes
          </p>
        </div>
      </header>

      {!ticketId ? (
        <form
          className="flex flex-1 flex-col justify-center gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <p className="mb-1 text-sm text-muted-foreground">
            Hi! Tell us who you are and how we can help.
          </p>
          <Input
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            type="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Textarea
            required
            placeholder="How can we help?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-24"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" disabled={sending}>
            {sending && <Loader2 className="size-4 animate-spin" />}
            Start chat
          </Button>
        </form>
      ) : (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message) => {
              const mine = message.sender === "customer";
              return (
                <div
                  key={message.id}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                      mine
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted"
                    )}
                  >
                    {message.body}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <form
            className="shrink-0 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            {error && (
              <p className="mb-2 text-xs text-destructive">{error}</p>
            )}
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Write a message…"
                className="min-h-10 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={sending || !input.trim()}
                aria-label="Send"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <SendHorizontal className="size-4" />
                )}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
