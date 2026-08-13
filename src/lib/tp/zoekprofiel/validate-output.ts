import {
  BODY_PART_ALLOWED,
  BODY_PART_PATTERNS,
  FORBIDDEN_TERM_PATTERNS,
  FORBIDDEN_TERMS,
  forbiddenTermPattern,
  HEUP_HEIGHT_PATTERNS,
  MAX_WORDS_TOTAL,
  MIN_WORDS_TOTAL,
  NUMERIC_FML_PATTERNS,
  OPENING_PATTERN,
  PARA1_CLOSING_TEMPLATES,
  PARA1_TASK_DETAIL_PATTERNS,
  REDUNDANT_SECTOR_PATTERNS,
  UNSOURCED_CONDITION_PATTERNS,
  type BelastbaarheidsdocumentType,
} from './constants';
import type { ZoekprofielContentResult } from './schema';

export type ZoekprofielBuildContext = {
  employee: { first_name?: string | null; last_name?: string | null };
  meta: {
    fml_izp_lab_date_voluit?: string | null;
    has_belastbaarheids_doc?: boolean;
    leading_belastbaarheidsdocument_type?: BelastbaarheidsdocumentType | null;
    leading_belastbaarheidsdocument_datum_voluit?: string | null;
  };
};

export type ZoekprofielValidationIssueCode =
  | 'word_count_low'
  | 'word_count_high'
  | 'missing_opening'
  | 'paragraph_count'
  | 'forbidden_term'
  | 'redundant_sector'
  | 'numeric_fml_copy'
  | 'para1_task_detail'
  | 'missing_closing'
  | 'body_part_mentioned'
  | 'heup_height_mentioned'
  | 'technical_force_value'
  | 'unsourced_condition'
  | 'leading_doc_mismatch'
  | 'clarification_with_content';

export type ZoekprofielValidationIssue = {
  code: ZoekprofielValidationIssueCode;
  message: string;
  /** When true, issue is advisory and does not fail validation alone */
  warning?: boolean;
};

export type ZoekprofielValidationResult = {
  ok: boolean;
  issues: ZoekprofielValidationIssue[];
};

function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function hasV13OpeningSentence(text: string): boolean {
  return OPENING_PATTERN.test(text.trim());
}

function hasClosingSentence(
  zoekprofiel: string,
  docType: BelastbaarheidsdocumentType
): boolean {
  const template = PARA1_CLOSING_TEMPLATES[docType];
  const marker = template.split(' van [datum]')[0];
  return zoekprofiel.includes(marker);
}

function textHasForbiddenBodyPart(text: string): boolean {
  // Strip allowed exception before checking
  const withoutAllowed = text.replace(BODY_PART_ALLOWED, '');
  return BODY_PART_PATTERNS.some((p) => p.test(withoutAllowed));
}

export function validateZoekprofielOutput(
  zoekprofiel: string,
  alinea1Kern: string,
  ctx: ZoekprofielBuildContext,
  content?: ZoekprofielContentResult
): ZoekprofielValidationResult {
  const issues: ZoekprofielValidationIssue[] = [];

  if (content?.verduidelijkingsvraag && (content.alinea_1_kern || content.alinea_2)) {
    issues.push({
      code: 'clarification_with_content',
      message: 'Verduidelijkingsvraag en alinea-inhoud mogen niet tegelijk voorkomen',
    });
  }

  const wordCount = countWords(zoekprofiel);
  if (wordCount < MIN_WORDS_TOTAL) {
    issues.push({
      code: 'word_count_low',
      message: `Woordenaantal ${wordCount} onder minimum ${MIN_WORDS_TOTAL}`,
    });
  }
  if (wordCount > MAX_WORDS_TOTAL) {
    issues.push({
      code: 'word_count_high',
      message: `Woordenaantal ${wordCount} boven maximum ${MAX_WORDS_TOTAL}`,
    });
  }

  if (!hasV13OpeningSentence(alinea1Kern)) {
    issues.push({
      code: 'missing_opening',
      message: 'Verplichte openingszin ontbreekt in alinea 1',
    });
  }

  const paragraphCount = zoekprofiel.split(/\n\n+/).filter((p) => p.trim()).length;
  if (paragraphCount !== 2) {
    issues.push({
      code: 'paragraph_count',
      message: `Verwacht 2 alinea's, gevonden ${paragraphCount}`,
    });
  }

  for (const term of FORBIDDEN_TERMS) {
    if (forbiddenTermPattern(term).test(zoekprofiel)) {
      issues.push({
        code: 'forbidden_term',
        message: `Verboden term: "${term}"`,
      });
    }
  }
  for (const pattern of FORBIDDEN_TERM_PATTERNS) {
    if (pattern.test(zoekprofiel)) {
      issues.push({
        code: 'forbidden_term',
        message: `Verboden term (patroon): ${pattern.source}`,
      });
    }
  }

  for (const pattern of REDUNDANT_SECTOR_PATTERNS) {
    if (pattern.test(alinea1Kern)) {
      issues.push({
        code: 'redundant_sector',
        message: `Redundante sectorformulering in alinea 1: ${pattern.source}`,
      });
    }
  }

  for (const pattern of PARA1_TASK_DETAIL_PATTERNS) {
    if (pattern.test(alinea1Kern)) {
      issues.push({
        code: 'para1_task_detail',
        message: `Te gedetailleerde alinea 1 (taken/jaren): ${pattern.source}`,
      });
    }
  }

  const para2 = zoekprofiel.split(/\n\n+/)[1] || '';
  for (const pattern of NUMERIC_FML_PATTERNS) {
    if (pattern.test(para2)) {
      const isForce =
        /\bnewton\b/i.test(pattern.source) ||
        /\bkgf\b/i.test(pattern.source) ||
        /\bkilogramkracht\b/i.test(pattern.source);
      issues.push({
        code: isForce ? 'technical_force_value' : 'numeric_fml_copy',
        message: isForce
          ? `Technische krachtwaarde in alinea 2: ${pattern.source}`
          : `Letterlijke FML-cijfers in alinea 2: ${pattern.source}`,
      });
    }
  }

  for (const pattern of HEUP_HEIGHT_PATTERNS) {
    if (pattern.test(zoekprofiel)) {
      issues.push({
        code: 'heup_height_mentioned',
        message: `Heuphoogte-formulering verboden: ${pattern.source}`,
      });
    }
  }

  if (textHasForbiddenBodyPart(zoekprofiel)) {
    issues.push({
      code: 'body_part_mentioned',
      message: 'Lichaamsdeel genoemd (alleen "schouderhoogte" is toegestaan)',
    });
  }

  for (const pattern of UNSOURCED_CONDITION_PATTERNS) {
    if (pattern.test(para2)) {
      issues.push({
        code: 'unsourced_condition',
        message: `Mogelijk niet-vastgelegde voorwaarde in alinea 2: ${pattern.source}`,
        warning: true,
      });
    }
  }

  const leadingType = ctx.meta.leading_belastbaarheidsdocument_type;
  if (leadingType && content && content.belastbaarheidsdocument_type !== leadingType) {
    issues.push({
      code: 'leading_doc_mismatch',
      message: `Model type ${content.belastbaarheidsdocument_type} wijkt af van leidend document ${leadingType}`,
      warning: true,
    });
  }

  const closingType =
    leadingType || content?.belastbaarheidsdocument_type || null;
  const includeClosing = ctx.meta.has_belastbaarheids_doc !== false;
  if (includeClosing && content && closingType) {
    if (!hasClosingSentence(zoekprofiel, closingType)) {
      issues.push({
        code: 'missing_closing',
        message: 'Functionele Mogelijkheden Lijst / Inzetbaarheidsprofiel / LAB slotzin ontbreekt in alinea 1',
      });
    }
  }

  const blockingIssues = issues.filter((i) => !i.warning);
  return { ok: blockingIssues.length === 0, issues };
}

export function formatValidationIssues(issues: ZoekprofielValidationIssue[]): string[] {
  return issues.map((i) => `[${i.code}] ${i.message}`);
}
