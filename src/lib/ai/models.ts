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

function buildModel(entry: ModelInfo): LanguageModel {
  return entry.provider === "anthropic"
    ? anthropic(entry.id)
    : entry.provider === "openai"
      ? openai(entry.id)
      : google(entry.id);
}

export function resolveModel(id: string | undefined): {
  model: LanguageModel;
  info: ModelInfo;
} | null {
  const available = REGISTRY.filter((m) => !!process.env[m.envVar]);
  const entry = available.find((m) => m.id === id) ?? available[0];
  if (!entry) return null;

  return {
    model: buildModel(entry),
    info: {
      id: entry.id,
      label: entry.label,
      provider: entry.provider,
    },
  };
}

/**
 * Ordered, deduped list of models to try: the preferred id first (if its
 * provider is configured), then one model per remaining configured
 * provider, in registry order. Used to fail over across providers rather
 * than just across models within the same provider.
 */
export function failoverCandidates(preferredId: string | undefined): ModelInfo[] {
  const available = REGISTRY.filter((m) => !!process.env[m.envVar]);
  const seenProviders = new Set<string>();
  const ordered: ModelInfo[] = [];

  const preferred = available.find((m) => m.id === preferredId);
  if (preferred) {
    ordered.push(preferred);
    seenProviders.add(preferred.provider);
  }

  for (const entry of available) {
    if (seenProviders.has(entry.provider)) continue;
    ordered.push(entry);
    seenProviders.add(entry.provider);
  }

  return ordered.map(({ id, label, provider }) => ({ id, label, provider }));
}

/**
 * Run `attempt` against each candidate model in order, moving to the next
 * provider if a call throws (e.g. the configured provider is down, rate
 * limited, or the key is invalid). Throws the last error if every
 * candidate fails, or a clear "no provider configured" error if none are
 * available at all.
 */
export async function withModelFailover<T>(
  preferredId: string | undefined,
  attempt: (model: LanguageModel, info: ModelInfo) => Promise<T>
): Promise<T> {
  const candidates = failoverCandidates(preferredId);
  if (candidates.length === 0) throw new Error("No AI provider configured");

  let lastError: unknown;
  for (const info of candidates) {
    try {
      return await attempt(buildModel(info), info);
    } catch (err) {
      lastError = err;
      console.error(
        `[ai] provider ${info.provider} (${info.id}) failed, trying next candidate`,
        err
      );
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("All configured AI providers failed");
}
