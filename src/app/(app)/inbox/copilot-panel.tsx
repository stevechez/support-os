"use client";

import { useState, useTransition } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  FileSearch,
  Languages,
  ListChecks,
  Loader2,
  MessageSquareQuote,
  PenLine,
  ScanSearch,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ModelInfo } from "@/lib/ai/models";
import { cn } from "@/lib/utils";
import {
  analyzeTicket,
  escalateTicket,
  findDocumentation,
  generateChecklist,
  rewriteDraft,
  setAiModel,
  suggestReply,
  summarizeTicket,
  translateDraft,
  type AiResult,
} from "./ai-actions";
import { useInbox } from "./inbox-context";

const TONES = ["friendly", "formal", "concise"] as const;
const LANGUAGES = ["Spanish", "French", "German", "Portuguese", "Japanese"];

type PanelResult = { label: string; text: string; insertable: boolean };

export function CopilotPanel({
  ticketId,
  models,
  currentModelId,
}: {
  ticketId: string;
  models: ModelInfo[];
  currentModelId?: string;
}) {
  const { draft, setDraft } = useInbox();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [result, setResult] = useState<PanelResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const hasModel = models.length > 0;
  const activeModel =
    models.find((m) => m.id === currentModelId) ?? models[0];

  function run(
    key: string,
    resultLabel: string,
    fn: () => Promise<AiResult>,
    opts: { insertable?: boolean; replaceDraft?: boolean } = {}
  ) {
    setPendingAction(key);
    setError(null);
    startTransition(async () => {
      const res = await fn();
      setPendingAction(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (opts.replaceDraft) {
        setDraft(res.text);
      } else {
        setResult({
          label: resultLabel,
          text: res.text,
          insertable: opts.insertable ?? false,
        });
      }
    });
  }

  const actions = [
    {
      label: "Summarize conversation",
      icon: MessageSquareQuote,
      onClick: () =>
        run("Summarize conversation", "Summary", () =>
          summarizeTicket(ticketId)
        ),
    },
    {
      label: "Suggest a reply",
      icon: Sparkles,
      onClick: () =>
        run("Suggest a reply", "Suggested reply", () => suggestReply(ticketId), {
          insertable: true,
        }),
    },
    {
      label: "Find documentation",
      icon: FileSearch,
      onClick: () =>
        run("Find documentation", "Documentation", () =>
          findDocumentation(ticketId)
        ),
    },
    {
      label: "Analyze sentiment & intent",
      icon: ScanSearch,
      onClick: () =>
        run("Analyze sentiment & intent", "Analysis", () =>
          analyzeTicket(ticketId)
        ),
    },
    {
      label: "Generate checklist",
      icon: ListChecks,
      onClick: () =>
        run("Generate checklist", "Checklist", () =>
          generateChecklist(ticketId)
        ),
    },
    {
      label: "Escalate",
      icon: ArrowUpRight,
      onClick: () =>
        run("Escalate", "Escalation", () => escalateTicket(ticketId)),
      alwaysEnabled: true,
    },
  ];

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-l xl:flex">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <Sparkles className="size-4" />
        <span className="text-sm font-semibold">Copilot</span>

        {hasModel && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
              >
                {activeModel.label}
                <ChevronDown className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Model</DropdownMenuLabel>
              {models.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onSelect={() => startTransition(() => setAiModel(model.id))}
                >
                  {model.id === activeModel.id && <Check />}
                  {model.label}
                  <span className="ml-auto text-[10px] capitalize text-muted-foreground">
                    {model.provider}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1 p-3">
          {actions.map(({ label, icon: Icon, onClick, alwaysEnabled }) => {
            const disabled =
              (!hasModel && !alwaysEnabled) || pendingAction !== null;
            return (
              <button
                key={label}
                type="button"
                disabled={disabled}
                onClick={onClick}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingAction === label ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Icon className="size-4 text-muted-foreground" />
                )}
                {label}
              </button>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={!hasModel || pendingAction !== null}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PenLine className="size-4 text-muted-foreground" />
                Rewrite draft tone
                <ChevronDown className="ml-auto size-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {TONES.map((tone) => (
                <DropdownMenuItem
                  key={tone}
                  className="capitalize"
                  onSelect={() =>
                    run("Rewrite", "Rewrite", () => rewriteDraft(draft, tone), {
                      replaceDraft: true,
                    })
                  }
                >
                  {tone}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={!hasModel || pendingAction !== null}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Languages className="size-4 text-muted-foreground" />
                Translate draft
                <ChevronDown className="ml-auto size-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {LANGUAGES.map((language) => (
                <DropdownMenuItem
                  key={language}
                  onSelect={() =>
                    run(
                      "Translate",
                      "Translate",
                      () => translateDraft(draft, language),
                      { replaceDraft: true }
                    )
                  }
                >
                  {language}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

        </div>

        {!hasModel && (
          <p className="mx-3 rounded-lg border border-dashed p-3 text-xs leading-relaxed text-muted-foreground">
            Add an API key (Anthropic, OpenAI, or Google) to{" "}
            <code className="rounded bg-muted px-1">.env.local</code> and
            restart to enable the Copilot.
          </p>
        )}

        {error && (
          <div className="mx-3 mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {result && (
          <div className="mx-3 mb-3 rounded-lg border bg-card p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold">{result.label}</span>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
              {result.text}
            </p>
            {result.insertable && (
              <Button
                size="sm"
                className={cn("mt-3 w-full")}
                onClick={() => {
                  setDraft(result.text);
                  setResult(null);
                }}
              >
                Use as reply
              </Button>
            )}
          </div>
        )}
      </div>

      <p className="border-t p-4 text-xs leading-relaxed text-muted-foreground">
        {hasModel
          ? `Powered by ${activeModel.label}. Rewrite and translate act on your current draft.`
          : "One-click AI actions for summaries, replies, analysis, and more."}
      </p>
    </aside>
  );
}
