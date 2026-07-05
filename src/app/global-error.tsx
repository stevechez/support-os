"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body
        style={{
          display: "flex",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0f0f",
          color: "#ededed",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ opacity: 0.7, marginBottom: 20 }}>
            The error has been reported. Try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,.15)",
              background: "#ededed",
              color: "#111",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
