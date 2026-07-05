"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { Enums } from "@/lib/database.types";
import { initials, timeAgo } from "@/lib/format";
import { removeMember, updateMemberRole } from "./actions";

type Role = Enums<"member_role">;

type Member = {
  id: string;
  display_name: string | null;
  role: Role;
  created_at: string;
};

export function MembersList({
  members,
  currentMemberId,
  canManage,
  isOwner,
}: {
  members: Member[];
  currentMemberId: string;
  canManage: boolean;
  isOwner: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function act(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        Members ({members.length})
      </h2>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto rounded-xl border">
        {members.map((member) => {
          const name = member.display_name ?? "Member";
          const isSelf = member.id === currentMemberId;
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 border-b p-3.5 last:border-0"
            >
              <Avatar className="size-9">
                <AvatarFallback>{initials(name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {name}
                  {isSelf && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      (you)
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Joined {timeAgo(member.created_at)} ago
                </p>
              </div>

              {canManage && !isSelf ? (
                <>
                  <NativeSelect
                    className="w-28"
                    value={member.role}
                    disabled={pending}
                    onChange={(e) =>
                      act(() =>
                        updateMemberRole(member.id, e.target.value as Role)
                      )
                    }
                  >
                    {isOwner && <option value="owner">Owner</option>}
                    <option value="admin">Admin</option>
                    <option value="agent">Agent</option>
                    <option value="viewer">Viewer</option>
                  </NativeSelect>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending || member.role === "owner"}
                    title={
                      member.role === "owner"
                        ? "Owners can't be removed"
                        : "Remove member"
                    }
                    onClick={() => act(() => removeMember(member.id))}
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </>
              ) : (
                <Badge variant="secondary" className="capitalize">
                  {member.role}
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
