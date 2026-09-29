import { describeIntakePlainText } from '@/lib/document-analysis/documentPlainText';
import {
  applyAdReportConceptFromText,
  detectAdReportConceptFromText,
} from '@/lib/tp/ad-report-wording';
import {
  applyExWerknemerFromText,
  detectExWerknemerFromText,
  intakeTextHasExWerknemerLabel,
} from '@/lib/tp/ex-werknemer-wording';

/**
 * Override vision/LLM checkbox guesses with deterministic plain-text detection
 * (same logic used by TP2 autofill). Safe no-op when plainText is missing.
 */
export function applyIntakeCheckboxOverridesFromText(
  merged: Record<string, unknown>,
  plainText: string | null | undefined,
  logPrefix = 'Intake'
): Record<string, unknown> {
  if (!plainText) return merged;

  const next = { ...merged };
  const meta = describeIntakePlainText(plainText);
  console.log(
    `📋 ${logPrefix} checkbox plain text len=${meta.textLen} hasConcept=${meta.hasConcept} glyphs=${meta.hasCheckboxGlyphs}`
  );

  const conceptFromText = detectAdReportConceptFromText(plainText);
  if (conceptFromText !== null) {
    console.log(`📋 ${logPrefix} Concept checkbox from text: ${conceptFromText}`);
  } else if (meta.hasConcept) {
    // Label present but no clear checkbox glyph → do not trust vision; treat as not-concept.
    console.log(`📋 ${logPrefix} Concept label without glyph → false`);
  }
  next.ad_report_concept = applyAdReportConceptFromText(
    next.ad_report_concept,
    conceptFromText !== null ? conceptFromText : meta.hasConcept ? false : null
  );

  const exWerknemerFromText = detectExWerknemerFromText(plainText);
  if (exWerknemerFromText !== null) {
    console.log(`📋 ${logPrefix} Ex-werknemer checkbox from text: ${exWerknemerFromText}`);
  } else if (intakeTextHasExWerknemerLabel(plainText)) {
    console.log(`📋 ${logPrefix} Ex-werknemer label without glyph → false`);
  }
  next.is_ex_werknemer = applyExWerknemerFromText(
    next.is_ex_werknemer,
    exWerknemerFromText !== null
      ? exWerknemerFromText
      : intakeTextHasExWerknemerLabel(plainText)
        ? false
        : null
  );

  return next;
}
