import path from "path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

// No-op without SENTRY_AUTH_TOKEN/DSN; uploads sourcemaps when configured.
export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
});
