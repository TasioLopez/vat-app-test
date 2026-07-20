import type OpenAI from 'openai';
import { isIntakeDocumentType } from './storage';
import { normalizeForAnalysis } from './normalizeForAnalysis';
import {
  EMPLOYEE_CHATLIKE_PROMPT,
  EMPLOYEE_CHATLIKE_USER_MESSAGE,
} from './prompts/employee-chatlike';
import {
  EMPLOYEE_EXTRACTION_JSON_SCHEMA,
  parseEmployeeExtractionResult,
} from './schemas/employee-extraction-schema';
import { runStructuredMultiFileExtraction } from './runStructuredExtraction';
import { stripCurrentJobFromWorkExperience } from './validateEmployeeExtraction';

export type ChatlikeDocInput = {
  buffer: Buffer;
  filename: string;
  docType?: string | null;
};

export type EmployeeChatlikeExtractionResult = {
  raw: Record<string, unknown>;
  referentFields: Record<string, unknown>;
  documentCount: number;
  documentLabels: string[];
};

function docSortKey(docType: string | null | undefined): number {
  const t = (docType || '').toLowerCase();
  if (isIntakeDocumentType(t) || t.includes('intake')) return 0;
  if (t.includes('ad') || t.includes('arbeidsdeskundig')) return 1;
  if (t.includes('spreek')) return 2;
  if (t.includes('fml') || t.includes('izp')) return 3;
  if (t.includes('cv')) return 4;
  return 5;
}

function labelForDoc(doc: ChatlikeDocInput, index: number): string {
  const type = (doc.docType || '').trim() || 'document';
  const name = doc.filename || `doc-${index + 1}`;
  return `${type}:${name}`;
}

/**
 * Map raw chatlike extraction to employee details + referent without checkbox clear-on-null.
 */
export function buildChatlikeEmployeeDetailsFromRaw(
  raw: Record<string, unknown>
): {
  detailsRaw: Record<string, unknown>;
  referentFields: Record<string, unknown>;
} {
  const merged = { ...raw };
  const strippedWork = stripCurrentJobFromWorkExperience(
    merged.work_experience,
    merged.current_job
  );
  if (strippedWork != null) {
    merged.work_experience = strippedWork;
  } else {
    delete merged.work_experience;
  }

  const referentFields: Record<string, unknown> = {};
  for (const key of [
    'referent_first_name',
    'referent_last_name',
    'referent_function',
    'referent_phone',
    'referent_email',
    'referent_gender',
  ] as const) {
    if (merged[key] != null && merged[key] !== '') {
      referentFields[key] = merged[key];
    }
  }

  return { detailsRaw: merged, referentFields };
}

/**
 * Chat-like employee extract: upload all docs in one Responses call.
 * Intake is listed first and preferred in the prompt; no Pass B / clear-on-null.
 */
export async function extractEmployeeDetailsChatlike(
  openai: OpenAI,
  docs: ChatlikeDocInput[]
): Promise<EmployeeChatlikeExtractionResult> {
  if (!docs.length) {
    return { raw: {}, referentFields: {}, documentCount: 0, documentLabels: [] };
  }

  const sorted = [...docs].sort(
    (a, b) => docSortKey(a.docType) - docSortKey(b.docType)
  );

  const files: {
    pdfBuffer: Buffer;
    analysisFilename: string;
    label: string;
  }[] = [];
  const documentLabels: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const doc = sorted[i]!;
    const fallbackName = doc.filename || `${doc.docType || 'document'}.pdf`;
    const { pdfBuffer, analysisFilename, wasConverted } = await normalizeForAnalysis(
      doc.buffer,
      fallbackName
    );
    const label = labelForDoc({ ...doc, filename: analysisFilename }, i);
    if (wasConverted) {
      console.log(`✅ Chatlike normalized to PDF: ${label}`);
    }
    files.push({ pdfBuffer, analysisFilename, label });
    documentLabels.push(label);
  }

  console.log(
    `📋 Chatlike employee extract: ${files.length} file(s) — ${documentLabels.join(', ')}`
  );

  const parsed = await runStructuredMultiFileExtraction({
    openai,
    files,
    instructions: EMPLOYEE_CHATLIKE_PROMPT,
    userMessage: EMPLOYEE_CHATLIKE_USER_MESSAGE,
    schemaName: 'employee_extraction_chatlike',
    schema: EMPLOYEE_EXTRACTION_JSON_SCHEMA as Record<string, unknown>,
    parse: parseEmployeeExtractionResult,
    usePdfVision: true,
    maxRetries: 0,
    logLabel: 'Employee chatlike (all docs)',
  });

  const { detailsRaw, referentFields } = buildChatlikeEmployeeDetailsFromRaw(parsed);

  console.log(
    `✅ Chatlike extract fields: ${Object.keys(detailsRaw).length} (docs=${files.length})`
  );

  return {
    raw: detailsRaw,
    referentFields,
    documentCount: files.length,
    documentLabels,
  };
}
