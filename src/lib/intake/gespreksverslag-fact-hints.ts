import { ensureIntakeShape, type IntakeData } from '@/lib/intake/schema';

/**
 * Deterministic shared-fact hints from gespreksverslag prose.
 * Only fills blanks — never overwrites intake/PDF values.
 */
export function applyGespreksverslagFactHints(raw: unknown, text: string | null | undefined): IntakeData {
  const data = ensureIntakeShape(raw);
  if (!text || !text.trim()) return data;
  const normalized = text.replace(/\u00a0/g, ' ');

  if (!String(data.s2.contract_hours || '').trim()) {
    const hours = normalized.match(/\b(\d{1,2})\s*uur(?:en)?\s*per\s*week\b/i);
    if (hours?.[1]) data.s2.contract_hours = hours[1];
  }

  const speaksDutch = /spreekt(?:\s+en\s+schrijft)?\s+Nederlands\b/i.test(normalized);
  const writesDutch = /schrijft\s+Nederlands\b/i.test(normalized) || /spreekt\s+en\s+schrijft\s+Nederlands\b/i.test(normalized);
  if (speaksDutch && !String(data.s17.dutch_speaking || '').trim()) data.s17.dutch_speaking = 'Goed';
  if (writesDutch && !String(data.s17.dutch_writing || '').trim()) data.s17.dutch_writing = 'Goed';

  // Own car ≠ driver's license; do not invent rijbewijs from "eigen auto".
  if (!data.s17.transport_types.length && /\beigen auto\b/i.test(normalized)) {
    data.s17.transport_types = ['Auto'];
  }

  return data;
}
