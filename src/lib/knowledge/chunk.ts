const TARGET_SIZE = 1200;
const OVERLAP = 150;

/**
 * Paragraph-aware chunker: packs paragraphs up to ~TARGET_SIZE chars,
 * carrying a small overlap between chunks for context continuity.
 */
export function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= TARGET_SIZE) return [clean];

  const paragraphs = clean.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    // Hard-split single paragraphs that exceed the target on their own.
    if (para.length > TARGET_SIZE) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = "";
      }
      for (let i = 0; i < para.length; i += TARGET_SIZE - OVERLAP) {
        chunks.push(para.slice(i, i + TARGET_SIZE).trim());
      }
      continue;
    }

    if (current.length + para.length + 2 > TARGET_SIZE && current.trim()) {
      chunks.push(current.trim());
      current = current.slice(-OVERLAP) + "\n\n";
    }
    current += para + "\n\n";
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 20);
}
