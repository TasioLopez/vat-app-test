import type OpenAI from 'openai';
import {
  applyIntakeCheckboxTextOverrides,
  extractEmployeeDetailsChatlike,
  extractStoragePath,
  isIntakeDocumentType,
  mapAndValidateEmployeeDetails,
  type EmployeeChatlikeExtractionResult,
} from '@/lib/document-analysis';
import { stripAssistantArtifactsFromRecord } from '@/lib/document-analysis/stripAssistantArtifacts';
import { serviceRoleSupabase } from '@/lib/supabase/service-role';

type DocRow = { type?: string | null; url?: string | null; name?: string | null };

export type ExtractWorkerFactsFromDocumentsResult = {
  details: Record<string, unknown>;
  /** Raw cleaned extraction before map/validate (for referent / completeness). */
  cleaned: Record<string, unknown>;
  extraction: EmployeeChatlikeExtractionResult | null;
  documentCount: number;
  /** True when at least one downloaded doc was an intake form. */
  intakeProcessed: boolean;
  error?: string;
};

async function downloadDocumentBuffer(
  doc: DocRow
): Promise<{ buffer: Buffer; path: string } | null> {
  const path = extractStoragePath(doc.url || '');
  if (!path) {
    console.log('⚠️ Chatlike: could not extract storage path', {
      type: doc.type,
      url: doc.url?.substring(0, 120),
    });
    return null;
  }

  const { data: file, error } = await serviceRoleSupabase.storage.from('documents').download(path);
  if (!file) {
    console.log('⚠️ Chatlike: could not download', {
      type: doc.type,
      path,
      error: error?.message,
    });
    return null;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return { buffer, path };
}

export type ExtractWorkerFactsPhase = 'prepare' | 'analyze' | 'merge';

/**
 * Same document → WorkerFacts extraction used by worker profile / TP chatlike autofill.
 * Downloads via service role, then one multi-doc chatlike pass.
 */
export async function extractWorkerFactsFromDocuments(
  openai: OpenAI,
  employeeId: string,
  options?: { onPhase?: (phase: ExtractWorkerFactsPhase) => void }
): Promise<ExtractWorkerFactsFromDocumentsResult> {
  const onPhase = options?.onPhase;
  onPhase?.('prepare');

  const { data: docs, error: docsError } = await serviceRoleSupabase
    .from('documents')
    .select('type, url, name')
    .eq('employee_id', employeeId);

  if (docsError) {
    return {
      details: {},
      cleaned: {},
      extraction: null,
      documentCount: 0,
      intakeProcessed: false,
      error: docsError.message,
    };
  }
  if (!docs?.length) {
    return {
      details: {},
      cleaned: {},
      extraction: null,
      documentCount: 0,
      intakeProcessed: false,
      error: 'Geen documenten gevonden',
    };
  }

  console.log(`📄 Chatlike: found ${docs.length} document(s) — uploading all`);

  const chatlikeDocs: { buffer: Buffer; filename: string; docType?: string | null }[] = [];
  for (const doc of docs as DocRow[]) {
    const downloaded = await downloadDocumentBuffer(doc);
    if (!downloaded) continue;
    const filename =
      doc.name || downloaded.path.split('/').pop() || `${doc.type || 'document'}.pdf`;
    chatlikeDocs.push({
      buffer: downloaded.buffer,
      filename,
      docType: doc.type,
    });
  }

  if (chatlikeDocs.length === 0) {
    return {
      details: {},
      cleaned: {},
      extraction: null,
      documentCount: 0,
      intakeProcessed: false,
      error: 'Geen documenten konden worden gedownload',
    };
  }

  const intakeProcessed = chatlikeDocs.some(
    (d) =>
      isIntakeDocumentType(d.docType || '') ||
      (d.docType || '').toLowerCase().includes('intake')
  );

  onPhase?.('analyze');
  const extraction = await extractEmployeeDetailsChatlike(openai, chatlikeDocs);
  onPhase?.('merge');
  const cleaned = stripAssistantArtifactsFromRecord(extraction.raw);
  const mapped = mapAndValidateEmployeeDetails(cleaned);
  applyIntakeCheckboxTextOverrides(mapped, extraction.intakePlainText);

  return {
    details: mapped as Record<string, unknown>,
    cleaned,
    extraction,
    documentCount: extraction.documentCount,
    intakeProcessed,
  };
}
