import { buildArtsPhrase, nlDate } from '@/lib/tp/format-context';
import {
  FML_INTRO_TEMPLATE,
  MEDISCH_SPREEKUUR_INTRO_TEMPLATE,
  PROGNOSE_DELIMITER,
  STANDARD_RUBRIEKEN,
} from './constants';
import type { BelastbaarheidsprofielContentResult } from './schema';

export type BelastbaarheidsprofielBuildContext = {
  has_spreekuurrapportage?: boolean;
  meta: {
    fml_izp_lab_date?: string | null;
    occupational_doctor_org?: string | null;
  };
};

export type BelastbaarheidsprofielFields = {
  prognose_bedrijfsarts: string;
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

function normalizeRubrieken(rubrieken: string[]): string[] {
  const cleaned = rubrieken.map((r) => r.trim()).filter(Boolean);
  if (cleaned.length > 0) return cleaned;
  return [...STANDARD_RUBRIEKEN];
}

function fillTemplate(
  template: string,
  vars: { datum: string; artsPhrase: string }
): string {
  return template.replace('{datum}', vars.datum).replace('{artsPhrase}', vars.artsPhrase);
}

function resolveIntroVars(
  ctx: BelastbaarheidsprofielBuildContext,
  content: BelastbaarheidsprofielContentResult
): { datum: string; artsPhrase: string } {
  const spreekuurMeta = content.spreekuur_meta;
  if (spreekuurMeta?.datum || spreekuurMeta?.arts_org) {
    return {
      datum: nlDate(spreekuurMeta.datum) || '[datum spreekuur]',
      artsPhrase: buildArtsPhrase(spreekuurMeta.arts_org),
    };
  }

  return {
    datum: nlDate(ctx.meta.fml_izp_lab_date) || '[datum FML]',
    artsPhrase: buildArtsPhrase(ctx.meta.occupational_doctor_org),
  };
}

export function buildBelastbaarheidsprofielFields(
  ctx: BelastbaarheidsprofielBuildContext,
  content: BelastbaarheidsprofielContentResult
): BelastbaarheidsprofielFields {
  const introVars = resolveIntroVars(ctx, content);

  const fmlIntro = fillTemplate(FML_INTRO_TEMPLATE, introVars);
  const spreekuurIntro = fillTemplate(MEDISCH_SPREEKUUR_INTRO_TEMPLATE, introVars);
  const rubriekenLines = normalizeRubrieken(content.rubrieken)
    .map((r) => `• ${r}`)
    .join('\n');

  const quoteParts: string[] = [];
  if (content.prognose_citaat) {
    quoteParts.push(stripCitations(content.prognose_citaat));
  }
  if (content.reintegratieadvies_citaat) {
    quoteParts.push(stripCitations(content.reintegratieadvies_citaat));
  }

  const parts = [fmlIntro, rubriekenLines, spreekuurIntro];
  if (quoteParts.length > 0) {
    parts.push(`${PROGNOSE_DELIMITER}\n${quoteParts.join('\n')}`);
  }

  return { prognose_bedrijfsarts: parts.filter(Boolean).join('\n\n') };
}
