import { buildArtsPhrase, enrichArtsOrgFromMeta, nlDate } from '@/lib/tp/format-context';
import { normalizeFmlIzpLabKind } from '@/lib/document-analysis/schemas/tp2-date-schema';
import {
  BELASTBAARHEID_GEEN_PROFIEL,
  FML_INTRO_TEMPLATE,
  IZP_INTRO_TEMPLATE,
  MEDISCH_SPREEKUUR_INTRO_TEMPLATE,
  PROGNOSE_DELIMITER,
} from './constants';
import type { BelastbaarheidsprofielContentResult } from './schema';

export type BelastbaarheidsprofielBuildContext = {
  has_spreekuurrapportage?: boolean;
  meta: {
    fml_izp_lab_date?: string | null;
    fml_izp_lab_kind?: string | null;
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

/** Keep only non-empty labels; never invent the full STANDARD_RUBRIEKEN list. */
export function normalizeRubrieken(rubrieken: string[]): string[] {
  return rubrieken.map((r) => r.trim()).filter(Boolean);
}

export function hasUsableBelastbaarheidsContent(content: {
  rubrieken: string[];
  prognose_citaat: string | null;
}): boolean {
  return normalizeRubrieken(content.rubrieken).length > 0 || Boolean(content.prognose_citaat?.trim());
}

function fillTemplate(
  template: string,
  vars: { datum: string; artsPhrase: string }
): string {
  return template.replace('{datum}', vars.datum).replace('{artsPhrase}', vars.artsPhrase);
}

function resolveIntroTemplate(kind: string | null | undefined): string {
  return normalizeFmlIzpLabKind(kind) === 'izp' ? IZP_INTRO_TEMPLATE : FML_INTRO_TEMPLATE;
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

  const kind = normalizeFmlIzpLabKind(ctx.meta.fml_izp_lab_kind);
  const datumFallback = kind === 'izp' ? '[datum IZP]' : '[datum FML]';
  return {
    datum: nlDate(ctx.meta.fml_izp_lab_date) || datumFallback,
    artsPhrase: buildArtsPhrase(ctx.meta.occupational_doctor_org),
  };
}

export function buildBelastbaarheidsprofielGeenProfielFields(): BelastbaarheidsprofielFields {
  return { prognose_bedrijfsarts: BELASTBAARHEID_GEEN_PROFIEL };
}

export function buildBelastbaarheidsprofielFields(
  ctx: BelastbaarheidsprofielBuildContext,
  content: BelastbaarheidsprofielContentResult
): BelastbaarheidsprofielFields {
  const introVars = resolveIntroVars(ctx, content);

  const limitationsIntro = fillTemplate(resolveIntroTemplate(ctx.meta.fml_izp_lab_kind), introVars);
  const spreekuurIntro = fillTemplate(MEDISCH_SPREEKUUR_INTRO_TEMPLATE, introVars);
  const rubrieken = normalizeRubrieken(content.rubrieken);
  const rubriekenLines = rubrieken.map((r) => `• ${r}`).join('\n');

  const prognoseQuote = content.prognose_citaat
    ? stripCitations(content.prognose_citaat)
    : '';

  const parts = [limitationsIntro, rubriekenLines, spreekuurIntro].filter(Boolean);
  if (prognoseQuote) {
    parts.push(`${PROGNOSE_DELIMITER}\n${prognoseQuote}`);
  }

  return { prognose_bedrijfsarts: parts.join('\n\n') };
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
