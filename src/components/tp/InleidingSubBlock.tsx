"use client";

import React from "react";

const DELIMITER = "staat het volgende:";
const NB_PATTERN = "nog geen AD-rapport";

/**
 * Renders inleiding_sub using delimiter-based parsing.
 * Intro (up to and including "staat het volgende:") = bold.
 * Quote (rest) = italic.
 * No markdown parsing - reliable for all stored formats.
 */
export function InleidingSubBlock({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;

  // NB default (no AD report) - render as plain text
  if (text.includes("N.B.:") && text.includes(NB_PATTERN)) {
    return <p className={className}>{text}</p>;
  }

  const idx = text.indexOf(DELIMITER);
  if (idx !== -1) {
    const intro = text
      .slice(0, idx + DELIMITER.length)
      .replace(/\*+/g, "")
      .trim();
    const quote = text
      .slice(idx + DELIMITER.length)
      .replace(/\*+/g, "")
      .trim();
    return (
      <div className={className}>
        <strong>{intro}</strong>
        {quote && (
          <p className="mt-4">
            <em>{quote}</em>
          </p>
        )}
      </div>
    );
  }

  // Fallback for legacy/malformed data
  return <p className={className}>{text}</p>;
}
