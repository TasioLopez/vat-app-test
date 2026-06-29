import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import {
  extractStoragePath,
  isIntakeDocumentType,
  runAssistantExtraction,
  INTAKE_TP2_PROMPT,
  INTAKE_TP2_USER_MESSAGE,
  AD_TP2_DATE_PROMPT,
  AD_TP2_DATE_USER_MESSAGE,
  FML_TP2_DATE_PROMPT,
  FML_TP2_DATE_USER_MESSAGE,
} from '@/lib/document-analysis';
import { normalizeTp2ExtractedData } from '@/lib/tp2026/intake-tp2-normalize';
import {
  docsIncludeAdReport,
  isAdDocumentType,
  resolveTp2HasAdReport,
} from '@/lib/tp/intake-ad-presence';

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

function isFmlDocumentType(type: string | null | undefined): boolean {
  const t = (type || '').toLowerCase();
  return t === 'fml' || t === 'izp' || t === 'lab' || t.includes('fml') || t.includes('izp');
}

async function extractFromDocument(
  doc: DocRow,
  options: {
    assistantName: string;
    instructions: string;
    userMessage: string;
  }
): Promise<Record<string, unknown>> {
  const downloaded = await downloadDocumentBuffer(doc);
  if (!downloaded) return {};

  try {
    const { parsed } = await runAssistantExtraction(openai, {
      buffer: downloaded.buffer,
      storagePath: downloaded.path,
      fallbackName: doc.name ?? undefined,
      assistantName: options.assistantName,
      instructions: options.instructions,
      userMessage: options.userMessage,
    });
    return parsed;
  } catch (error) {
    console.error('❌ Extraction failed for', doc.type, error);
    return {};
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
      assistantName: 'TP2 Intake Metadata Extractor',
      instructions: INTAKE_TP2_PROMPT,
      userMessage: INTAKE_TP2_USER_MESSAGE,
    });
  } else {
    console.log('⚠️ No intake document found for TP2 extraction');
  }

  if (!isFilled(merged.ad_report_date) && adDoc) {
    console.log('📋 TP2 fallback: AD report date');
    const adParsed = await extractFromDocument(adDoc, {
      assistantName: 'TP2 AD Date Extractor',
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
      assistantName: 'TP2 FML Date Extractor',
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
  console.log('🚀 Starting autofill-tp-2 request');

  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const testMode = searchParams.get('test') === 'true';

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Missing employeeId', data: { details: {} } },
        { status: 400 }
      );
    }

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

    console.log('✅ Final extracted TP2 data:', extractedData);

    return NextResponse.json({
      success: true,
      details: extractedData,
      autofilled_fields: Object.keys(extractedData),
      message: `TP2 metadata gevonden in documenten - ${Object.keys(extractedData).length} velden ingevuld`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Server error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error bij autofill', details: message, data: { details: {} } },
      { status: 500 }
    );
  }
}
