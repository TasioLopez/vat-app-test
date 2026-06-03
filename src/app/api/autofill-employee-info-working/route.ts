import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import {
  extractStoragePath,
  getFileType,
  isIntakeDocumentType,
  runAssistantExtraction,
  mapAndValidateEmployeeDetails,
  extractReferentFromRaw,
  getAutofillCompleteness,
  INTAKE_EMPLOYEE_PROMPT,
  INTAKE_EMPLOYEE_USER_MESSAGE,
  AD_EMPLOYEE_PROMPT,
  AD_EMPLOYEE_USER_MESSAGE,
  FML_EMPLOYEE_PROMPT,
  FML_EMPLOYEE_USER_MESSAGE,
  EXTRA_EMPLOYEE_PROMPT,
  EXTRA_EMPLOYEE_USER_MESSAGE,
} from '@/lib/document-analysis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const AD_FIRST_FIELDS = ['work_experience', 'drivers_license', 'drivers_license_type'];

function isFilled(v: unknown): boolean {
  return v != null && v !== '' && (typeof v !== 'string' || v.trim() !== '');
}

type DocRow = { type?: string | null; url?: string | null; name?: string | null };

async function downloadDocumentBuffer(doc: DocRow): Promise<{ buffer: Buffer; fileType: ReturnType<typeof getFileType> } | null> {
  const path = extractStoragePath(doc.url || '');
  if (!path) {
    console.log('⚠️ Could not extract storage path for document');
    return null;
  }

  const { data: file } = await supabase.storage.from('documents').download(path);
  if (!file) {
    console.log('⚠️ Could not download document');
    return null;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileType = getFileType(path, doc.name ?? undefined);
  return { buffer, fileType };
}

function extractAllEducationLevels(text: string): string[] {
  if (!text) return [];

  const levels: string[] = [];
  const levelPatterns = [
    'MIDDELBARE TECHNISCHE SCHOOL',
    'LAGERE TECHNISCHE SCHOOL',
    'PRAKTIJKONDERWIJS',
    'MBO 4',
    'MBO 3',
    'MBO 2',
    'MBO 1',
    'MTS',
    'LTS',
    'HBO',
    'WO',
    'VWO',
    'HAVO',
    'VMBO',
  ];

  for (const pattern of levelPatterns) {
    const regex = new RegExp(`\\b${pattern.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(text)) {
      let normalized = pattern;
      if (pattern === 'MIDDELBARE TECHNISCHE SCHOOL') normalized = 'MTS';
      if (pattern === 'LAGERE TECHNISCHE SCHOOL') normalized = 'LTS';
      if (!levels.includes(normalized)) levels.push(normalized);
    }
  }

  return levels;
}

function getHighestEducationLevel(levels: string[]): string | null {
  if (!levels?.length) return null;

  const educationHierarchy: Record<string, number> = {
    Praktijkonderwijs: 1,
    VMBO: 2,
    LTS: 3,
    HAVO: 4,
    VWO: 5,
    'MBO 1': 6,
    'MBO 2': 7,
    MTS: 8,
    'MBO 3': 9,
    'MBO 4': 10,
    HBO: 11,
    WO: 12,
  };

  let highestLevel: string | null = null;
  let highestRank = 0;

  for (const level of levels) {
    if (!level) continue;
    const normalized = level.trim();

    if (educationHierarchy[normalized] !== undefined) {
      const rank = educationHierarchy[normalized];
      if (rank > highestRank) {
        highestRank = rank;
        highestLevel = normalized;
      }
      continue;
    }

    for (const [key, rank] of Object.entries(educationHierarchy)) {
      if (
        normalized.toUpperCase().includes(key.toUpperCase()) ||
        key.toUpperCase().includes(normalized.toUpperCase())
      ) {
        if (rank > highestRank) {
          highestRank = rank;
          highestLevel = key;
        }
        break;
      }
    }
  }

  return highestLevel;
}

async function processDocumentWithAssistant(
  doc: DocRow,
  options: {
    logLabel: string;
    assistantName: string;
    instructions: string;
    userMessage: string;
    postProcessEducation?: boolean;
  }
): Promise<{ mapped: Record<string, unknown>; referent: Record<string, unknown>; rawText: string }> {
  console.log(`📋 Processing ${options.logLabel}: ${doc.type}`);

  try {
    const downloaded = await downloadDocumentBuffer(doc);
    if (!downloaded) return { mapped: {}, referent: {}, rawText: '' };

    const { buffer, fileType } = downloaded;
    const fileName = `${doc.type}.${fileType.ext === 'docm' ? 'docm' : fileType.ext}`;

    const { rawText, parsed } = await runAssistantExtraction(openai, {
      buffer,
      fileName,
      mime: fileType.mime,
      assistantName: options.assistantName,
      instructions: options.instructions,
      userMessage: options.userMessage,
    });

    console.log(`✅ Uploaded ${options.logLabel} (${fileType.mime})`);

    const referent = extractReferentFromRaw(parsed);
    const mapped = mapAndValidateEmployeeDetails(parsed);

    if (options.postProcessEducation && rawText) {
      const educationLevels = extractAllEducationLevels(rawText);
      if (educationLevels.length > 0) {
        const highestLevel = getHighestEducationLevel(educationLevels);
        if (highestLevel) {
          console.log(
            `✅ Selected highest education level: ${highestLevel} from found levels: ${educationLevels.join(', ')}`
          );
          mapped.education_level = highestLevel;
        }
      }
    }

    console.log(`✅ ${options.logLabel} processing completed:`, Object.keys(mapped).length, 'fields');
    return { mapped, referent, rawText };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error processing ${options.logLabel}:`, message);
    return { mapped: {}, referent: {}, rawText: '' };
  }
}

async function processIntakeForm(doc: DocRow) {
  return processDocumentWithAssistant(doc, {
    logLabel: 'intake form',
    assistantName: 'Intake Form Analyzer',
    instructions: INTAKE_EMPLOYEE_PROMPT,
    userMessage: INTAKE_EMPLOYEE_USER_MESSAGE,
    postProcessEducation: true,
  });
}

async function processADReport(doc: DocRow) {
  const { mapped } = await processDocumentWithAssistant(doc, {
    logLabel: 'AD report',
    assistantName: 'AD Report Analyzer',
    instructions: AD_EMPLOYEE_PROMPT,
    userMessage: AD_EMPLOYEE_USER_MESSAGE,
  });
  return mapped;
}

async function processFMLIZP(doc: DocRow) {
  const { mapped } = await processDocumentWithAssistant(doc, {
    logLabel: 'FML/IZP',
    assistantName: 'FML/IZP Analyzer',
    instructions: FML_EMPLOYEE_PROMPT,
    userMessage: FML_EMPLOYEE_USER_MESSAGE,
  });
  return mapped;
}

async function processExtraDoc(doc: DocRow) {
  if (isIntakeDocumentType(doc.type)) {
    const { mapped } = await processIntakeForm(doc);
    return mapped;
  }

  const { mapped } = await processDocumentWithAssistant(doc, {
    logLabel: 'extra document',
    assistantName: 'Extra Document Analyzer',
    instructions: EXTRA_EMPLOYEE_PROMPT,
    userMessage: EXTRA_EMPLOYEE_USER_MESSAGE,
  });
  return mapped;
}

async function processDocumentsSeparately(docs: DocRow[]): Promise<{
  results: Record<string, unknown>;
  referent: Record<string, unknown>;
  intakeProcessed: boolean;
}> {
  console.log('🚀 Processing documents separately with document-specific instructions...');

  const results: Record<string, unknown> = {};
  let referent: Record<string, unknown> = {};
  let intakeProcessed = false;
  const processedDocs: string[] = [];

  const intakeDoc = docs.find((d) => (d.type || '').toLowerCase().includes('intake'));

  if (intakeDoc) {
    console.log('📄 Processing intake form (priority 1)...');
    const intakeResult = await processIntakeForm(intakeDoc);
    Object.assign(results, intakeResult.mapped);
    referent = { ...referent, ...intakeResult.referent };
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
    Object.keys(adResult).forEach((key) => {
      const adValue = adResult[key];
      if (AD_FIRST_FIELDS.includes(key)) {
        if (isFilled(adValue)) results[key] = adValue;
      } else if (!isFilled(results[key])) {
        results[key] = adValue;
      }
    });
    processedDocs.push('ad_rapport');
    console.log(`✅ AD report: ${Object.keys(adResult).length} fields extracted`);
  }

  const fmlDoc = docs.find((d) => {
    const type = (d.type || '').toLowerCase();
    return type === 'fml' || type === 'izp' || type === 'lab';
  });

  if (fmlDoc) {
    console.log('📄 Processing FML/IZP (priority 3)...');
    const fmlResult = await processFMLIZP(fmlDoc);
    Object.keys(fmlResult).forEach((key) => {
      if (!isFilled(results[key])) results[key] = fmlResult[key];
    });
    processedDocs.push('fml/izp');
    console.log(`✅ FML/IZP: ${Object.keys(fmlResult).length} fields extracted`);
  }

  const extraDocs = docs.filter((d) => {
    const type = (d.type || '').toLowerCase();
    return (
      !type.includes('intake') &&
      !type.includes('ad') &&
      !type.includes('arbeidsdeskundig') &&
      type !== 'fml' &&
      type !== 'izp' &&
      type !== 'lab'
    );
  });

  if (extraDocs.length > 0) {
    console.log(`📄 Processing ${extraDocs.length} extra document(s) (priority 4)...`);
    for (const extraDoc of extraDocs) {
      const extraResult = await processExtraDoc(extraDoc);
      Object.keys(extraResult).forEach((key) => {
        if (!isFilled(results[key])) results[key] = extraResult[key];
      });
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
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({
        success: false,
        error: 'Missing employeeId',
        data: { details: {} },
      }, { status: 400 });
    }

    console.log('🔍 Processing employee:', employeeId);

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
      suggested_referent = {
        first_name: refFirst,
        last_name: refLast,
        referent_function:
          referent.referent_function != null ? String(referent.referent_function).trim() : undefined,
        phone:
          referent.referent_phone != null && referent.referent_phone !== ''
            ? String(referent.referent_phone).trim()
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
