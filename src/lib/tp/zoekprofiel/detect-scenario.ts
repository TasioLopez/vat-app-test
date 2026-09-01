import { isSpreekReportageDocType } from '@/lib/documents/employee-doc-types';
import { hasIntakeAdNarrative } from '@/lib/tp/ad-report-wording';
import type { EmployeeDoc } from './generate';
import { getZoekprofielDocCategory, isBelastbaarheidsDoc } from './generate';

export type ZoekprofielScenario =
  | 'insufficient'
  | 'separate_belastbaarheid'
  | 'ad_embedded_belastbaarheid'
  | 'intake_only';

export type ZoekprofielScenarioResult = {
  scenario: ZoekprofielScenario;
  hasAdNarrative: boolean;
  hasSeparateBelastDoc: boolean;
  hasSpreekuurDoc: boolean;
  hasAdDoc: boolean;
  hasIntakeDoc: boolean;
  hasRelevantDocs: boolean;
};

export function hasSpreekuurDoc(docs: EmployeeDoc[]): boolean {
  return docs.some((d) => isSpreekReportageDocType(d.type));
}

export function hasAdDoc(docs: EmployeeDoc[]): boolean {
  return docs.some((d) => getZoekprofielDocCategory(d.type) === 'ad');
}

export function hasIntakeDoc(docs: EmployeeDoc[]): boolean {
  return docs.some((d) => getZoekprofielDocCategory(d.type) === 'intake');
}

export function hasSeparateBelastDoc(docs: EmployeeDoc[]): boolean {
  return docs.some((d) => isBelastbaarheidsDoc(d.type));
}

export function detectZoekprofielScenario(
  docs: EmployeeDoc[],
  meta?: {
    has_ad_report?: boolean | null;
    ad_report_concept?: boolean | null;
  } | null
): ZoekprofielScenarioResult {
  const hasIntake = hasIntakeDoc(docs);
  const hasAd = hasAdDoc(docs);
  const hasBelast = hasSeparateBelastDoc(docs);
  const hasSpreekuur = hasSpreekuurDoc(docs);
  const hasAdNarrative = hasIntakeAdNarrative(meta ?? undefined) || hasAd;
  const hasRelevantDocs = hasIntake || hasAd || hasBelast || hasSpreekuur;

  let scenario: ZoekprofielScenario;

  if (!hasRelevantDocs) {
    scenario = 'insufficient';
  } else if (!hasAdNarrative && !hasBelast && !hasSpreekuur) {
    scenario = 'insufficient';
  } else if (hasBelast || hasSpreekuur) {
    scenario = 'separate_belastbaarheid';
  } else if (hasAdNarrative || hasAd) {
    scenario = 'ad_embedded_belastbaarheid';
  } else {
    scenario = 'intake_only';
  }

  return {
    scenario,
    hasAdNarrative,
    hasSeparateBelastDoc: hasBelast,
    hasSpreekuurDoc: hasSpreekuur,
    hasAdDoc: hasAd,
    hasIntakeDoc: hasIntake,
    hasRelevantDocs,
  };
}

export function scenarioHasBelastbaarheidsClosing(scenario: ZoekprofielScenario): boolean {
  return scenario === 'separate_belastbaarheid';
}
