"use client";

import { createContext, useContext, useState } from "react";

type InboxContextValue = {
  draft: string;
  setDraft: (value: string) => void;
};

const InboxContext = createContext<InboxContextValue | null>(null);

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState("");
  return (
    <InboxContext.Provider value={{ draft, setDraft }}>
      {children}
    </InboxContext.Provider>
  );
}

export function useInbox() {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error("useInbox must be used within InboxProvider");
  return ctx;
}
