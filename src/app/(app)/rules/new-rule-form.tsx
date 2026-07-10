"use client";

import { useRef, useState, useTransition } from "react";
import { FlaskConical, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { PreviewMatch } from "@/lib/rules/preview";
import { createRule, previewNewRuleImpact } from "./actions";

export function NewRuleForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [previewPending, startPreview] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<
    { matches: PreviewMatch[]; sampleSize: number } | null
  >(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New rule
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New business rule</CardTitle>
        <CardDescription>
          Any match (tag, intent, keyword, or pattern) trips the rule. Escalated
          replies never reach the customer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setError(null);
            startTransition(async () => {
              const result = await createRule({
                name: String(form.get("name") ?? ""),
                description: String(form.get("description") ?? ""),
                matchTags: String(form.get("matchTags") ?? ""),
                matchIntents: String(form.get("matchIntents") ?? ""),
                matchKeywords: String(form.get("matchKeywords") ?? ""),
                matchRegex: String(form.get("matchRegex") ?? ""),
                action: form.get("action") === "require_approval"
                  ? "require_approval"
                  : "escalate",
              });
              if (result.error) {
                setError(result.error);
              } else {
                setOpen(false);
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Escalate refund requests" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" className="min-h-16" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="matchTags">Match tags (comma-separated)</Label>
              <Input id="matchTags" name="matchTags" placeholder="refund, legal" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matchIntents">Match intents (comma-separated)</Label>
              <Input id="matchIntents" name="matchIntents" placeholder="refund" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="matchKeywords">Match keywords in conversation or reply (comma-separated)</Label>
            <Input id="matchKeywords" name="matchKeywords" placeholder="lawsuit, chargeback" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="matchRegex">Match pattern in AI reply (regex, optional)</Label>
            <Input id="matchRegex" name="matchRegex" placeholder="\$\s?\d" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="action">When triggered</Label>
            <NativeSelect id="action" name="action" defaultValue="escalate">
              <option value="escalate">Escalate to a human</option>
              <option value="require_approval">Require approval</option>
            </NativeSelect>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}

          {preview && (
            <div className="rounded-lg border bg-card/50 p-3 text-sm">
              <p className="font-medium">
                Would have flagged {preview.matches.length} of your last{" "}
                {preview.sampleSize} tickets
              </p>
              {preview.matches.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {preview.matches.slice(0, 8).map((m) => (
                    <li key={m.ticketId} className="truncate">
                      &ldquo;{m.subject}&rdquo; — {m.reason}
                    </li>
                  ))}
                  {preview.matches.length > 8 && (
                    <li>…and {preview.matches.length - 8} more</li>
                  )}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={previewPending}
              onClick={() => {
                if (!formRef.current) return;
                const form = new FormData(formRef.current);
                startPreview(async () => {
                  const result = await previewNewRuleImpact({
                    matchTags: String(form.get("matchTags") ?? ""),
                    matchIntents: String(form.get("matchIntents") ?? ""),
                    matchKeywords: String(form.get("matchKeywords") ?? ""),
                    matchRegex: String(form.get("matchRegex") ?? ""),
                  });
                  if ("error" in result) {
                    setError(result.error);
                  } else {
                    setPreview(result);
                  }
                });
              }}
            >
              <FlaskConical className="size-4" />
              {previewPending ? "Testing…" : "Preview impact"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Create rule"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
