import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import {
  extractStoragePath,
  isIntakeDocumentType,
  INTAKE_TP2_PROMPT,
  INTAKE_TP2_USER_MESSAGE,
  AD_TP2_DATE_PROMPT,
  AD_TP2_DATE_USER_MESSAGE,
  FML_TP2_DATE_PROMPT,
  FML_TP2_DATE_USER_MESSAGE,
  GotenbergConversionError,
} from '@/lib/document-analysis';
import { isAdDocumentType, isFmlDocumentType } from '@/lib/document-analysis/doc-type-matchers';
import { normalizeForAnalysis } from '@/lib/document-analysis/normalizeForAnalysis';
import { runStructuredFileExtraction } from '@/lib/document-analysis/runStructuredExtraction';
import {
  TP2_EXTRACTION_JSON_SCHEMA,
  parseTp2ExtractionResult,
} from '@/lib/document-analysis/schemas/tp2-extraction-schema';
import {
  AD_REPORT_DATE_JSON_SCHEMA,
  FML_IZP_DATE_JSON_SCHEMA,
  parseAdReportDateResult,
  parseFmlIzpDateResult,
} from '@/lib/document-analysis/schemas/tp2-date-schema';
import { normalizeTp2ExtractedData } from '@/lib/tp2026/intake-tp2-normalize';
import { docsIncludeAdReport, resolveTp2HasAdReport } from '@/lib/tp/intake-ad-presence';
import { detectAdReportConceptFromText } from '@/lib/tp/ad-report-wording';
import {
  bufferToPlainText,
  detectDocumentKind,
} from '@/lib/document-analysis/documentPlainText';
import { requireEmployeeAutofillAccess } from '@/lib/auth/autofill-access';

export const maxDuration = 120;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type DocRow = { id?: string; type?: string | null; url?: string | null; name?: string | null };

async function downloadDocumentBuffer(
  doc: DocRow
): Promise<{ buffer: Buffer; path: string } | null> {
  const path = extractStoragePath(doc.url || '');
  if (!path) return null;

  const { data: file, error } = await supabase.storage.from('documents').download(path);
  if (!file) {
    console.log('⚠️ Could not download document', { type: doc.type, path, error: error?.message });
    return null;
  }

  return { buffer: Buffer.from(await file.arrayBuffer()), path };
}

function isFilled(v: unknown): boolean {
  return v != null && v !== '' && (typeof v !== 'string' || v.trim() !== '');
}

type ExtractionSchemaConfig<T> = {
  schemaName: string;
  schema: Record<string, unknown>;
  parse: (raw: unknown) => T;
  instructions: string;
  userMessage: string;
};

async function extractFromDocument<T extends Record<string, unknown>>(
  doc: DocRow,
  config: ExtractionSchemaConfig<T>
): Promise<Record<string, unknown>> {
  const downloaded = await downloadDocumentBuffer(doc);
  if (!downloaded) return {};

  const fallbackName = doc.name ?? `${doc.type || 'document'}`;

  try {
    const { pdfBuffer, analysisFilename, wasConverted } = await normalizeForAnalysis(
      downloaded.buffer,
      fallbackName || downloaded.path
    );
    if (wasConverted) {
      console.log(`✅ TP2 document normalized to PDF (${analysisFilename})`);
    }

    const parsed = await runStructuredFileExtraction({
      openai,
      buffer: downloaded.buffer,
      storagePath: downloaded.path,
      fallbackName: doc.name ?? undefined,
      instructions: config.instructions,
      userMessage: config.userMessage,
      schemaName: config.schemaName,
      schema: config.schema,
      parse: config.parse,
      pdfBuffer,
      analysisFilename,
      usePdfVision: true,
    });
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof GotenbergConversionError) {
      throw error;
    }
    console.error('❌ Extraction failed for', doc.type, error);
    return {};
  }
}

async function resolveConceptFromIntakeText(intakeDoc: DocRow): Promise<boolean | null> {
  const downloaded = await downloadDocumentBuffer(intakeDoc);
  if (!downloaded) return null;

  try {
    const kind = detectDocumentKind(downloaded.path, intakeDoc.name);
    const plainText = await bufferToPlainText(downloaded.buffer, kind);
    return detectAdReportConceptFromText(plainText);
  } catch (error) {
    console.warn('⚠️ TP2 Concept checkbox text detection failed', error);
    return null;
  }
}

async function processTp2Documents(docs: DocRow[]): Promise<Record<string, unknown>> {
  const intakeDoc = docs.find((d) => isIntakeDocumentType(d.type));
  const adDoc = docs.find((d) => isAdDocumentType(d.type));
  const fmlDoc = docs.find((d) => isFmlDocumentType(d.type));

  let merged: Record<string, unknown> = {};

  if (intakeDoc) {
    console.log('📋 TP2 primary extraction: intake only');
    merged = await extractFromDocument(intakeDoc, {
      schemaName: 'tp2_extraction',
      schema: TP2_EXTRACTION_JSON_SCHEMA as Record<string, unknown>,
      parse: parseTp2ExtractionResult,
      instructions: INTAKE_TP2_PROMPT,
      userMessage: INTAKE_TP2_USER_MESSAGE,
    });

    // Deterministic Concept ☐/☒ wins over model (prevents false-positive concept).
    const conceptFromText = await resolveConceptFromIntakeText(intakeDoc);
    if (conceptFromText !== null) {
      console.log(`📋 TP2 Concept checkbox from text: ${conceptFromText}`);
      merged.ad_report_concept = conceptFromText;
    } else if (merged.ad_report_concept !== true) {
      merged.ad_report_concept = false;
    }
  } else {
    console.log('⚠️ No intake document found for TP2 extraction');
  }

  if (!isFilled(merged.ad_report_date) && adDoc) {
    console.log('📋 TP2 fallback: AD report date');
    const adParsed = await extractFromDocument(adDoc, {
      schemaName: 'ad_report_date',
      schema: AD_REPORT_DATE_JSON_SCHEMA as Record<string, unknown>,
      parse: parseAdReportDateResult,
      instructions: AD_TP2_DATE_PROMPT,
      userMessage: AD_TP2_DATE_USER_MESSAGE,
    });
    if (isFilled(adParsed.ad_report_date)) {
      merged.ad_report_date = adParsed.ad_report_date;
    }
  }

  if (!isFilled(merged.fml_izp_lab_date) && fmlDoc) {
    console.log('📋 TP2 fallback: FML/IZP date');
    const fmlParsed = await extractFromDocument(fmlDoc, {
      schemaName: 'fml_izp_date',
      schema: FML_IZP_DATE_JSON_SCHEMA as Record<string, unknown>,
      parse: parseFmlIzpDateResult,
      instructions: FML_TP2_DATE_PROMPT,
      userMessage: FML_TP2_DATE_USER_MESSAGE,
    });
    if (isFilled(fmlParsed.fml_izp_lab_date)) {
      merged.fml_izp_lab_date = fmlParsed.fml_izp_lab_date;
    }
  }

  return normalizeTp2ExtractedData(merged);
}

export async function GET(req: NextRequest) {
  try {
    const access = await requireEmployeeAutofillAccess(req);
    if (access instanceof NextResponse) return access;
    const { employeeId } = access;

    const testMode = req.nextUrl.searchParams.get('test') === 'true';

    if (testMode) {
      return NextResponse.json({
        success: true,
        details: {
          first_sick_day: '2024-01-15',
          registration_date: '2024-01-20',
          ad_report_date: '2024-02-01',
          occupational_doctor_name: 'Dr. Test Arts',
          occupational_doctor_org: 'Test Arbodienst',
          intake_date: '2024-01-10',
          has_ad_report: true,
        },
        autofilled_fields: [
          'first_sick_day',
          'registration_date',
          'ad_report_date',
          'occupational_doctor_name',
          'occupational_doctor_org',
          'intake_date',
          'has_ad_report',
        ],
        message: 'Test data returned (7 velden)',
      });
    }

    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('id, type, url, name, uploaded_at')
      .eq('employee_id', employeeId);

    if (docsError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database error fetching documents',
          details: docsError.message,
          data: { details: {} },
        },
        { status: 500 }
      );
    }

    if (!docs || docs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Geen documenten gevonden voor deze werknemer.',
        data: { details: {} },
      });
    }

    const extractedData = await processTp2Documents(docs);

    if (Object.keys(extractedData).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Geen relevante informatie gevonden in de documenten',
        data: { details: {} },
      });
    }

    resolveTp2HasAdReport(extractedData, docsIncludeAdReport(docs));

    return NextResponse.json({
      success: true,
      details: extractedData,
      autofilled_fields: Object.keys(extractedData),
      message: `TP2 metadata gevonden in documenten - ${Object.keys(extractedData).length} velden ingevuld`,
    });
  } catch (err: unknown) {
    if (err instanceof GotenbergConversionError) {
      console.error('❌ Gotenberg conversion error:', err.message);
      return NextResponse.json(
        {
          success: false,
          error: err.userMessage,
          details: err.message,
          data: { details: {} },
        },
        { status: 503 }
      );
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Server error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error bij autofill', details: message, data: { details: {} } },
      { status: 500 }
    );
  }
}
