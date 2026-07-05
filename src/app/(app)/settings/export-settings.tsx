"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DataExportSettings({ canManage }: { canManage: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Data export</CardTitle>
        <CardDescription>
          Download every customer, ticket, message, and knowledge document in
          your workspace as a single JSON file.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canManage ? (
          <Button asChild>
            <a href="/api/export" download>
              <Download className="size-4" />
              Export workspace data
            </a>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Only workspace admins and owners can export data.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
