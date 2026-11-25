import {
  emptyVgrDossier,
  VGR_DOSSIER_SCHEMA_VERSION,
  type VgrActivity,
  type VgrActivityStatus,
  type VgrActivityType,
  type VgrApplicationStatus,
  type VgrAssertion,
  type VgrAssertionApproval,
  type VgrAssertionBasis,
  type VgrAssertionStatus,
  type VgrAssertedBy,
  type VgrDocumentStatus,
  type VgrDossier,
  type VgrDossierDocType,
  type VgrDossierIssue,
  type VgrEmployeeMatch,
  type VgrEvidenceRef,
  type VgrIssueSeverity,
  type VgrIssueStatus,
  type VgrIssueType,
  type VgrQuoteVerification,
  type VgrSourceDocument,
} from './types';

const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const strOrNull = (v: unknown): string | null => {
  const s = str(v).trim();
  return s ? s : null;
};
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const DOC_TYPES = new Set<string>([
  'TP', 'VGR', 'VGR_BIJLAGE_1', 'VGR_BIJLAGE_2', 'AD', 'FML', 'IZP', 'LAB', 'BA_CONSULT',
  'ACTUEEL_OORDEEL', 'TEST', 'GESPREKSAANTEKENINGEN', 'WERKBOEK', 'EMAIL', 'CV',
  'MOTIVATIEBRIEF', 'SOLLICITATIEBEWIJS', 'OVERIG', 'ONBEKEND',
]);

function docType(v: unknown): VgrDossierDocType {
  const s = str(v);
  return DOC_TYPES.has(s) ? (s as VgrDossierDocType) : 'ONBEKEND';
}

function employeeMatch(v: unknown): VgrEmployeeMatch {
  const s = str(v);
  if (s === 'match' || s === 'uncertain' || s === 'mismatch') return s;
  return 'uncertain';
}

function documentStatus(v: unknown): VgrDocumentStatus {
  const s = str(v);
  if (s === 'draft' || s === 'final' || s === 'unknown') return s;
  return 'unknown';
}

function quoteVerification(v: unknown): VgrQuoteVerification {
  const s = str(v);
  if (s === 'not_a_quote' || s === 'unverified' || s === 'exact_verified') return s;
  return 'unverified';
}

function assertionStatus(v: unknown): VgrAssertionStatus {
  const s = str(v);
  if (s === 'known' || s === 'unknown' || s === 'conflict' || s === 'outdated') return s;
  return 'unknown';
}

function basis(v: unknown): VgrAssertionBasis {
  const s = str(v);
  if (s === 'explicit_source' || s === 'user_confirmation' || s === 'approved_derived_rule' || s === 'unknown') return s;
  return 'unknown';
}

function assertedBy(v: unknown): VgrAssertedBy {
  const s = str(v);
  if (['professional', 'employee', 'coach', 'employer', 'document', 'user', 'unknown'].includes(s)) {
    return s as VgrAssertedBy;
  }
  return 'unknown';
}

function approval(v: unknown): VgrAssertionApproval {
  const s = str(v);
  if (s === 'proposed' || s === 'approved' || s === 'rejected' || s === 'review_required') return s;
  return 'proposed';
}

function activityType(v: unknown): VgrActivityType {
  const s = str(v);
  const allowed: VgrActivityType[] = [
    'conversation', 'test', 'workbook', 'cv_work', 'letter_work', 'vacancy_analysis', 'application',
    'networking', 'training', 'webinar', 'employer_contact', 'jobhunting', 'work_experience',
    'track1_work', 'track2_activation', 'other',
  ];
  return allowed.includes(s as VgrActivityType) ? (s as VgrActivityType) : 'other';
}

function activityStatus(v: unknown): VgrActivityStatus {
  const s = str(v);
  const allowed: VgrActivityStatus[] = [
    'not_started', 'planned', 'in_progress', 'partially_completed', 'completed', 'blocked', 'not_applicable', 'unknown',
  ];
  return allowed.includes(s as VgrActivityStatus) ? (s as VgrActivityStatus) : 'unknown';
}

function applicationStatus(v: unknown): VgrApplicationStatus {
  const s = str(v);
  const allowed: VgrApplicationStatus[] = [
    'none', 'considered', 'draft', 'ready', 'sent', 'response_received', 'interview_planned',
    'interview_completed', 'worktrial_planned', 'worktrial_completed', 'hired', 'rejected', 'withdrawn', 'unknown',
  ];
  return allowed.includes(s as VgrApplicationStatus) ? (s as VgrApplicationStatus) : 'none';
}

function evidence(v: unknown): VgrEvidenceRef {
  const o = obj(v);
  return {
    source_id: str(o.source_id),
    source_anchor: str(o.source_anchor),
    evidence_excerpt: str(o.evidence_excerpt),
    quote_verification: quoteVerification(o.quote_verification),
    source_sha256: strOrNull(o.source_sha256),
  };
}

function sourceDocument(v: unknown, employeeId: string): VgrSourceDocument {
  const o = obj(v);
  return {
    source_id: str(o.source_id) || `src_${Math.random().toString(36).slice(2, 10)}`,
    employee_id: str(o.employee_id) || employeeId,
    document_id: strOrNull(o.document_id),
    doc_type: docType(o.doc_type),
    filename: str(o.filename),
    file_sha256: str(o.file_sha256),
    document_date: strOrNull(o.document_date),
    received_at: str(o.received_at) || new Date().toISOString(),
    document_status: documentStatus(o.document_status),
    employee_match: employeeMatch(o.employee_match),
    readable: o.readable !== false,
    supersedes_source_id: strOrNull(o.supersedes_source_id),
    classification_evidence: strOrNull(o.classification_evidence),
    quarantined: Boolean(o.quarantined) || employeeMatch(o.employee_match) === 'mismatch',
  };
}

function assertion(v: unknown): VgrAssertion {
  const o = obj(v);
  const evid = Array.isArray(o.evidence) ? o.evidence.map(evidence) : [];
  return {
    claim_id: str(o.claim_id) || `claim_${Math.random().toString(36).slice(2, 10)}`,
    field_key: str(o.field_key),
    value: o.value ?? null,
    status: assertionStatus(o.status),
    basis: basis(o.basis),
    asserted_by: assertedBy(o.asserted_by),
    source_date: strOrNull(o.source_date),
    effective_from: strOrNull(o.effective_from),
    evidence: evid,
    supersedes_claim_id: strOrNull(o.supersedes_claim_id),
    approval: approval(o.approval),
  };
}

function activity(v: unknown): VgrActivity {
  const o = obj(v);
  const claimIds = Array.isArray(o.claim_ids) ? o.claim_ids.map((x) => str(x)).filter(Boolean) : [];
  const evid = Array.isArray(o.evidence) ? o.evidence.map(evidence) : [];
  const track = str(o.track);
  return {
    activity_id: str(o.activity_id) || `act_${Math.random().toString(36).slice(2, 10)}`,
    activity_type: activityType(o.activity_type),
    activity_status: activityStatus(o.activity_status),
    activity_date: strOrNull(o.activity_date),
    end_date: strOrNull(o.end_date),
    actor: strOrNull(o.actor),
    organization: strOrNull(o.organization),
    position_or_purpose: strOrNull(o.position_or_purpose),
    application_status: applicationStatus(o.application_status),
    result: strOrNull(o.result),
    next_action: strOrNull(o.next_action),
    hours_per_week: typeof o.hours_per_week === 'number' ? o.hours_per_week : null,
    track: track === 'spoor1' || track === 'spoor2' ? track : 'unspecified',
    claim_ids: claimIds,
    evidence: evid,
  };
}

function issue(v: unknown): VgrDossierIssue {
  const o = obj(v);
  const sev = str(o.severity);
  const typ = str(o.issue_type);
  const st = str(o.status);
  return {
    issue_id: str(o.issue_id) || `iss_${Math.random().toString(36).slice(2, 10)}`,
    module_id: strOrNull(o.module_id),
    severity: (sev === 'blocker' || sev === 'warning' ? sev : 'warning') as VgrIssueSeverity,
    issue_type: ([
      'missing', 'conflict', 'wrong_employee', 'unreadable', 'quote_unverified', 'template_issue', 'privacy_review', 'other',
    ].includes(typ)
      ? typ
      : 'other') as VgrIssueType,
    question: str(o.question),
    status: ([
      'open', 'answered', 'resolved', 'waived', 'rejected',
    ].includes(st)
      ? st
      : 'open') as VgrIssueStatus,
    related_claim_ids: Array.isArray(o.related_claim_ids)
      ? o.related_claim_ids.map((x) => str(x)).filter(Boolean)
      : [],
    resolution: strOrNull(o.resolution),
    resolved_by: strOrNull(o.resolved_by),
    resolved_at: strOrNull(o.resolved_at),
  };
}

export function ensureVgrDossier(raw: unknown, employeeId: string): VgrDossier {
  if (!raw || typeof raw !== 'object') return emptyVgrDossier(employeeId);
  const o = raw as Record<string, unknown>;
  const id = str(o.employee_id) || employeeId;
  return {
    schema_version: VGR_DOSSIER_SCHEMA_VERSION,
    employee_id: id,
    tenant_id: strOrNull(o.tenant_id),
    trajectory_plan_source_id: strOrNull(o.trajectory_plan_source_id),
    source_documents: Array.isArray(o.source_documents)
      ? o.source_documents.map((d) => sourceDocument(d, id))
      : [],
    assertions: Array.isArray(o.assertions) ? o.assertions.map(assertion) : [],
    activities: Array.isArray(o.activities) ? o.activities.map(activity) : [],
    issues: Array.isArray(o.issues) ? o.issues.map(issue) : [],
    updated_at: strOrNull(o.updated_at) || new Date().toISOString(),
  };
}
