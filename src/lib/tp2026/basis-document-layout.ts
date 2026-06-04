/** Shared layout tokens for TP 2026 basis document (part 3) body sections. */

import { WETTELIJKE_KADERS } from '@/lib/tp/static';

export const TP_BASIS_BODY_BOX_CLASS = 'bg-[#f3efe4] p-2.5 text-neutral-900';

export const TP_BASIS_TOELICHTING_CLASS =
  'mb-1.5 text-[12px] font-bold leading-tight text-[#64b6a6]';

export const TP_BASIS_TOELICHTING_DEFAULT = 'Toelichting';

export const TP_BASIS_TOELICHTING_POW = 'Toelichting POW-meter™';

export const TP_WK_INTRO_LINE =
  'Werknemer heeft uitleg en informatie gekregen over onderstaande punten:';

const LEGACY_WK_INTRO = /^Ik heb werknemer uitleg gegeven over:?\s*/i;

/** Bullet body for Wettelijke kaders — strips legacy intro lines from stored markdown. */
export function normalizeWkMarkdown(md: string): string {
  let body = String(md || '').trim();
  if (!body) return WETTELIJKE_KADERS.trim();

  const lines = body.split('\n');
  const first = lines[0]?.trim() ?? '';

  if (LEGACY_WK_INTRO.test(first)) {
    body = lines.slice(1).join('\n').trim();
  } else if (first.startsWith('Werknemer heeft uitleg en informatie gekregen')) {
    body = lines.slice(1).join('\n').trim();
  }

  return body || WETTELIJKE_KADERS.trim();
}

/** Field keys that get an in-box Toelichting heading (inleiding handled separately). */
export const TP_BASIS_TOELICHTING_TEXT_KEYS = new Set([
  'soc',
  'visw',
  'prof',
  'blem',
  'vlb',
  'zp',
]);

export function getBasisToelichtingLabel(key: string): string | null {
  if (key === 'plaats') return TP_BASIS_TOELICHTING_POW;
  if (TP_BASIS_TOELICHTING_TEXT_KEYS.has(key)) return TP_BASIS_TOELICHTING_DEFAULT;
  return null;
}
