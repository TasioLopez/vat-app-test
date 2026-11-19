import { NextRequest, NextResponse } from 'next/server';
import { serviceRoleSupabase as supabase } from '@/lib/supabase/service-role';
import OpenAI from 'openai';
import {
  extractReferentFromRaw,
  getAutofillCompleteness,
  GotenbergConversionError,
} from '@/lib/document-analysis';
import { EMPLOYEE_AUTOFILL_CHATLIKE_STEPS } from '@/lib/autofill-progress';
import {
  AUTOFILL_SSE_HEADERS,
  createStepProgressReporter,
  encodeErrorEvent,
  encodeProgressEvent,
  encodeResultEvent,
} from '@/lib/autofill-progress-stream';
import { extractWorkerFactsFromDocuments } from '@/lib/employee/extract-worker-facts-from-documents';
import { formatDutchPhoneDisplay } from '@/lib/phone/format-dutch-display';
import { requireEmployeeAutofillAccess } from '@/lib/auth/autofill-access';

export const maxDuration = 180;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/**
 * Parallel chat-like employee autofill: all docs in one call, intake preferred in prompt.
 * Streams progress via SSE. Does not replace /api/autofill-employee-info-working.
 */
export async function GET(req: NextRequest) {
  const access = await requireEmployeeAutofillAccess(req);
  if (access instanceof NextResponse) return access;
  const { employeeId } = access;

  const stream = new ReadableStream({
    async start(controller) {
      const steps = [...EMPLOYEE_AUTOFILL_CHATLIKE_STEPS];
      const report = createStepProgressReporter(steps, (progress) => {
        controller.enqueue(encodeProgressEvent(progress));
      });

      try {
        const phaseToStep = { prepare: 0, analyze: 1, merge: 2 } as const;
        const extracted = await extractWorkerFactsFromDocuments(openai, employeeId, {
          onPhase: (phase) => report(phaseToStep[phase]),
        });

        if (extracted.error === 'Geen documenten gevonden') {
          report(3);
          controller.enqueue(
            encodeResultEvent({
              success: true,
              data: { details: {}, pipeline: 'chatlike' },
              message: 'No documents found for this employee',
            })
          );
          return;
        }

        if (extracted.error === 'Geen documenten konden worden gedownload') {
          controller.enqueue(
            encodeErrorEvent('Geen documenten konden worden gedownload', 500)
          );
          return;
        }

        if (extracted.error && !extracted.extraction) {
          console.error('Database error:', extracted.error);
          controller.enqueue(encodeErrorEvent('Database error', 500));
          return;
        }

        const mapped = extracted.details;
        const cleaned = extracted.cleaned;
        const extraction = extracted.extraction!;

        const referent = extractReferentFromRaw({
          ...cleaned,
          ...extraction.referentFields,
        });

        if (Object.keys(mapped).length === 0) {
          console.error('❌ Chatlike: no fields extracted');
          controller.enqueue(
            encodeErrorEvent('Geen relevante informatie gevonden in de documenten', 500)
          );
          return;
        }

        report(3);

        const { incomplete: autofill_incomplete, warnings: autofill_warnings } =
          getAutofillCompleteness(mapped, { intakeProcessed: extracted.intakeProcessed });

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
              referent.referent_function != null
                ? String(referent.referent_function).trim()
                : undefined,
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

        controller.enqueue(
          encodeResultEvent({
            success: true,
            data: {
              details: mapped,
              autofilled_fields: Object.keys(mapped),
              autofill_incomplete,
              autofill_warnings,
              pipeline: 'chatlike',
              mode: extraction.mode,
              intake_text_len: extraction.intakeTextLen,
              document_labels: extraction.documentLabels,
              suggested_referent: suggested_referent ?? undefined,
              referent_exists,
              existing_referent_id: existing_referent_id ?? undefined,
            },
            message: `Employee information successfully extracted from ${extraction.documentCount} documents using chatlike freeform pipeline`,
          })
        );
      } catch (error: unknown) {
        if (error instanceof GotenbergConversionError) {
          console.error('❌ Gotenberg conversion error:', error.message);
          controller.enqueue(encodeErrorEvent(error.userMessage, 503));
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        console.error('❌ Chatlike API Error:', error);
        controller.enqueue(encodeErrorEvent(message || 'Processing failed', 500));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: AUTOFILL_SSE_HEADERS });
}
