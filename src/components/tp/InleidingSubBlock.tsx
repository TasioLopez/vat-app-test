"use client";

import React from "react";
import { AD_INTRO_SUFFIX } from "@/lib/tp/inleiding/constants";

/** Longest match first so the V2 AD intro is preferred over the legacy delimiter. */
const AD_DELIMITERS = [
  AD_INTRO_SUFFIX,
  "staat het volgende:",
].sort((a, b) => b.length - a.length);

const NB_PATTERN = "nog geen AD-rapport";

function findAdDelimiterIndex(text: string): { index: number; delimiter: string } | null {
  for (const delimiter of AD_DELIMITERS) {
    const idx = text.indexOf(delimiter);
    if (idx !== -1) return { index: idx, delimiter };
  }
  return null;
}

function stripQuoteWrapping(quote: string): string {
  let q = quote.replace(/\*+/g, "").trim();
  if (q.startsWith('"') && q.endsWith('"')) {
    q = q.slice(1, -1).trim();
  }
  return q;
}

/**
 * Renders inleiding_sub using delimiter-based parsing.
 * Intro (up to and including the AD delimiter phrase) = bold.
 * Quote (rest) = italic with quotation marks.
 */
export function InleidingSubBlock({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;

  if (text.includes("N.B.:") && text.includes(NB_PATTERN)) {
    return <p className={className}>{text}</p>;
  }

  const match = findAdDelimiterIndex(text);
  if (match) {
    const intro = text
      .slice(0, match.index + match.delimiter.length)
      .replace(/\*+/g, "")
      .trim();
    const quote = stripQuoteWrapping(text.slice(match.index + match.delimiter.length));
    return (
      <div className={className}>
        <strong>{intro}</strong>
        {quote && (
          <p className="mt-4">
            <em>&ldquo;{quote}&rdquo;</em>
          </p>
        )}
      </div>
    );
  }

  return <p className={className}>{text}</p>;
}
