"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, MessageCircle, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Doc = { id: string; title: string; tags: string[] };
type InitData = {
  orgName: string;
  documents: Doc[];
  chatWidgetToken: string | null;
  searchAvailable: boolean;
};
type Source = { index: number; title: string };

export function HelpCenter() {
  const searchParams = useSearchParams();
  const token = searchParams.get("org") ?? "";

  const [init, setInit] = useState<InitData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [query, setQuery] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/help?token=${encodeURIComponent(token)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setInit)
      .catch(() => setNotFound(true));
  }, [token]);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || asking) return;
    setAsking(true);
    setError(null);
    setAnswer(null);
    setSources([]);
    try {
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setAnswer(data.answer);
      setSources(data.sources ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAsking(false);
    }
  }

  if (!token || notFound) {
    return (
      <div className="flex h-dvh items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">
          This help center isn&apos;t available. Check the link and try again.
        </p>
      </div>
    );
  }

  if (!init) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card/30">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-6 py-8">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight">
              {init.orgName} Help Center
            </p>
            <p className="text-sm text-muted-foreground">
              Search our help articles, or start a chat if you need more.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-6 py-10">
        {init.searchAvailable ? (
          <form onSubmit={ask} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question…"
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={asking || !query.trim()}>
              {asking && <Loader2 className="size-4 animate-spin" />}
              Search
            </Button>
          </form>
        ) : (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Search isn&apos;t set up yet — browse the articles below.
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {answer && (
          <div className="rounded-2xl border bg-card p-5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>
            {sources.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5 border-t pt-3">
                {sources.map((s) => (
                  <span
                    key={s.index}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    [{s.index}] {s.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Browse articles
          </h2>
          {init.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No articles published yet.
            </p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {init.documents.map((doc) => (
                <li key={doc.id} className="px-4 py-3">
                  <p className="text-sm font-medium">{doc.title}</p>
                  {doc.tags.length > 0 && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {doc.tags.join(" · ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {init.chatWidgetToken && (
          <a
            href={`/widget?token=${encodeURIComponent(init.chatWidgetToken)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border bg-card p-4 text-sm font-medium transition-colors hover:bg-accent"
            )}
          >
            <MessageCircle className="size-4" />
            Still need help? Start a chat
          </a>
        )}
      </main>
    </div>
  );
}
