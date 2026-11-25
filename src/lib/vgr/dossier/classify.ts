/**
 * CLASSIFY_DOCUMENT (Phase 2 lite): deterministic classify from app metadata.
 * Quarantine on employee mismatch (G8). AI refine can land later.
 */
import { createHash } from 'crypto';
import { mapEmployeeDocTypeToDossier } from './map-doc-type';
import type { VgrSourceDocument } from './types';

export type ClassifyDocumentInput = {
  employeeId: string;
  documentId: string;
  appType: string;
  filename: string;
  uploadedAt?: string | null;
  /** Optional raw bytes for sha256; omit when unavailable. */
  content?: Buffer | Uint8Array | null;
  /** Hint from filename/OCR employee name match. */
  employeeMatchHint?: VgrSourceDocument['employee_match'];
  readable?: boolean;
  documentDate?: string | null;
  documentStatus?: VgrSourceDocument['document_status'];
};

export function classifyDocument(input: ClassifyDocumentInput): VgrSourceDocument {
  const docType = mapEmployeeDocTypeToDossier(input.appType, input.filename);
  const employee_match = input.employeeMatchHint ?? 'match';
  const quarantined = employee_match === 'mismatch' || employee_match === 'uncertain';
  const sha =
    input.content && input.content.byteLength
      ? createHash('sha256').update(Buffer.from(input.content)).digest('hex')
      : '';

  return {
    source_id: `doc_${input.documentId}`,
    employee_id: input.employeeId,
    document_id: input.documentId,
    doc_type: docType,
    filename: input.filename || input.documentId,
    file_sha256: sha,
    document_date: input.documentDate ?? null,
    received_at: input.uploadedAt || new Date().toISOString(),
    document_status: input.documentStatus ?? 'unknown',
    employee_match,
    readable: input.readable !== false,
    supersedes_source_id: null,
    classification_evidence: `app_type=${input.appType || '—'}; mapped=${docType}`,
    quarantined,
  };
}
