import type { Metadata } from "next";
import { Suspense } from "react";

import { WidgetChat } from "./widget-chat";

export const metadata: Metadata = {
  title: "Support chat",
  robots: { index: false },
};

export default function WidgetPage() {
  return (
    <Suspense>
      <WidgetChat />
    </Suspense>
  );
}
