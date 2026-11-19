import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { isAuthError, requireEmployeeAccess } from '@/lib/auth/api-auth';
import {
  AUTOFILL_SSE_HEADERS,
  encodeErrorEvent,
  encodeProgressEvent,
  encodeResultEvent,
} from '@/lib/autofill-progress-stream';
import { autofillIntakeFromDocuments } from '@/lib/intake/autofill';
import { ensureIntakeShape } from '@/lib/intake/schema';
import { saveWorkerFacts } from '@/lib/employee/save-worker-facts';
import { normalizeWorkerFactValues } from '@/lib/intake/normalize-controlled-fields';
import { blankIntakeSharedFacts, intakeSharedFacts, overlayIntakeWithWorkerFacts } from '@/lib/intake/worker-overlay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/** Intake-first autofill, then blank-only dossier gap-fill. Streams progress via SSE. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const employeeId = body?.employeeId as string | undefined;
  const intakeInstanceId = body?.intakeInstanceId as string | undefined;

  if (!employeeId || !intakeInstanceId) {
    return NextResponse.json({ error: 'Missing employeeId or intakeInstanceId' }, { status: 400 });
  }

  const access = await requireEmployeeAccess(employeeId);
  if (isAuthError(access)) return access;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => cookieStore.get(key)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );

  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (progress: {
        currentIndex: number;
        total: number;
        currentLabel: string;
      }) => {
        controller.enqueue(encodeProgressEvent(progress));
      };

      try {
        const result = await autofillIntakeFromDocuments({
          openai,
          supabase,
          employeeId,
          onProgress: sendProgress,
        });

        if (result.error && !result.sourceDocumentId) {
          controller.enqueue(encodeErrorEvent(result.error, 404));
          return;
        }

        const total = result.progressTotal;
        sendProgress({
          currentIndex: total,
          total,
          currentLabel: 'Gegevens opslaan…',
        });

        const generated = ensureIntakeShape(result.data);
        const shared = normalizeWorkerFactValues(intakeSharedFacts(generated));
        const saved = await saveWorkerFacts(supabase, employeeId, shared, 'autofill');
        if (saved.error) {
          controller.enqueue(encodeErrorEvent(saved.error, 500));
          return;
        }
        const data = saved.values
          ? overlayIntakeWithWorkerFacts(generated, saved.values)
          : generated;
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { error } = await (supabase as any)
          .from('intake_instances')
          .update({
            data_json: blankIntakeSharedFacts(data),
            source_document_id: result.sourceDocumentId,
            validated_at: null,
            validated_by: null,
            updated_by: user?.id ?? null,
          })
          .eq('id', intakeInstanceId)
          .eq('employee_id', employeeId);

        if (error) {
          controller.enqueue(encodeErrorEvent(error.message, 500));
          return;
        }

        controller.enqueue(
          encodeResultEvent({
            ok: true,
            data_json: data,
            source_document_id: result.sourceDocumentId,
            gap_filled: result.gapFilled,
            generated_from_dossier: result.generatedFromDossier === true,
            warning: result.warning || null,
            conflicts: data.meta.conflicts,
            skipped_validated: saved.skippedValidated,
            proposed_facts: shared,
          })
        );
      } catch (e) {
        console.error('intake autofill failed', e);
        controller.enqueue(
          encodeErrorEvent(
            e instanceof Error ? e.message : 'Automatisch invullen mislukt',
            500
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: AUTOFILL_SSE_HEADERS });
}
