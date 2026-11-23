/** Shared list-marker helpers for Belastbaarheidsprofiel editor ↔ preview. */

/** Line starts with a logo-bullet marker (unicode •, markdown -/* , checkmarks). */
export function isLogoBulletLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return /^[•☑✓]\s*/.test(t) || /^[-*]\s+/.test(t);
}

/** Strip a leading logo-bullet marker; returns the line content. */
export function stripLogoBulletPrefix(line: string): string {
  return line.trim().replace(/^[•☑✓]\s*/, '').replace(/^[-*]\s+/, '');
}

/**
 * Normalize markdown / checkmark list markers in a limitations block to canonical `• ` lines
 * so autofill output and MDXEditor saves stay aligned with the Z-logo preview splitter.
 */
export function normalizeLimitationsListMarkers(markdown: string): string {
  return String(markdown || '').replace(/^([-*]|[☑✓])\s+/gm, '• ');
}

/** First bullet line index (requires a newline before the marker, matching intro + list). */
export function splitBeforeRubrieken(text: string): { intro: string; rest: string } {
  const bulletIdx = text.search(/\n(?:•|[☑✓]|[-*])\s/);
  if (bulletIdx === -1) return { intro: text.trim(), rest: '' };
  return {
    intro: text.slice(0, bulletIdx).trim(),
    rest: text.slice(bulletIdx).trim(),
  };
}

export function splitAfterRubrieken(rest: string): { bullets: string; spreekuurIntro: string } {
  const parts = rest.split(/\n\n+/);
  const bulletParts: string[] = [];
  const textParts: string[] = [];

  for (const part of parts) {
    if (isLogoBulletLine(part)) {
      bulletParts.push(part);
    } else {
      textParts.push(part);
    }
  }

  return {
    bullets: bulletParts.join('\n\n'),
    spreekuurIntro: textParts.join('\n\n').trim(),
  };
}
