import type { Metadata } from "next";
import { Bot } from "lucide-react";

import { PageStub } from "@/components/page-stub";

export const metadata: Metadata = { title: "AI Agent" };

export default function Page() {
  return (
    <PageStub
      title="AI Agent"
      description="Configure the agents that resolve your tickets."
      icon={Bot}
    />
  );
}
