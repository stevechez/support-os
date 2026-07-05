"use client";

import { useTransition } from "react";
import { FileText, Globe, Loader2, PenLine, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/lib/database.types";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteKnowledgeDocument } from "./actions";

type Doc = Tables<"knowledge_documents"> & { chunkCount: number };

const statusStyles: Record<string, string> = {
  ready: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  indexing: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  pending: "bg-muted text-muted-foreground border-transparent",
  error: "bg-red-500/15 text-red-400 border-red-500/20",
};

const sourceIcons = {
  upload: FileText,
  url: Globe,
  markdown: PenLine,
  faq: PenLine,
} as const;

export function DocumentsTable({ documents }: { documents: Doc[] }) {
  const [pending, startTransition] = useTransition();

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        Nothing indexed yet. Upload your first document above.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-card/50 text-left text-xs text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Document</th>
            <th className="px-4 py-2.5 font-medium">Source</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Chunks</th>
            <th className="px-4 py-2.5 font-medium">Added</th>
            <th className="w-12 px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const Icon =
              sourceIcons[doc.source_type as keyof typeof sourceIcons] ??
              FileText;
            return (
              <tr
                key={doc.id}
                className="border-b last:border-0 transition-colors hover:bg-accent/40"
              >
                <td className="max-w-72 px-4 py-3">
                  <span className="flex items-center gap-2.5">
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">{doc.title}</span>
                  </span>
                  {doc.source_url && (
                    <span className="ml-6.5 block truncate pl-0.5 text-xs text-muted-foreground">
                      {doc.source_url}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground">
                  {doc.source_type}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize",
                      statusStyles[doc.status] ?? statusStyles.pending
                    )}
                  >
                    {doc.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {doc.chunkCount}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {timeAgo(doc.created_at)}
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    title="Delete document"
                    onClick={() =>
                      startTransition(() => deleteKnowledgeDocument(doc.id))
                    }
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
