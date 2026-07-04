import "server-only";

import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

export const EMBEDDING_DIMS = 1536;

function embeddingModel() {
  if (process.env.OPENAI_API_KEY) {
    return {
      model: openai.textEmbedding("text-embedding-3-small"),
      providerOptions: undefined,
    };
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return {
      model: google.textEmbedding("gemini-embedding-2"),
      providerOptions: {
        google: { outputDimensionality: EMBEDDING_DIMS },
      },
    };
  }
  return null;
}

export function embeddingsAvailable(): boolean {
  return embeddingModel() !== null;
}

export const NO_EMBEDDINGS_ERROR =
  "Embeddings need an OpenAI or Google API key (Anthropic doesn't offer an embeddings API). Add OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY to .env.local.";

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const resolved = embeddingModel();
  if (!resolved) throw new Error(NO_EMBEDDINGS_ERROR);

  const { embeddings } = await embedMany({
    model: resolved.model,
    values: texts,
    providerOptions: resolved.providerOptions,
  });
  return embeddings;
}

export async function embedQuery(text: string): Promise<number[]> {
  const resolved = embeddingModel();
  if (!resolved) throw new Error(NO_EMBEDDINGS_ERROR);

  const { embedding } = await embed({
    model: resolved.model,
    value: text,
    providerOptions: resolved.providerOptions,
  });
  return embedding;
}
