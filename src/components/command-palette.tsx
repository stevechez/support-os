"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  BarChart3,
  BookOpen,
  Bot,
  FileText,
  Inbox,
  LayoutDashboard,
  Loader2,
  Search,
  Settings,
  Ticket,
  UserRound,
  Users,
  UsersRound,
  Workflow,
} from "lucide-react";

import {
  searchWorkspace,
  type WorkspaceSearchResults,
} from "@/app/(app)/search-actions";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "AI Agent", href: "/agents", icon: Bot },
  { label: "Knowledge Base", href: "/knowledge", icon: BookOpen },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Tickets", href: "/tickets", icon: Ticket },
  { label: "Automations", href: "/automations", icon: Workflow },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Team", href: "/team", icon: UsersRound },
  { label: "Settings", href: "/settings", icon: Settings },
];

const EMPTY: WorkspaceSearchResults = {
  customers: [],
  tickets: [],
  documents: [],
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkspaceSearchResults>(EMPTY);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults(EMPTY);
    setSearching(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") close();
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("supportos:open-palette", onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("supportos:open-palette", onOpen);
    };
  }, [close]);

  function onQueryChange(value: string) {
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);
    if (value.trim().length < 2) {
      setResults(EMPTY);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      const res = await searchWorkspace(value);
      setResults(res);
      setSearching(false);
    }, 250);
  }

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [router, close]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-black/60 animate-in fade-in-0"
        onClick={close}
      />
      <Command
        shouldFilter={query.trim().length < 2}
        className="relative w-full max-w-lg overflow-hidden rounded-xl border bg-popover shadow-2xl animate-in fade-in-0 zoom-in-95"
        label="Command palette"
      >
        <div className="flex items-center gap-2 border-b px-4">
          {searching ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Search className="size-4 shrink-0 text-muted-foreground" />
          )}
          <Command.Input
            value={query}
            onValueChange={onQueryChange}
            autoFocus
            placeholder="Search customers, tickets, docs — or jump anywhere…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            esc
          </kbd>
        </div>

        <Command.List className="max-h-[50vh] overflow-y-auto p-2">
          <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
            {searching ? "Searching…" : "No results."}
          </Command.Empty>

          {results.tickets.length > 0 && (
            <Command.Group
              heading="Tickets"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {results.tickets.map((t) => (
                <Command.Item
                  key={t.id}
                  value={`ticket-${t.id}`}
                  onSelect={() => go(`/inbox?t=${t.id}`)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-accent"
                >
                  <Ticket className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{t.subject}</span>
                  <span className="text-xs capitalize text-muted-foreground">
                    {t.status}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {results.customers.length > 0 && (
            <Command.Group
              heading="Customers"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {results.customers.map((c) => (
                <Command.Item
                  key={c.id}
                  value={`customer-${c.id}`}
                  onSelect={() => go(`/customers/${c.id}`)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-accent"
                >
                  <UserRound className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">
                    {c.name ?? c.email}
                  </span>
                  {c.name && (
                    <span className="truncate text-xs text-muted-foreground">
                      {c.email}
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {results.documents.length > 0 && (
            <Command.Group
              heading="Knowledge"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {results.documents.map((d) => (
                <Command.Item
                  key={d.id}
                  value={`doc-${d.id}`}
                  onSelect={() => go("/knowledge")}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-accent"
                >
                  <BookOpen className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{d.title}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          <Command.Group
            heading="Go to"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {NAV.map(({ label, href, icon: Icon }) => (
              <Command.Item
                key={href}
                value={`nav-${label}`}
                keywords={[label]}
                onSelect={() => go(href)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-accent"
              >
                <Icon className="size-4 text-muted-foreground" />
                {label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
