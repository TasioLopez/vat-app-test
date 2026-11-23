import type OpenAI from 'openai';
import { classifyDossierFileName } from '@/lib/intake/dossier-files';
import { isIntakeDocumentType } from './storage';
import { normalizeForAnalysis } from './normalizeForAnalysis';
import {
  CHATLIKE_INTAKE_TEXT_MAX_CHARS,
  EMPLOYEE_CHATLIKE_PROMPT,
  EMPLOYEE_CHATLIKE_USER_MESSAGE,
} from './prompts/employee-chatlike';
import {
  runChatlikeMultiFileExtraction,
  type InlineTextInput,
} from './runStructuredExtraction';
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
  intakePlainText: string;
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

/** Split chatlike inputs: plain TXT stays inline; binaries go through PDF normalize. */
export function partitionChatlikeDocInputs(docs: ChatlikeDocInput[]): {
  binaryDocs: ChatlikeDocInput[];
  inlineTexts: InlineTextInput[];
  documentLabels: string[];
} {
  const binaryDocs: ChatlikeDocInput[] = [];
  const inlineTexts: InlineTextInput[] = [];
  const documentLabels: string[] = [];

  docs.forEach((doc, index) => {
    const fallbackName = doc.filename || `${doc.docType || 'document'}.pdf`;
    const label = labelForDoc(doc, index);
    if (classifyDossierFileName(fallbackName) === 'inline-text') {
      const text = doc.buffer.toString('utf8').trim();
      if (!text) return;
      inlineTexts.push({ label, text });
      documentLabels.push(label);
      return;
    }
    binaryDocs.push(doc);
    documentLabels.push(label);
  });

  return { binaryDocs, inlineTexts, documentLabels };
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
      intakePlainText: '',
    };
  }

  const sorted = [...docs].sort(
    (a, b) => docSortKey(a.docType) - docSortKey(b.docType)
  );

  const partitioned = partitionChatlikeDocInputs(sorted);
  const inlineTexts = partitioned.inlineTexts;
  const files: {
    pdfBuffer: Buffer;
    analysisFilename: string;
    label: string;
  }[] = [];
  const documentLabels: string[] = [];
  let intakePdfBuffer: Buffer | null = null;

  for (let i = 0; i < partitioned.binaryDocs.length; i++) {
    const doc = partitioned.binaryDocs[i]!;
    const fallbackName = doc.filename || `${doc.docType || 'document'}.pdf`;
    const label = labelForDoc(doc, i);
    try {
      const { pdfBuffer, analysisFilename, wasConverted } = await normalizeForAnalysis(
        doc.buffer,
        fallbackName
      );
      const pdfLabel = labelForDoc({ ...doc, filename: analysisFilename }, i);
      if (wasConverted) {
        console.log(`✅ Chatlike normalized to PDF: ${pdfLabel}`);
      }
      files.push({ pdfBuffer, analysisFilename, label: pdfLabel });
      documentLabels.push(pdfLabel);
      if (!intakePdfBuffer && isIntakeDoc(doc.docType)) {
        intakePdfBuffer = pdfBuffer;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn(`⚠️ Chatlike: skipping document normalize (${label}): ${message}`);
    }
  }
  for (const item of inlineTexts) documentLabels.push(item.label);

  if (!files.length && !inlineTexts.length) {
    return {
      raw: {},
      referentFields: {},
      documentCount: 0,
      documentLabels: [],
      mode: 'freeform',
      intakeTextLen: 0,
      intakePlainText: '',
    };
  }

  let intakeTextLen = 0;
  let intakeExcerpt = '';
  let intakePlainText = '';
  if (intakePdfBuffer) {
    const plain = await extractPdfPlainTextWithGlyphFallback(intakePdfBuffer);
    intakePlainText = plain;
    intakeTextLen = plain.length;
    intakeExcerpt = buildIntakeTextExcerptForChatlike(plain);
    console.log(
      `📋 Chatlike intake text len=${intakeTextLen} excerpt=${intakeExcerpt.length} glyphs=${/[☒☐☑]/.test(plain)}`
    );
  }

  let userMessage = EMPLOYEE_CHATLIKE_USER_MESSAGE;
  if (intakeExcerpt) {
    userMessage += `\n\n--- Intake PDF-tekst (checkboxes / sectie 17 e.d.) ---\n${intakeExcerpt}\n--- Einde intake PDF-tekst ---`;
  }

  console.log(
    `📋 Chatlike freeform extract: ${files.length} file(s), ${inlineTexts.length} inline — ${documentLabels.join(', ')}`
  );

  const outputText = await runChatlikeMultiFileExtraction({
    openai,
    files,
    inlineTexts,
    instructions: EMPLOYEE_CHATLIKE_PROMPT,
    userMessage,
    usePdfVision: true,
    logLabel: 'Employee chatlike freeform',
  });

  const parsed = parseChatlikeEmployeeOutput(outputText);
  const { detailsRaw, referentFields } = buildChatlikeEmployeeDetailsFromRaw(parsed);

  const documentCount = files.length + inlineTexts.length;
  console.log(
    `✅ Chatlike freeform fields: ${Object.keys(detailsRaw).length} (docs=${documentCount}, intakeTextLen=${intakeTextLen})`
  );

  return {
    raw: detailsRaw,
    referentFields,
    documentCount,
    documentLabels,
    mode: 'freeform',
    intakeTextLen,
    intakePlainText,
  };
}
