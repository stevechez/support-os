import type { Metadata } from "next";
import { Suspense } from "react";

import { HelpCenter } from "./help-center";

export const metadata: Metadata = {
  title: "Help Center",
  robots: { index: false },
};

export default function HelpPage() {
  return (
    <Suspense>
      <HelpCenter />
    </Suspense>
  );
}
