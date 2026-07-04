"use client";

import { useTransition } from "react";
import { Mail, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";
import { revokeInvitation } from "./actions";

export function PendingInvites({
  invitations,
}: {
  invitations: { id: string; email: string; role: string; created_at: string }[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        Pending invitations ({invitations.length})
      </h2>
      <div className="overflow-hidden rounded-xl border">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center gap-3 border-b p-3.5 last:border-0"
          >
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{invitation.email}</p>
              <p className="text-xs text-muted-foreground">
                Invited {timeAgo(invitation.created_at)} ago
              </p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {invitation.role}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              title="Revoke invitation"
              onClick={() =>
                startTransition(() => revokeInvitation(invitation.id))
              }
            >
              <X className="size-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
