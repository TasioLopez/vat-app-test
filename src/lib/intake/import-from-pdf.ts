import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractIntakeEmployeeDetailsFromVision } from '@/lib/document-analysis/extractIntakeEmployeeDetails';
import { getIntakeDocumentForEmployee } from '@/lib/document-analysis/getIntakeDocument';
import { normalizeForAnalysis } from '@/lib/document-analysis/normalizeForAnalysis';
import { runStructuredFileExtraction } from '@/lib/document-analysis/runStructuredExtraction';
import { INTAKE_TP2_PROMPT, INTAKE_TP2_USER_MESSAGE } from '@/lib/document-analysis';
import {
  TP2_EXTRACTION_JSON_SCHEMA,
  parseTp2ExtractionResult,
} from '@/lib/document-analysis/schemas/tp2-extraction-schema';
import { normalizeTp2ExtractedData } from '@/lib/tp2026/intake-tp2-normalize';
import { generateIntakeSectie3Content } from '@/lib/tp/intake-sectie3/generate';
import { generateIntakeSectie5Content } from '@/lib/tp/intake-sectie5/generate';
import { generateIntakeSectie7Content } from '@/lib/tp/intake-sectie7/generate';
import {
  INTAKE_NARRATIVE_JSON_SCHEMA,
  INTAKE_NARRATIVE_PROMPT,
  INTAKE_NARRATIVE_USER_MESSAGE,
  parseIntakeNarrativeResult,
} from '@/lib/intake/narrative-schema';
import { mergeExtractionsIntoIntake } from '@/lib/intake/merge-extractions';
import { createEmptyIntakeData, ensureIntakeShape, type IntakeData } from '@/lib/intake/schema';
import { applyIntakeCheckboxOverridesFromText } from '@/lib/intake/checkbox-overrides';
import { applyIntakeCheckboxTextOverrides } from '@/lib/document-analysis/intakeCheckboxText';
import { extractPdfPlainTextWithGlyphFallback } from '@/lib/document-analysis/documentPlainText';

export type ImportIntakeFromPdfResult = {
  data: IntakeData;
  sourceDocumentId: string | null;
  error?: string;
};

export type ImportIntakePhase =
  | 'vision'
  | 'tp2'
  | 'narrative'
  | 'sectie3'
  | 'sectie5'
  | 'sectie7';

export async function importIntakeFromPdf(params: {
  openai: OpenAI;
  supabase: SupabaseClient;
  employeeId: string;
  existingData?: unknown;
  onPhase?: (phase: ImportIntakePhase) => void;
}): Promise<ImportIntakeFromPdfResult> {
  const { openai, supabase, employeeId, onPhase } = params;
  const base = params.existingData
    ? ensureIntakeShape(params.existingData)
    : createEmptyIntakeData();

  const doc = await getIntakeDocumentForEmployee(supabase, employeeId);
  if (!doc) {
    return { data: base, sourceDocumentId: null, error: 'Geen intakeformulier-document gevonden.' };
  }

  const { data: docs } = await supabase
    .from('documents')
    .select('id, type, url, name, uploaded_at')
    .eq('employee_id', employeeId)
    .order('uploaded_at', { ascending: false });

  const intakeDocRow = (docs || []).find((d) => {
    const t = (d.type || '').toLowerCase();
    return t.includes('intake');
  });

  const { data: employee } = await supabase
    .from('employees')
    .select('first_name, last_name')
    .eq('id', employeeId)
    .maybeSingle();

  const employeeName = [employee?.first_name, employee?.last_name].filter(Boolean).join(' ');

  const { data: clientLink } = await supabase
    .from('employees')
    .select('client_id')
    .eq('id', employeeId)
    .maybeSingle();

  let employer = '';
  if (clientLink?.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', clientLink.client_id)
      .maybeSingle();
    employer = client?.name || '';
  }

  const filename = doc.displayName || doc.path;
  onPhase?.('vision');
  const vision = await extractIntakeEmployeeDetailsFromVision(openai, doc.buffer, filename);

  const { pdfBuffer, analysisFilename } = await normalizeForAnalysis(doc.buffer, filename);
  onPhase?.('tp2');
  const tp2Raw = await runStructuredFileExtraction({
    openai,
    buffer: pdfBuffer,
    storagePath: doc.path,
    fallbackName: analysisFilename,
    pdfBuffer,
    analysisFilename,
    instructions: INTAKE_TP2_PROMPT,
    userMessage: INTAKE_TP2_USER_MESSAGE,
    schemaName: 'intake_tp2_extraction',
    schema: TP2_EXTRACTION_JSON_SCHEMA as Record<string, unknown>,
    parse: parseTp2ExtractionResult,
  });
  let plainText: string | null = null;
  try {
    plainText = await extractPdfPlainTextWithGlyphFallback(pdfBuffer);
  } catch (e) {
    console.warn('Intake import checkbox text extraction failed', e);
  }
  const tp2 = normalizeTp2ExtractedData(
    applyIntakeCheckboxOverridesFromText(tp2Raw || {}, plainText, 'Intake import')
  );

  onPhase?.('narrative');
  const narrativeRaw = await runStructuredFileExtraction({
    openai,
    buffer: pdfBuffer,
    storagePath: doc.path,
    fallbackName: analysisFilename,
    pdfBuffer,
    analysisFilename,
    instructions: INTAKE_NARRATIVE_PROMPT,
    userMessage: INTAKE_NARRATIVE_USER_MESSAGE,
    schemaName: 'intake_narrative_extraction',
    schema: INTAKE_NARRATIVE_JSON_SCHEMA as Record<string, unknown>,
    parse: parseIntakeNarrativeResult,
  });

  const employeeDocs = (docs || []).map((d) => ({
    type: d.type,
    url: d.url,
    uploaded_at: d.uploaded_at,
  }));

  let sectie3: Record<string, unknown> = {};
  let sectie5: Record<string, unknown> = {};
  let sectie7: Record<string, unknown> = {};
  try {
    onPhase?.('sectie3');
    sectie3 = (await generateIntakeSectie3Content(openai, supabase, employeeDocs)) as Record<
      string,
      unknown
    >;
  } catch (e) {
    console.warn('Intake import sectie3 failed', e);
  }
  try {
    onPhase?.('sectie5');
    sectie5 = (await generateIntakeSectie5Content(openai, supabase, employeeDocs)) as Record<
      string,
      unknown
    >;
  } catch (e) {
    console.warn('Intake import sectie5 failed', e);
  }
  try {
    onPhase?.('sectie7');
    sectie7 = (await generateIntakeSectie7Content(openai, supabase, employeeDocs, {
      meta: tp2,
    })) as Record<string, unknown>;
  } catch (e) {
    console.warn('Intake import sectie7 failed', e);
  }

  // Apply rijbewijs/vervoer glyph overrides before merge so vision cannot invent
  // checked boxes when PDF text shows all ☐ (or positive checks).
  const algemene = { ...(vision.raw || {}) };
  applyIntakeCheckboxTextOverrides(algemene, plainText);

  const merged = mergeExtractionsIntoIntake(base, {
    core: vision.raw,
    algemene,
    tp2,
    sectie3,
    sectie5,
    sectie7,
    narrative: narrativeRaw || {},
    employeeName,
    employer,
    sourceNotes: [`Geïmporteerd uit ${filename}`],
  });

  return {
    data: merged,
    sourceDocumentId: intakeDocRow?.id ?? null,
  };
}
