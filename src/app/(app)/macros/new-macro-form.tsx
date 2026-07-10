"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { createMacro } from "./actions";

export function NewMacroForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New macro
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New macro</CardTitle>
        <CardDescription>
          A reusable reply your team can insert with one click.
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
              const result = await createMacro(
                String(form.get("title") ?? ""),
                String(form.get("body") ?? "")
              );
              if (result.error) {
                setError(result.error);
              } else {
                setOpen(false);
                formRef.current?.reset();
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="Refund policy" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Reply text</Label>
            <Textarea
              id="body"
              name="body"
              required
              className="min-h-28"
              placeholder={`Hi {{customer_name}},\n\nThanks for reaching out...`}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Create macro"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
