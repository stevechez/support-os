"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { BusinessRule } from "@/lib/rules/types";
import { updateRule } from "./actions";

export function EditRuleDialog({ rule }: { rule: BusinessRule }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button variant="ghost" size="icon" title="Edit rule" onClick={() => setOpen(true)}>
        <Pencil className="size-4 text-muted-foreground" />
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Edit business rule"
        description="Changes are versioned — you can always roll back."
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setError(null);
            startTransition(async () => {
              const result = await updateRule(rule.id, {
                name: String(form.get("name") ?? ""),
                description: String(form.get("description") ?? ""),
                matchTags: String(form.get("matchTags") ?? ""),
                matchIntents: String(form.get("matchIntents") ?? ""),
                matchKeywords: String(form.get("matchKeywords") ?? ""),
                matchRegex: String(form.get("matchRegex") ?? ""),
                action:
                  form.get("action") === "require_approval"
                    ? "require_approval"
                    : "escalate",
              });
              if (result.error) setError(result.error);
              else setOpen(false);
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required defaultValue={rule.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              className="min-h-16"
              defaultValue={rule.description ?? ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="matchTags">Match tags (comma-separated)</Label>
              <Input id="matchTags" name="matchTags" defaultValue={rule.match_tags.join(", ")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matchIntents">Match intents (comma-separated)</Label>
              <Input
                id="matchIntents"
                name="matchIntents"
                defaultValue={rule.match_intents.join(", ")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="matchKeywords">
              Match keywords in conversation or reply (comma-separated)
            </Label>
            <Input
              id="matchKeywords"
              name="matchKeywords"
              defaultValue={rule.match_keywords.join(", ")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="matchRegex">Match pattern in AI reply (regex, optional)</Label>
            <Input id="matchRegex" name="matchRegex" defaultValue={rule.match_regex ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="action">When triggered</Label>
            <NativeSelect id="action" name="action" defaultValue={rule.action}>
              <option value="escalate">Escalate to a human</option>
              <option value="require_approval">Require approval</option>
            </NativeSelect>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
