/**
 * MERGE_AND_COMPARE_DOSSIER (Phase 2 lite): merge new claims/activities without
 * silently mutating history; conflicts stay conflicts (G1/G2).
 */
import type { VgrActivity, VgrAssertion, VgrDossier, VgrDossierIssue, VgrSourceDocument } from './types';
import { ensureVgrDossier } from './normalize';

export type MergeInput = {
  dossier: VgrDossier;
  sources?: VgrSourceDocument[];
  assertions?: VgrAssertion[];
  activities?: VgrActivity[];
};

function fingerprintAssertion(a: VgrAssertion): string {
  return `${a.field_key}::${JSON.stringify(a.value)}::${a.source_date || ''}`;
}

function fingerprintActivity(a: VgrActivity): string {
  return `${a.activity_type}::${a.activity_date || ''}::${a.organization || ''}::${a.position_or_purpose || ''}::${a.application_status}`;
}

export function mergeDossierUpdate(input: MergeInput): VgrDossier {
  const base = ensureVgrDossier(input.dossier, input.dossier.employee_id);
  const sources = [...base.source_documents];
  const assertions = [...base.assertions];
  const activities = [...base.activities];
  const issues = [...base.issues];

  for (const src of input.sources ?? []) {
    const idx = sources.findIndex((s) => s.source_id === src.source_id || (s.document_id && s.document_id === src.document_id));
    if (idx >= 0) sources[idx] = { ...sources[idx], ...src };
    else sources.push(src);

    if (src.quarantined || src.employee_match === 'mismatch') {
      const exists = issues.some(
        (i) => i.issue_type === 'wrong_employee' && i.related_claim_ids.includes(src.source_id) && i.status === 'open',
      );
      if (!exists) {
        issues.push({
          issue_id: `iss_emp_${src.source_id}`,
          module_id: null,
          severity: 'blocker',
          issue_type: 'wrong_employee',
          question: `Bron "${src.filename}" lijkt niet bij deze werknemer te horen. Quarantaine tot review.`,
          status: 'open',
          related_claim_ids: [src.source_id],
        });
      }
    }
  }

  for (const claim of input.assertions ?? []) {
    const fp = fingerprintAssertion(claim);
    const sameField = assertions.filter((a) => a.field_key === claim.field_key && a.approval !== 'rejected');
    const dup = sameField.find((a) => fingerprintAssertion(a) === fp);
    if (dup) continue;

    const conflict = sameField.find((a) => {
      if (a.status === 'outdated') return false;
      return JSON.stringify(a.value) !== JSON.stringify(claim.value);
    });
    if (conflict) {
      // Medical: do not auto-replace on newer date alone — mark conflict.
      conflict.status = 'conflict';
      claim.status = 'conflict';
      assertions.push(claim);
      issues.push({
        issue_id: `iss_cf_${claim.claim_id}`,
        module_id: null,
        severity: 'blocker',
        issue_type: 'conflict',
        question: `Conflict op ${claim.field_key}: welke bron is leidend?`,
        status: 'open',
        related_claim_ids: [conflict.claim_id, claim.claim_id],
      });
      continue;
    }
    assertions.push(claim);
  }

  for (const act of input.activities ?? []) {
    const fp = fingerprintActivity(act);
    const dup = activities.find((a) => fingerprintActivity(a) === fp);
    if (dup) {
      // Upgrade status only along the chain (never demote completed → planned silently).
      const order = ['none', 'considered', 'draft', 'ready', 'sent', 'response_received', 'interview_planned', 'interview_completed', 'worktrial_planned', 'worktrial_completed', 'hired'];
      const cur = order.indexOf(dup.application_status);
      const next = order.indexOf(act.application_status);
      if (next > cur && act.application_status !== 'unknown') {
        dup.application_status = act.application_status;
        dup.activity_status = act.activity_status;
        dup.result = act.result ?? dup.result;
      }
      continue;
    }
    activities.push(act);
  }

  return {
    ...base,
    source_documents: sources,
    assertions,
    activities,
    issues,
    updated_at: new Date().toISOString(),
  };
}

/** Approved / known facts suitable for WRITE_VGR_MODULE context. */
export function verifiedFactsForWrite(dossier: VgrDossier): {
  facts: VgrAssertion[];
  activities: VgrActivity[];
  quarantinedSourceIds: string[];
} {
  const quarantinedSourceIds = dossier.source_documents.filter((s) => s.quarantined).map((s) => s.source_id);
  const facts = dossier.assertions.filter(
    (a) =>
      a.status === 'known' &&
      a.approval !== 'rejected' &&
      !a.evidence.some((e) => quarantinedSourceIds.includes(e.source_id)) &&
      a.evidence.every((e) => e.quote_verification !== 'unverified' || e.quote_verification === 'not_a_quote' || e.quote_verification === 'exact_verified'),
  );
  // Prefer exact_verified quotes; drop unverified quote claims.
  const factsClean = facts.filter((a) => {
    const quotes = a.evidence.filter((e) => e.quote_verification !== 'not_a_quote');
    if (!quotes.length) return true;
    return quotes.every((e) => e.quote_verification === 'exact_verified');
  });
  const activities = dossier.activities.filter(
    (a) => !a.evidence.some((e) => quarantinedSourceIds.includes(e.source_id)),
  );
  return { facts: factsClean, activities, quarantinedSourceIds };
}

export function openDossierIssues(dossier: VgrDossier): VgrDossierIssue[] {
  return dossier.issues.filter((i) => i.status === 'open');
}
