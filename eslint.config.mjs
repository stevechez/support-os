import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Extra Next.js build-output dirs used for one-off local verification
    // (e.g. `NEXT_DIST_DIR=.next-verify next build`) — these contain the
    // same auto-generated, unlintable type-validator scaffolding as .next.
    ".next-*/**",
  ]),
]);

export default eslintConfig;
