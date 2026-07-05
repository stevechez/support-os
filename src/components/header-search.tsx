"use client";

import { Search } from "lucide-react";

export function HeaderSearch() {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(new Event("supportos:open-palette"))
      }
      className="flex h-8 w-full max-w-xs items-center gap-2 rounded-lg border bg-card/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/50"
    >
      <Search className="size-3.5" />
      Search…
      <kbd className="ml-auto rounded border bg-muted px-1.5 font-mono text-[10px]">
        ⌘K
      </kbd>
    </button>
  );
}
