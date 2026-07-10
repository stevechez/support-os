"use client";

import { useActionState, useRef } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { importTickets, type ImportState } from "./import-actions";

const initialState: ImportState = {};

export function ImportSettings() {
  const [state, action, pending] = useActionState(importTickets, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from Zendesk or Intercom</CardTitle>
        <CardDescription>
          Bring your ticket history over so agents have context on day one.
          Export your tickets/conversations as CSV, then upload the file
          here — each row becomes a ticket tagged{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">imported</code>
          . This is a one-time historical backfill; imported tickets don&apos;t
          trigger automations or use AI budget.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          action={async (formData) => {
            await action(formData);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <select
              id="source"
              name="source"
              defaultValue="zendesk"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="zendesk">Zendesk (tickets export)</option>
              <option value="intercom">Intercom (conversations export)</option>
              <option value="generic">Generic CSV</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">CSV file</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className="flex h-9 w-full items-center rounded-md border border-input bg-transparent text-sm shadow-sm file:mr-3 file:h-full file:border-0 file:bg-muted file:px-3 file:text-sm file:font-medium"
            />
          </div>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state.success && (
            <p className="text-sm text-primary">{state.success}</p>
          )}

          <Button type="submit" disabled={pending} className="gap-2">
            <Upload className="size-4" />
            {pending ? "Importing…" : "Import tickets"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
