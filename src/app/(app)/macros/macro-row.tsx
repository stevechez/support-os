"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Macro } from "@/lib/database.types";
import { deleteMacro, updateMacro } from "./actions";

export function MacroRow({ macro }: { macro: Macro }) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{macro.title}</p>
          <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
            {macro.body}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="Edit macro"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            title="Delete macro"
            onClick={() => startTransition(() => deleteMacro(macro.id))}
          >
            <Trash2 className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit macro"
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setError(null);
            startTransition(async () => {
              const result = await updateMacro(
                macro.id,
                String(form.get("title") ?? ""),
                String(form.get("body") ?? "")
              );
              if (result.error) setError(result.error);
              else setEditOpen(false);
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor={`title-${macro.id}`}>Title</Label>
            <Input
              id={`title-${macro.id}`}
              name="title"
              required
              defaultValue={macro.title}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`body-${macro.id}`}>Reply text</Label>
            <Textarea
              id={`body-${macro.id}`}
              name="body"
              required
              className="min-h-28"
              defaultValue={macro.body}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
