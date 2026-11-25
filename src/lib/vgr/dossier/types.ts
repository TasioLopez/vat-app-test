/**
 * Pack-shaped VGR dossier spine (Phase 2) — app contract aligned with
 * `03_VGR_app_datamodel_v0_1.json`. Not an OpenAI Structured Outputs schema.
 */

export const VGR_DOSSIER_SCHEMA_VERSION = '0.1-draft' as const;

export type VgrDossierDocType =
  | 'TP'
  | 'VGR'
  | 'VGR_BIJLAGE_1'
  | 'VGR_BIJLAGE_2'
  | 'AD'
  | 'FML'
  | 'IZP'
  | 'LAB'
  | 'BA_CONSULT'
  | 'ACTUEEL_OORDEEL'
  | 'TEST'
  | 'GESPREKSAANTEKENINGEN'
  | 'WERKBOEK'
  | 'EMAIL'
  | 'CV'
  | 'MOTIVATIEBRIEF'
  | 'SOLLICITATIEBEWIJS'
  | 'OVERIG'
  | 'ONBEKEND';

export type VgrEmployeeMatch = 'match' | 'uncertain' | 'mismatch';
export type VgrDocumentStatus = 'draft' | 'final' | 'unknown';
export type VgrQuoteVerification = 'not_a_quote' | 'unverified' | 'exact_verified';
export type VgrAssertionStatus = 'known' | 'unknown' | 'conflict' | 'outdated';
export type VgrAssertionBasis = 'explicit_source' | 'user_confirmation' | 'approved_derived_rule' | 'unknown';
export type VgrAssertedBy =
  | 'professional'
  | 'employee'
  | 'coach'
  | 'employer'
  | 'document'
  | 'user'
  | 'unknown';
export type VgrAssertionApproval = 'proposed' | 'approved' | 'rejected' | 'review_required';

export type VgrActivityType =
  | 'conversation'
  | 'test'
  | 'workbook'
  | 'cv_work'
  | 'letter_work'
  | 'vacancy_analysis'
  | 'application'
  | 'networking'
  | 'training'
  | 'webinar'
  | 'employer_contact'
  | 'jobhunting'
  | 'work_experience'
  | 'track1_work'
  | 'track2_activation'
  | 'other';

export type VgrActivityStatus =
  | 'not_started'
  | 'planned'
  | 'in_progress'
  | 'partially_completed'
  | 'completed'
  | 'blocked'
  | 'not_applicable'
  | 'unknown';

/** Fine-grained application chain (pack G5). */
export type VgrApplicationStatus =
  | 'none'
  | 'considered'
  | 'draft'
  | 'ready'
  | 'sent'
  | 'response_received'
  | 'interview_planned'
  | 'interview_completed'
  | 'worktrial_planned'
  | 'worktrial_completed'
  | 'hired'
  | 'rejected'
  | 'withdrawn'
  | 'unknown';

export type VgrIssueSeverity = 'blocker' | 'warning';
export type VgrIssueType =
  | 'missing'
  | 'conflict'
  | 'wrong_employee'
  | 'unreadable'
  | 'quote_unverified'
  | 'template_issue'
  | 'privacy_review'
  | 'other';
export type VgrIssueStatus = 'open' | 'answered' | 'resolved' | 'waived' | 'rejected';

export type VgrEvidenceRef = {
  source_id: string;
  source_anchor: string;
  evidence_excerpt: string;
  quote_verification: VgrQuoteVerification;
  source_sha256?: string | null;
};

export type VgrSourceDocument = {
  source_id: string;
  employee_id: string;
  /** App `documents.id` when linked. */
  document_id?: string | null;
  doc_type: VgrDossierDocType;
  filename: string;
  file_sha256: string;
  document_date: string | null;
  received_at: string;
  document_status: VgrDocumentStatus;
  employee_match: VgrEmployeeMatch;
  readable: boolean;
  supersedes_source_id?: string | null;
  classification_evidence?: string | null;
  quarantined: boolean;
};

export type VgrAssertion = {
  claim_id: string;
  field_key: string;
  value: unknown;
  status: VgrAssertionStatus;
  basis: VgrAssertionBasis;
  asserted_by: VgrAssertedBy;
  source_date: string | null;
  effective_from: string | null;
  evidence: VgrEvidenceRef[];
  supersedes_claim_id?: string | null;
  approval: VgrAssertionApproval;
};

export type VgrActivity = {
  activity_id: string;
  activity_type: VgrActivityType;
  activity_status: VgrActivityStatus;
  activity_date: string | null;
  end_date?: string | null;
  actor?: string | null;
  organization?: string | null;
  position_or_purpose?: string | null;
  application_status: VgrApplicationStatus;
  result?: string | null;
  next_action?: string | null;
  hours_per_week?: number | null;
  track: 'spoor1' | 'spoor2' | 'unspecified';
  claim_ids: string[];
  evidence: VgrEvidenceRef[];
};

export type VgrDossierIssue = {
  issue_id: string;
  module_id: string | null;
  severity: VgrIssueSeverity;
  issue_type: VgrIssueType;
  question: string;
  status: VgrIssueStatus;
  related_claim_ids: string[];
  resolution?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
};

export type VgrDossier = {
  schema_version: typeof VGR_DOSSIER_SCHEMA_VERSION;
  employee_id: string;
  tenant_id?: string | null;
  trajectory_plan_source_id?: string | null;
  source_documents: VgrSourceDocument[];
  assertions: VgrAssertion[];
  activities: VgrActivity[];
  issues: VgrDossierIssue[];
  updated_at?: string;
};

export function emptyVgrDossier(employeeId: string): VgrDossier {
  return {
    schema_version: VGR_DOSSIER_SCHEMA_VERSION,
    employee_id: employeeId,
    tenant_id: null,
    trajectory_plan_source_id: null,
    source_documents: [],
    assertions: [],
    activities: [],
    issues: [],
    updated_at: new Date().toISOString(),
  };
}
