"use client";

import { useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchKnowledge, type SearchHit } from "./actions";

export function KnowledgeSearch() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    if (!query.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await searchKnowledge(query);
      if (res.error) {
        setError(res.error);
        setHits(null);
      } else {
        setHits(res.hits ?? []);
      }
    });
  }

  return (
    <div className="space-y-3">
      <form
        action={run}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Semantic search — try “how do refunds work?”"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={pending || !query.trim()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {hits !== null && !pending && (
        <div className="space-y-2">
          {hits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No matches. Try different wording, or index more documents.
            </p>
          ) : (
            hits.map((hit) => (
              <div key={hit.chunk_id} className="rounded-xl border p-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {hit.document_title}
                  </span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {(hit.similarity * 100).toFixed(0)}% match
                  </Badge>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {hit.content}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
