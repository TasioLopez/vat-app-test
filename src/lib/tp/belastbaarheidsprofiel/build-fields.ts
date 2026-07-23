import { buildArtsPhrase, enrichArtsOrgFromMeta, nlDate } from '@/lib/tp/format-context';
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
    const enrichedArtsOrg = enrichArtsOrgFromMeta(
      spreekuurMeta.arts_org,
      ctx.meta.occupational_doctor_org
    );
    return {
      datum: nlDate(spreekuurMeta.datum) || '[datum spreekuur]',
      artsPhrase: buildArtsPhrase(enrichedArtsOrg),
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

  const prognoseQuote = content.prognose_citaat
    ? stripCitations(content.prognose_citaat)
    : '';

  const parts = [fmlIntro, rubriekenLines, spreekuurIntro];
  if (prognoseQuote) {
    parts.push(`${PROGNOSE_DELIMITER}\n${prognoseQuote}`);
  }

  return { prognose_bedrijfsarts: parts.filter(Boolean).join('\n\n') };
}

export type ParsedBelastbaarheidsprofiel = {
  limitationsBlock: string;
  prognoseQuote: string;
};

function stripStructuralNewlines(value: string): string {
  return String(value || '').replace(/^\n+/, '').replace(/\n+$/, '');
}

export function parseBelastbaarheidsprofiel(raw: string): ParsedBelastbaarheidsprofiel {
  const text = String(raw || '');
  if (!text.trim()) return { limitationsBlock: '', prognoseQuote: '' };

  if (text.includes(PROGNOSE_DELIMITER)) {
    const [limitationsBlock, prognoseQuote] = text.split(PROGNOSE_DELIMITER);
    return {
      limitationsBlock: stripStructuralNewlines(limitationsBlock),
      prognoseQuote: stripStructuralNewlines(prognoseQuote ?? ''),
    };
  }

  return { limitationsBlock: text, prognoseQuote: '' };
}

export function buildBelastbaarheidsprofielBlock(
  limitationsBlock: string,
  prognoseQuote: string
): string {
  // Preserve typing spaces; only omit empty blocks via trim checks.
  if (!prognoseQuote.trim()) return limitationsBlock;
  if (!limitationsBlock.trim()) return `${PROGNOSE_DELIMITER}\n${prognoseQuote}`;
  return `${limitationsBlock}\n\n${PROGNOSE_DELIMITER}\n${prognoseQuote}`;
}
