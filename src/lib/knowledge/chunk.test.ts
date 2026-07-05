import { describe, expect, it } from "vitest";

import { chunkText } from "./chunk";

describe("chunkText", () => {
  it("returns empty array for empty input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("returns a single chunk for short text", () => {
    const text = "Our refund policy allows returns within 30 days.";
    expect(chunkText(text)).toEqual([text]);
  });

  it("normalizes CRLF and collapses excessive blank lines", () => {
    const text = "The first line of policy.\r\n\r\n\r\n\r\nThe second line of policy.";
    expect(chunkText(text)).toEqual([
      "The first line of policy.\n\nThe second line of policy.",
    ]);
  });

  it("splits long documents into multiple chunks", () => {
    const paragraph = "This paragraph is about refunds and policies. ".repeat(
      10
    );
    const text = Array.from({ length: 10 }, () => paragraph).join("\n\n");
    const chunks = chunkText(text);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      // Target size 1200 + carried overlap headroom.
      expect(chunk.length).toBeLessThanOrEqual(1600);
    }
  });

  it("carries overlap between chunks for context continuity", () => {
    const para = (n: number) =>
      `Paragraph ${n}: ${"lorem ipsum dolor sit amet ".repeat(20)}`.trim();
    const text = [para(1), para(2), para(3), para(4)].join("\n\n");
    const chunks = chunkText(text);

    expect(chunks.length).toBeGreaterThan(1);
    // The tail of chunk 1 should reappear at the head of chunk 2.
    const tail = chunks[0].slice(-50);
    expect(chunks[1]).toContain(tail.slice(-30));
  });

  it("hard-splits single paragraphs larger than the target", () => {
    const giant = "x".repeat(5000);
    const chunks = chunkText(giant);
    expect(chunks.length).toBeGreaterThan(3);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(1200);
    }
  });

  it("drops trivially small fragments", () => {
    for (const chunk of chunkText("ok")) {
      expect(chunk.length).toBeGreaterThan(20);
    }
  });
});
