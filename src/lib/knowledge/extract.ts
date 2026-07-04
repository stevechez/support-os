import "server-only";

import mammoth from "mammoth";
import { extractText } from "unpdf";

export type ExtractResult = { text: string; title?: string };

export async function extractFromFile(
  fileName: string,
  buffer: ArrayBuffer
): Promise<ExtractResult> {
  const ext = fileName.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "pdf": {
      const { text } = await extractText(new Uint8Array(buffer), {
        mergePages: true,
      });
      return { text };
    }
    case "docx": {
      const { value } = await mammoth.extractRawText({
        buffer: Buffer.from(buffer),
      });
      return { text: value };
    }
    case "md":
    case "markdown":
    case "txt": {
      const text = new TextDecoder().decode(buffer);
      const heading = text.match(/^#\s+(.+)$/m)?.[1];
      return { text, title: heading };
    }
    default:
      throw new Error(
        `Unsupported file type ".${ext}". Supported: pdf, docx, md, txt.`
      );
  }
}

/** Fetch a URL and reduce its HTML to readable text. */
export async function extractFromUrl(url: string): Promise<ExtractResult> {
  const res = await fetch(url, {
    headers: { "user-agent": "SupportOS knowledge indexer" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);

  const html = await res.text();
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<(h[1-6]|p|li|br|tr|div)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n\n")
    .trim();

  return { text, title };
}
