"use client";

import { useActionState, useState, useTransition } from "react";
import { Pencil, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addCustomerTag,
  removeCustomerTag,
  updateCustomerDetails,
  updateCustomerNotes,
  type CustomerActionState,
} from "../actions";

const initial: CustomerActionState = {};

export function TagsEditor({
  customerId,
  tags,
}: {
  customerId: string;
  tags: string[];
}) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 text-[10px]">
          {tag}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            disabled={pending}
            onClick={() =>
              startTransition(() => removeCustomerTag(customerId, tag))
            }
            className="opacity-60 transition-opacity hover:opacity-100"
          >
            <X className="size-2.5" />
          </button>
        </Badge>
      ))}

      {adding ? (
        <form
          className="inline-flex"
          onSubmit={(e) => {
            e.preventDefault();
            const tag = value.trim();
            setValue("");
            setAdding(false);
            if (tag) startTransition(() => addCustomerTag(customerId, tag));
          }}
        >
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={(e) => {
              if (!e.currentTarget.value.trim()) setAdding(false);
            }}
            placeholder="tag…"
            className="h-5 w-24 rounded-full border bg-transparent px-2 text-[10px] outline-none"
          />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex h-5 items-center gap-0.5 rounded-full border border-dashed px-2 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="size-2.5" /> tag
        </button>
      )}
    </div>
  );
}

export function NotesEditor({
  customerId,
  notes,
}: {
  customerId: string;
  notes: string | null;
}) {
  const [state, action, pending] = useActionState(
    updateCustomerNotes,
    initial
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-2">
          <input type="hidden" name="id" value={customerId} />
          <Textarea
            name="notes"
            defaultValue={notes ?? ""}
            placeholder="Internal notes about this customer…"
            className="min-h-24"
          />
          <div className="flex items-center justify-end gap-3">
            {state.error && (
              <p className="text-xs text-destructive">{state.error}</p>
            )}
            {state.success && !pending && (
              <p className="text-xs text-emerald-400">Saved</p>
            )}
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save notes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function EditDetailsButton({
  customer,
}: {
  customer: {
    id: string;
    name: string | null;
    company: string | null;
    phone: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: CustomerActionState, formData: FormData) => {
      const res = await updateCustomerDetails(prev, formData);
      if (res.success) setOpen(false);
      return res;
    },
    initial
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        title="Edit details"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-4 text-muted-foreground" />
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Edit customer"
        description="Contact details shown across tickets."
      >
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={customer.id} />
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={customer.name ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                name="company"
                defaultValue={customer.company ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={customer.phone ?? ""}
              />
            </div>
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
