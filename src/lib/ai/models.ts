import "server-only";

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type ModelInfo = {
  id: string;
  label: string;
  provider: "anthropic" | "openai" | "google";
};

const REGISTRY: (ModelInfo & { envVar: string })[] = [
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    provider: "anthropic",
    envVar: "ANTHROPIC_API_KEY",
  },
  {
    id: "claude-opus-4-8",
    label: "Claude Opus 4.8",
    provider: "anthropic",
    envVar: "ANTHROPIC_API_KEY",
  },
  {
    id: "gpt-5.5",
    label: "GPT-5.5",
    provider: "openai",
    envVar: "OPENAI_API_KEY",
  },
  {
    id: "gpt-5.4-nano",
    label: "GPT-5.4 Nano",
    provider: "openai",
    envVar: "OPENAI_API_KEY",
  },
  {
    id: "gemini-pro-latest",
    label: "Gemini Pro",
    provider: "google",
    envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
  },
  {
    id: "gemini-flash-latest",
    label: "Gemini Flash",
    provider: "google",
    envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
  },
];

/** Models whose provider has an API key configured. */
export function availableModels(): ModelInfo[] {
  return REGISTRY.filter((m) => !!process.env[m.envVar]).map(
    ({ id, label, provider }) => ({ id, label, provider })
  );
}

export function resolveModel(id: string | undefined): {
  model: LanguageModel;
  info: ModelInfo;
} | null {
  const available = REGISTRY.filter((m) => !!process.env[m.envVar]);
  const entry = available.find((m) => m.id === id) ?? available[0];
  if (!entry) return null;

  const model =
    entry.provider === "anthropic"
      ? anthropic(entry.id)
      : entry.provider === "openai"
        ? openai(entry.id)
        : google(entry.id);

  return {
    model,
    info: {
      id: entry.id,
      label: entry.label,
      provider: entry.provider,
    },
  };
}
