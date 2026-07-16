import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import {
  extractStoragePath,
  isIntakeDocumentType,
  mapAndValidateEmployeeDetails,
  extractReferentFromRaw,
  mergeReferentFields,
  getAutofillCompleteness,
  AD_EMPLOYEE_PROMPT,
  AD_EMPLOYEE_USER_MESSAGE,
  FML_EMPLOYEE_PROMPT,
  FML_EMPLOYEE_USER_MESSAGE,
  EXTRA_EMPLOYEE_PROMPT,
  EXTRA_EMPLOYEE_USER_MESSAGE,
  GotenbergConversionError,
  isGotenbergConversionError,
} from '@/lib/document-analysis';
import { isFmlDocumentType } from '@/lib/document-analysis/doc-type-matchers';
import { extractIntakeEmployeeDetailsFromVision } from '@/lib/document-analysis/extractIntakeEmployeeDetails';
import { normalizeForAnalysis } from '@/lib/document-analysis/normalizeForAnalysis';
import { runStructuredFileExtraction } from '@/lib/document-analysis/runStructuredExtraction';
import {
  EMPLOYEE_EXTRACTION_JSON_SCHEMA,
  parseEmployeeExtractionResult,
} from '@/lib/document-analysis/schemas/employee-extraction-schema';
import { stripAssistantArtifactsFromRecord } from '@/lib/document-analysis/stripAssistantArtifacts';
import { formatDutchPhoneDisplay } from '@/lib/phone/format-dutch-display';
import {
  isCvEmployeeDocType,
  isSpreekReportageDocType,
} from '@/lib/documents/employee-doc-types';
import { requireEmployeeAutofillAccess } from '@/lib/auth/autofill-access';
import { isIntakeLockedTransportField } from '@/lib/tp2026/gegevens-field-options';

export const maxDuration = 120;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const AD_FIRST_FIELDS = ['drivers_license', 'drivers_license_type'];

function isFilled(v: unknown): boolean {
  return v != null && v !== '' && (typeof v !== 'string' || v.trim() !== '');
}

type DocRow = { type?: string | null; url?: string | null; name?: string | null };

async function downloadDocumentBuffer(
  doc: DocRow
): Promise<{ buffer: Buffer; path: string } | null> {
  const path = extractStoragePath(doc.url || '');
  if (!path) {
    console.log('⚠️ Could not extract storage path for document', {
      type: doc.type,
      url: doc.url?.substring(0, 120),
    });
    return null;
  }

  const { data: file, error } = await supabase.storage.from('documents').download(path);
  if (!file) {
    console.log('⚠️ Could not download document', {
      type: doc.type,
      path,
      error: error?.message,
    });
    return null;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return { buffer, path };
}

async function processIntakeForm(doc: DocRow): Promise<{
  mapped: Record<string, unknown>;
  referent: Record<string, unknown>;
}> {
  console.log(`📋 Processing intake form (vision): ${doc.type}`);

  try {
    const downloaded = await downloadDocumentBuffer(doc);
    if (!downloaded) return { mapped: {}, referent: {} };

    const { buffer, path } = downloaded;
    const fallbackName = doc.name || `${doc.type || 'document'}`;

    const { raw, referentFields } = await extractIntakeEmployeeDetailsFromVision(
      openai,
      buffer,
      fallbackName || path
    );

    const cleanedParsed = stripAssistantArtifactsFromRecord(raw);
    const referent = extractReferentFromRaw({ ...cleanedParsed, ...referentFields });
    const mapped = mapAndValidateEmployeeDetails(cleanedParsed);

    console.log(`✅ Intake form processing completed: ${Object.keys(mapped).length} fields`);
    return { mapped, referent };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof GotenbergConversionError || isGotenbergConversionError(message)) {
      throw error instanceof GotenbergConversionError
        ? error
        : new GotenbergConversionError(message);
    }
    console.error('❌ Error processing intake form:', message);
    return { mapped: {}, referent: {} };
  }
}

async function processDocumentWithVisionExtraction(
  doc: DocRow,
  options: {
    logLabel: string;
    instructions: string;
    userMessage: string;
  }
): Promise<{ mapped: Record<string, unknown>; referent: Record<string, unknown> }> {
  console.log(`📋 Processing ${options.logLabel}: ${doc.type}`);

  try {
    const downloaded = await downloadDocumentBuffer(doc);
    if (!downloaded) return { mapped: {}, referent: {} };

    const { buffer, path } = downloaded;
    const fallbackName = doc.name || `${doc.type || 'document'}`;

    const { pdfBuffer, analysisFilename, wasConverted } = await normalizeForAnalysis(
      buffer,
      fallbackName || path
    );
    if (wasConverted) {
      console.log(`✅ ${options.logLabel} normalized to PDF (${analysisFilename})`);
    }

    const parsed = await runStructuredFileExtraction({
      openai,
      buffer,
      storagePath: path,
      fallbackName,
      instructions: options.instructions,
      userMessage: options.userMessage,
      schemaName: 'employee_extraction',
      schema: EMPLOYEE_EXTRACTION_JSON_SCHEMA as Record<string, unknown>,
      parse: parseEmployeeExtractionResult,
      pdfBuffer,
      analysisFilename,
      usePdfVision: true,
    });

    const cleanedParsed = stripAssistantArtifactsFromRecord(parsed);
    const referent = extractReferentFromRaw(cleanedParsed);
    const mapped = mapAndValidateEmployeeDetails(cleanedParsed);

    console.log(`✅ ${options.logLabel} processing completed: ${Object.keys(mapped).length} fields`);
    return { mapped, referent };
  } catch (error: unknown) {
    if (error instanceof GotenbergConversionError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error processing ${options.logLabel}:`, message);
    return { mapped: {}, referent: {} };
  }
}

async function processADReport(doc: DocRow) {
  return processDocumentWithVisionExtraction(doc, {
    logLabel: 'AD report',
    instructions: AD_EMPLOYEE_PROMPT,
    userMessage: AD_EMPLOYEE_USER_MESSAGE,
  });
}

async function processFMLIZP(doc: DocRow) {
  return processDocumentWithVisionExtraction(doc, {
    logLabel: 'FML/IZP',
    instructions: FML_EMPLOYEE_PROMPT,
    userMessage: FML_EMPLOYEE_USER_MESSAGE,
  });
}

async function processExtraDoc(doc: DocRow) {
  if (isIntakeDocumentType(doc.type)) {
    return processIntakeForm(doc);
  }

  return processDocumentWithVisionExtraction(doc, {
    logLabel: 'extra document',
    instructions: EXTRA_EMPLOYEE_PROMPT,
    userMessage: EXTRA_EMPLOYEE_USER_MESSAGE,
  });
}

async function processDocumentsSeparately(docs: DocRow[]): Promise<{
  results: Record<string, unknown>;
  referent: Record<string, unknown>;
  intakeProcessed: boolean;
}> {
  console.log('🚀 Processing documents separately with vision extraction...');

  const results: Record<string, unknown> = {};
  let referent: Record<string, unknown> = {};
  let intakeProcessed = false;
  const processedDocs: string[] = [];

  const intakeDoc = docs.find((d) => (d.type || '').toLowerCase().includes('intake'));

  if (intakeDoc) {
    console.log('📄 Processing intake form (priority 1)...');
    const intakeResult = await processIntakeForm(intakeDoc);
    Object.assign(results, intakeResult.mapped);
    referent = intakeResult.referent;
    intakeProcessed = true;
    processedDocs.push('intakeformulier');
    console.log(`✅ Intake form: ${Object.keys(intakeResult.mapped).length} fields extracted`);
  }

  const adDoc = docs.find((d) => {
    const type = (d.type || '').toLowerCase();
    return type.includes('ad') || type.includes('arbeidsdeskundig');
  });

  if (adDoc) {
    console.log('📄 Processing AD report (priority 2)...');
    const adResult = await processADReport(adDoc);
    Object.keys(adResult.mapped).forEach((key) => {
      const adValue = adResult.mapped[key];
      if (isIntakeLockedTransportField(intakeProcessed, key)) {
        return;
      }
      if (key === 'work_experience' && intakeProcessed && isFilled(results[key])) {
        return;
      }
      if (AD_FIRST_FIELDS.includes(key)) {
        if (isFilled(adValue)) results[key] = adValue;
      } else if (!isFilled(results[key])) {
        results[key] = adValue;
      }
    });
    if (!intakeProcessed) {
      referent = mergeReferentFields(referent, adResult.referent);
      if (Object.keys(adResult.referent).length > 0) {
        console.log('✅ AD report: referent contact extracted');
      }
    }
    processedDocs.push('ad_rapport');
    console.log(`✅ AD report: ${Object.keys(adResult.mapped).length} fields extracted`);
  }

  const fmlDoc = docs.find((d) => isFmlDocumentType(d.type));

  if (fmlDoc) {
    console.log('📄 Processing FML/IZP (priority 3)...');
    const fmlResult = await processFMLIZP(fmlDoc);
    Object.keys(fmlResult.mapped).forEach((key) => {
      if (isIntakeLockedTransportField(intakeProcessed, key)) return;
      if (!isFilled(results[key])) results[key] = fmlResult.mapped[key];
    });
    if (!intakeProcessed) {
      referent = mergeReferentFields(referent, fmlResult.referent);
    }
    processedDocs.push('fml/izp');
    console.log(`✅ FML/IZP: ${Object.keys(fmlResult.mapped).length} fields extracted`);
  }

  const extraDocs = docs.filter((d) => {
    const type = (d.type || '').toLowerCase();
    if (type === 'tp' || type.includes('trajectplan')) {
      return false;
    }
    return (
      !type.includes('intake') &&
      !type.includes('ad') &&
      !type.includes('arbeidsdeskundig') &&
      !isFmlDocumentType(type) &&
      !isCvEmployeeDocType(type) &&
      !isSpreekReportageDocType(type)
    );
  });

  if (extraDocs.length > 0) {
    console.log(`📄 Processing ${extraDocs.length} extra document(s) (priority 4)...`);
    for (const extraDoc of extraDocs) {
      const extraResult = await processExtraDoc(extraDoc);
      Object.keys(extraResult.mapped).forEach((key) => {
        if (isIntakeLockedTransportField(intakeProcessed, key)) return;
        if (!isFilled(results[key])) results[key] = extraResult.mapped[key];
      });
      if (!intakeProcessed) {
        referent = mergeReferentFields(referent, extraResult.referent);
      }
    }
    processedDocs.push('extra');
    console.log('✅ Extra documents: processed');
  }

  console.log(
    `✅ Document processing completed. Processed: ${processedDocs.join(', ')}. Total fields: ${Object.keys(results).length}`
  );

  return { results, referent, intakeProcessed };
}

export async function GET(req: NextRequest) {
  try {
    const access = await requireEmployeeAutofillAccess(req);
    if (access instanceof NextResponse) return access;
    const { employeeId } = access;

    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('employee_id', employeeId);

    if (docsError) {
      console.error('Database error:', docsError);
      return NextResponse.json({
        success: false,
        error: 'Database error',
        data: { details: {} },
      }, { status: 500 });
    }

    if (!docs || docs.length === 0) {
      return NextResponse.json({
        success: true,
        data: { details: {} },
        message: 'No documents found for this employee',
      });
    }

    console.log('📄 Found documents:', docs.length);

    const { results: details, referent, intakeProcessed } = await processDocumentsSeparately(docs);

    if (Object.keys(details).length === 0) {
      console.error('❌ No data extracted from documents');
      return NextResponse.json({
        success: false,
        data: { details: {} },
        message: 'Geen relevante informatie gevonden in de documenten',
      });
    }

    const { incomplete: autofill_incomplete, warnings: autofill_warnings } = getAutofillCompleteness(
      details,
      { intakeProcessed }
    );

    let suggested_referent: {
      first_name: string;
      last_name: string;
      referent_function?: string;
      phone?: string;
      email?: string;
      gender?: string;
    } | null = null;
    let referent_exists = false;
    let existing_referent_id: string | null = null;

    const refFirst = (referent.referent_first_name ?? '').toString().trim();
    const refLast = (referent.referent_last_name ?? '').toString().trim();

    if (refFirst || refLast) {
      console.log('📇 Referent extracted:', {
        has_function: Boolean(referent.referent_function),
        has_phone: Boolean(referent.referent_phone),
        has_email: Boolean(referent.referent_email),
      });
      suggested_referent = {
        first_name: refFirst,
        last_name: refLast,
        referent_function:
          referent.referent_function != null ? String(referent.referent_function).trim() : undefined,
        phone:
          referent.referent_phone != null && referent.referent_phone !== ''
            ? formatDutchPhoneDisplay(String(referent.referent_phone).trim()) ??
              String(referent.referent_phone).trim()
            : undefined,
        email:
          referent.referent_email != null && referent.referent_email !== ''
            ? String(referent.referent_email).trim()
            : undefined,
        gender:
          referent.referent_gender != null && referent.referent_gender !== ''
            ? String(referent.referent_gender).trim()
            : undefined,
      };

      const { data: employee } = await supabase
        .from('employees')
        .select('client_id')
        .eq('id', employeeId)
        .single();

      if (employee?.client_id) {
        const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
        const suggestedFull = normalize(`${refFirst} ${refLast}`);
        const { data: referents } = await (supabase as any)
          .from('referents')
          .select('id, first_name, last_name')
          .eq('client_id', employee.client_id);

        const match = referents?.find(
          (r: { id: string; first_name: string | null; last_name: string | null }) => {
            const full = normalize(`${r.first_name ?? ''} ${r.last_name ?? ''}`);
            return (
              full === suggestedFull ||
              (suggestedFull && full.includes(suggestedFull)) ||
              (full && suggestedFull.includes(full))
            );
          }
        );
        if (match) {
          referent_exists = true;
          existing_referent_id = match.id;
        }
      }
    }

    console.log('✅ Document processing completed');

    return NextResponse.json({
      success: true,
      data: {
        details,
        autofilled_fields: Object.keys(details),
        autofill_incomplete,
        autofill_warnings,
        suggested_referent: suggested_referent ?? undefined,
        referent_exists,
        existing_referent_id: existing_referent_id ?? undefined,
      },
      message: `Employee information successfully extracted from ${docs.length} documents using separate document processing`,
    });
  } catch (error: unknown) {
    if (error instanceof GotenbergConversionError) {
      console.error('❌ Gotenberg conversion error:', error.message);
      return NextResponse.json(
        {
          success: false,
          error: error.userMessage,
          details: error.message,
          data: { details: {} },
        },
        { status: 503 }
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Processing failed',
      details: message,
      data: { details: {} },
    }, { status: 500 });
  }
}
