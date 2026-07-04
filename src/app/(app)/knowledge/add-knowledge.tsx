"use client";

import { useActionState, useState } from "react";
import { FileUp, Globe, Loader2, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  addKnowledgeText,
  addKnowledgeUrl,
  uploadKnowledgeFile,
  type KnowledgeFormState,
} from "./actions";

const initial: KnowledgeFormState = {};

type Tab = "file" | "url" | "text";

const tabs: { id: Tab; label: string; icon: typeof FileUp }[] = [
  { id: "file", label: "Upload file", icon: FileUp },
  { id: "url", label: "From URL", icon: Globe },
  { id: "text", label: "Paste text", icon: PenLine },
];

export function AddKnowledge() {
  const [tab, setTab] = useState<Tab>("file");
  const [fileState, fileAction, filePending] = useActionState(
    uploadKnowledgeFile,
    initial
  );
  const [urlState, urlAction, urlPending] = useActionState(
    addKnowledgeUrl,
    initial
  );
  const [textState, textAction, textPending] = useActionState(
    addKnowledgeText,
    initial
  );

  const state =
    tab === "file" ? fileState : tab === "url" ? urlState : textState;
  const pending = filePending || urlPending || textPending;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-5 flex gap-1.5">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                tab === id
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === "file" && (
          <form action={fileAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">PDF, DOCX, Markdown, or TXT — up to 8 MB</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".pdf,.docx,.md,.markdown,.txt"
                required
                className="h-auto cursor-pointer py-2 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-secondary-foreground"
              />
            </div>
            <SubmitRow pending={filePending} label="Upload & index" />
          </form>
        )}

        {tab === "url" && (
          <form action={urlAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Page URL</Label>
              <Input
                id="url"
                name="url"
                type="url"
                required
                placeholder="https://docs.yourcompany.com/refund-policy"
              />
            </div>
            <SubmitRow pending={urlPending} label="Fetch & index" />
          </form>
        )}

        {tab === "text" && (
          <form action={textAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder="Refund policy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="text">Content</Label>
              <Textarea
                id="text"
                name="text"
                required
                placeholder="Paste FAQs, policies, or any reference text…"
                className="min-h-32"
              />
            </div>
            <SubmitRow pending={textPending} label="Index text" />
          </form>
        )}

        {state.error && (
          <p className="mt-4 text-sm text-destructive">{state.error}</p>
        )}
        {state.success && !pending && (
          <p className="mt-4 text-sm text-emerald-400">{state.success}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SubmitRow({ pending, label }: { pending: boolean; label: string }) {
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending ? "Indexing…" : label}
    </Button>
  );
}
