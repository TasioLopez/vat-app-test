import {
  FORBIDDEN_TERMS,
  MAX_WORDS_TOTAL,
  MIN_WORDS_TOTAL,
  NUMERIC_FML_PATTERNS,
  OPENING_PATTERN,
  PARA1_CLOSING_TEMPLATES,
  PARA1_TASK_DETAIL_PATTERNS,
  REDUNDANT_SECTOR_PATTERNS,
  type BelastbaarheidsdocumentType,
} from './constants';
import type { ZoekprofielContentResult } from './schema';

export type ZoekprofielBuildContext = {
  employee: { first_name?: string | null; last_name?: string | null };
  meta: {
    fml_izp_lab_date_voluit?: string | null;
    has_belastbaarheids_doc?: boolean;
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
  | 'missing_closing';

export type ZoekprofielValidationIssue = {
  code: ZoekprofielValidationIssueCode;
  message: string;
};

export type ZoekprofielValidationResult = {
  ok: boolean;
  issues: ZoekprofielValidationIssue[];
};

function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function hasV2OpeningSentence(text: string): boolean {
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

export function validateZoekprofielOutput(
  zoekprofiel: string,
  alinea1Kern: string,
  ctx: ZoekprofielBuildContext,
  content?: ZoekprofielContentResult
): ZoekprofielValidationResult {
  const issues: ZoekprofielValidationIssue[] = [];

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

  if (!hasV2OpeningSentence(alinea1Kern)) {
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

  const lower = zoekprofiel.toLowerCase();
  for (const term of FORBIDDEN_TERMS) {
    if (lower.includes(term)) {
      issues.push({
        code: 'forbidden_term',
        message: `Verboden term: "${term}"`,
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
      issues.push({
        code: 'numeric_fml_copy',
        message: `Letterlijke FML-cijfers in alinea 2: ${pattern.source}`,
      });
    }
  }

  const includeClosing = ctx.meta.has_belastbaarheids_doc !== false;
  if (includeClosing && content) {
    if (!hasClosingSentence(zoekprofiel, content.belastbaarheidsdocument_type)) {
      issues.push({
        code: 'missing_closing',
        message: 'FML/IZP/LAB slotzin ontbreekt in alinea 1',
      });
    }
  }

  return { ok: issues.length === 0, issues };
}

export function formatValidationIssues(issues: ZoekprofielValidationIssue[]): string[] {
  return issues.map((i) => `[${i.code}] ${i.message}`);
}
