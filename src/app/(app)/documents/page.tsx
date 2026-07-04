import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { PageStub } from "@/components/page-stub";

export const metadata: Metadata = { title: "Documents" };

export default function Page() {
  return (
    <PageStub
      title="Documents"
      description="Files, manuals, and policies."
      icon={FileText}
    />
  );
}
