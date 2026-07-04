"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITIES } from "@/lib/ticket-ui";
import { createTicket, type TicketFormState } from "./actions";

const initialState: TicketFormState = {};

export function NewTicketButton() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createTicket, initialState);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New ticket
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="New ticket"
        description="Create a ticket on behalf of a customer."
      >
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              name="subject"
              required
              placeholder="Refund request for order #1234"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">Customer email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="customer@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Customer name</Label>
              <Input id="name" name="name" placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <NativeSelect id="priority" name="priority" defaultValue="medium">
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p[0].toUpperCase() + p.slice(1)}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">First message</Label>
            <Textarea
              id="body"
              name="body"
              placeholder="What did the customer say? (optional)"
            />
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
              {pending ? "Creating…" : "Create ticket"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
