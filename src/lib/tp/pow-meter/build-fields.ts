import { INSCHALING_DELIMITER, VERWACHTING_OPENER } from './constants';
import type { PowMeterContentResult } from './schema';

export type PowInschalingData = {
  huidige_trede: string;
  werkzame_uren: string;
  verwachting: string;
};

export type PowMeterFields = {
  pow_meter: string;
  visie_plaatsbaarheid: string;
};

export function stripCitations(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[\d+:\d+\/[^\]]+\.pdf\]/gi, '')
    .replace(/【[^】]+】/g, '')
    .replace(/\[\d+:\d+[^\]]*\]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

export function buildPowInschalingBlock(data: PowInschalingData): string {
  const json = JSON.stringify({
    huidige_trede: data.huidige_trede,
    werkzame_uren: data.werkzame_uren,
    verwachting: data.verwachting,
  });
  return `${INSCHALING_DELIMITER}\n${json}`;
}

export function parsePowInschaling(raw: string): PowInschalingData | null {
  const text = String(raw || '').trim();
  if (!text) return null;

  if (text.includes(INSCHALING_DELIMITER)) {
    const block = text.split(INSCHALING_DELIMITER)[1]?.trim() ?? '';
    try {
      const parsed = JSON.parse(block) as Record<string, unknown>;
      return {
        huidige_trede: String(parsed.huidige_trede ?? '').trim(),
        werkzame_uren: String(parsed.werkzame_uren ?? '').trim(),
        verwachting: String(parsed.verwachting ?? '').trim(),
      };
    } catch {
      return null;
    }
  }

  return null;
}

export function buildPowMeterFields(content: PowMeterContentResult): PowMeterFields {
  const inschaling: PowInschalingData = {
    huidige_trede: stripCitations(content.huidige_trede_tekst),
    werkzame_uren: stripCitations(content.huidige_werkzame_uren),
    verwachting: stripCitations(content.verwachting_3_maanden),
  };

  return {
    pow_meter: buildPowInschalingBlock(inschaling),
    visie_plaatsbaarheid: stripCitations(content.toelichting_pow),
  };
}

export function hasVerwachtingOpener(text: string): boolean {
  return text.trim().toLowerCase().startsWith(VERWACHTING_OPENER.toLowerCase());
}
