import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import {
  extractStoragePath,
  isIntakeDocumentType,
  mapAndValidateEmployeeDetails,
  extractReferentFromRaw,
  getAutofillCompleteness,
  GotenbergConversionError,
} from '@/lib/document-analysis';
import { extractEmployeeDetailsChatlike } from '@/lib/document-analysis/extractEmployeeDetailsChatlike';
import { stripAssistantArtifactsFromRecord } from '@/lib/document-analysis/stripAssistantArtifacts';
import { formatDutchPhoneDisplay } from '@/lib/phone/format-dutch-display';
import { requireEmployeeAutofillAccess } from '@/lib/auth/autofill-access';

export const maxDuration = 180;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type DocRow = { type?: string | null; url?: string | null; name?: string | null };

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

  const { data: file, error } = await supabase.storage.from('documents').download(path);
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

/**
 * Parallel chat-like employee autofill: all docs in one call, intake preferred in prompt.
 * Does not replace /api/autofill-employee-info-working.
 */
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
      return NextResponse.json(
        {
          success: false,
          error: 'Database error',
          data: { details: {}, pipeline: 'chatlike' },
        },
        { status: 500 }
      );
    }

    if (!docs || docs.length === 0) {
      return NextResponse.json({
        success: true,
        data: { details: {}, pipeline: 'chatlike' },
        message: 'No documents found for this employee',
      });
    }

    console.log(`📄 Chatlike: found ${docs.length} document(s) — uploading all`);

    const chatlikeDocs: {
      buffer: Buffer;
      filename: string;
      docType?: string | null;
    }[] = [];

    for (const doc of docs as DocRow[]) {
      const downloaded = await downloadDocumentBuffer(doc);
      if (!downloaded) continue;
      const filename = doc.name || downloaded.path.split('/').pop() || `${doc.type || 'document'}.pdf`;
      chatlikeDocs.push({
        buffer: downloaded.buffer,
        filename,
        docType: doc.type,
      });
    }

    if (chatlikeDocs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: { details: {}, pipeline: 'chatlike' },
          message: 'Geen documenten konden worden gedownload',
        },
        { status: 500 }
      );
    }

    const intakeProcessed = chatlikeDocs.some((d) =>
      isIntakeDocumentType(d.docType || '') || (d.docType || '').toLowerCase().includes('intake')
    );

    const extraction = await extractEmployeeDetailsChatlike(openai, chatlikeDocs);
    const cleaned = stripAssistantArtifactsFromRecord(extraction.raw);
    const mapped = mapAndValidateEmployeeDetails(cleaned);
    const referent = extractReferentFromRaw({
      ...cleaned,
      ...extraction.referentFields,
    });

    if (Object.keys(mapped).length === 0) {
      console.error('❌ Chatlike: no fields extracted');
      return NextResponse.json({
        success: false,
        data: { details: {}, pipeline: 'chatlike' },
        message: 'Geen relevante informatie gevonden in de documenten',
      });
    }

    const { incomplete: autofill_incomplete, warnings: autofill_warnings } = getAutofillCompleteness(
      mapped,
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

    console.log('✅ Chatlike document processing completed');

    return NextResponse.json({
      success: true,
      data: {
        details: mapped,
        autofilled_fields: Object.keys(mapped),
        autofill_incomplete,
        autofill_warnings,
        pipeline: 'chatlike',
        document_labels: extraction.documentLabels,
        suggested_referent: suggested_referent ?? undefined,
        referent_exists,
        existing_referent_id: existing_referent_id ?? undefined,
      },
      message: `Employee information successfully extracted from ${extraction.documentCount} documents using chatlike pipeline`,
    });
  } catch (error: unknown) {
    if (error instanceof GotenbergConversionError) {
      console.error('❌ Gotenberg conversion error:', error.message);
      return NextResponse.json(
        {
          success: false,
          error: error.userMessage,
          details: error.message,
          data: { details: {}, pipeline: 'chatlike' },
        },
        { status: 503 }
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Chatlike API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Processing failed',
        details: message,
        data: { details: {}, pipeline: 'chatlike' },
      },
      { status: 500 }
    );
  }
}
