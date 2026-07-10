"use client";

import { useState, useTransition } from "react";
import { History, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { EntityVersion, VersionedEntityType } from "@/lib/database.types";
import { fetchVersions, restoreEntityVersion } from "@/lib/versions/actions";

export function VersionHistoryButton({
  entityType,
  entityId,
  revalidatePath,
}: {
  entityType: VersionedEntityType;
  entityId: string;
  revalidatePath: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<EntityVersion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    setLoading(true);
    setError(null);
    fetchVersions(entityType, entityId).then((res) => {
      if ("error" in res) setError(res.error);
      else setVersions(res.versions);
      setLoading(false);
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        title="Version history"
        onClick={() => {
          setOpen(true);
          load();
        }}
      >
        <History className="size-4 text-muted-foreground" />
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Version history"
        description="Every saved change, restorable at any time."
      >
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {loading && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loading && !error && versions.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No history yet.
            </p>
          )}
          {versions.map((v, i) => (
            <div
              key={v.id}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm">
                  {i === 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      current
                    </Badge>
                  )}
                  {v.change_note ?? "Saved"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(v.created_at).toLocaleString()}
                </p>
              </div>
              {i !== 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await restoreEntityVersion(v.id, revalidatePath);
                      if (!("error" in res && res.error)) load();
                    })
                  }
                >
                  <RotateCcw className="size-3.5" /> Restore
                </Button>
              )}
            </div>
          ))}
        </div>
      </Dialog>
    </>
  );
}
