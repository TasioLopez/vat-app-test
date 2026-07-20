import type OpenAI from 'openai';
import { isIntakeDocumentType } from './storage';
import { normalizeForAnalysis } from './normalizeForAnalysis';
import {
  CHATLIKE_INTAKE_TEXT_MAX_CHARS,
  EMPLOYEE_CHATLIKE_PROMPT,
  EMPLOYEE_CHATLIKE_USER_MESSAGE,
} from './prompts/employee-chatlike';
import { runChatlikeMultiFileExtraction } from './runStructuredExtraction';
import { extractPdfPlainTextWithGlyphFallback } from './documentPlainText';
import {
  flattenExtractionPayload,
  parseJsonFromAssistant,
} from './parseJsonResponse';
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
  mode: 'freeform';
  intakeTextLen: number;
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

function isIntakeDoc(docType: string | null | undefined): boolean {
  const t = docType || '';
  return isIntakeDocumentType(t) || t.toLowerCase().includes('intake');
}

/**
 * Prefer sectie-17 / checkbox regions; fall back to a head+tail slice of the full text.
 */
export function buildIntakeTextExcerptForChatlike(
  fullText: string,
  maxChars = CHATLIKE_INTAKE_TEXT_MAX_CHARS
): string {
  const text = fullText.replace(/\u00a0/g, ' ').trim();
  if (!text) return '';

  const markers = [
    /Hoe verplaatst werknemer zich/i,
    /Rijbewij/i,
    /Computervaardigheden/i,
    /Digitale vaardigheden/i,
    /\bNederlands\b/i,
    /\bTalen\b/i,
  ];

  let bestStart = -1;
  for (const re of markers) {
    const m = text.match(re);
    if (m?.index != null && (bestStart < 0 || m.index < bestStart)) {
      bestStart = m.index;
    }
  }

  if (bestStart >= 0) {
    const windowStart = Math.max(0, bestStart - 800);
    const slice = text.slice(windowStart, windowStart + maxChars);
    if (slice.length >= 200) return slice;
  }

  if (text.length <= maxChars) return text;
  const head = Math.floor(maxChars * 0.45);
  const tail = maxChars - head - 20;
  return `${text.slice(0, head)}\n\n…\n\n${text.slice(-tail)}`;
}

/**
 * Map freeform parsed JSON to employee details + referent (no checkbox clear-on-null).
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

/** Parse freeform model output into a flat employee_details-ish record. */
export function parseChatlikeEmployeeOutput(outputText: string): Record<string, unknown> {
  const parsed = parseJsonFromAssistant(outputText);
  return flattenExtractionPayload(parsed);
}

/**
 * ChatGPT-style employee extract: all docs + intake text grounding, freeform JSON (no schema).
 */
export async function extractEmployeeDetailsChatlike(
  openai: OpenAI,
  docs: ChatlikeDocInput[]
): Promise<EmployeeChatlikeExtractionResult> {
  if (!docs.length) {
    return {
      raw: {},
      referentFields: {},
      documentCount: 0,
      documentLabels: [],
      mode: 'freeform',
      intakeTextLen: 0,
    };
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
  let intakePdfBuffer: Buffer | null = null;

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
    if (!intakePdfBuffer && isIntakeDoc(doc.docType)) {
      intakePdfBuffer = pdfBuffer;
    }
  }

  let intakeTextLen = 0;
  let intakeExcerpt = '';
  if (intakePdfBuffer) {
    const plain = await extractPdfPlainTextWithGlyphFallback(intakePdfBuffer);
    intakeTextLen = plain.length;
    intakeExcerpt = buildIntakeTextExcerptForChatlike(plain);
    console.log(
      `📋 Chatlike intake text len=${intakeTextLen} excerpt=${intakeExcerpt.length} glyphs=${/[☒☐☑]/.test(plain)}`
    );
  }

  const labels = documentLabels.join(', ');
  let userMessage = `${EMPLOYEE_CHATLIKE_USER_MESSAGE}\n\nGeüploade documenten (${files.length}): ${labels}`;
  if (intakeExcerpt) {
    userMessage += `\n\n--- Intake PDF-tekst (checkboxes / sectie 17 e.d.) ---\n${intakeExcerpt}\n--- Einde intake PDF-tekst ---`;
  }

  console.log(
    `📋 Chatlike freeform extract: ${files.length} file(s) — ${labels}`
  );

  const outputText = await runChatlikeMultiFileExtraction({
    openai,
    files,
    instructions: EMPLOYEE_CHATLIKE_PROMPT,
    userMessage,
    usePdfVision: true,
    logLabel: 'Employee chatlike freeform',
  });

  const parsed = parseChatlikeEmployeeOutput(outputText);
  const { detailsRaw, referentFields } = buildChatlikeEmployeeDetailsFromRaw(parsed);

  console.log(
    `✅ Chatlike freeform fields: ${Object.keys(detailsRaw).length} (docs=${files.length}, intakeTextLen=${intakeTextLen})`
  );

  return {
    raw: detailsRaw,
    referentFields,
    documentCount: files.length,
    documentLabels,
    mode: 'freeform',
    intakeTextLen,
  };
}
