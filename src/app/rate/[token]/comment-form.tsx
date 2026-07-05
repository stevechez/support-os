"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitCsatComment, type CommentState } from "./actions";

const initial: CommentState = {};

export function CommentForm({
  token,
  existingComment,
}: {
  token: string;
  existingComment: string | null;
}) {
  const [state, action, pending] = useActionState(submitCsatComment, initial);

  if (state.done || existingComment) {
    return (
      <p className="text-sm text-muted-foreground">
        {state.done
          ? "Comment received — thanks for the details."
          : "We received your feedback."}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3 text-left">
      <Textarea
        name="comment"
        placeholder="Anything you'd like to add? (optional)"
        className="min-h-24"
      />
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send feedback"}
      </Button>
    </form>
  );
}
