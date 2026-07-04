import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { PageStub } from "@/components/page-stub";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return (
    <PageStub
      title="Analytics"
      description="Understand your support performance."
      icon={BarChart3}
    />
  );
}
