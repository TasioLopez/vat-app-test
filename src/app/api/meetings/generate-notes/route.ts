import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { isAuthError, isUuid } from '@/lib/auth/api-auth';
import {
  getDocumentExtractionModel,
  getDocumentExtractionReasoningEffort,
} from '@/lib/document-analysis/constants';
import { requireStagingEmployeeAccess } from '@/lib/meetings/access';
import { getMeetingCapture, updateMeetingCapture } from '@/lib/meetings/captures';
import { GESPREKSVERSLAG_SYSTEM_PROMPT, GESPREKSVERSLAG_USER_MESSAGE } from '@/lib/meetings/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const employeeId = (body?.employeeId ?? '').toString();
  const captureId = (body?.captureId ?? '').toString();
  const access = await requireStagingEmployeeAccess(employeeId);
  if (isAuthError(access)) return access;
  if (!isUuid(captureId)) return NextResponse.json({ error: 'Ongeldig gesprek' }, { status: 400 });

  const existing = await getMeetingCapture(access.supabase, employeeId, captureId);
  if (existing.error) return NextResponse.json({ error: existing.error }, { status: 500 });
  const transcript = existing.data?.transcript_text?.trim() ?? '';
  if (!existing.data || !transcript) {
    return NextResponse.json({ error: 'Geen transcript om een verslag van te maken.' }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const reasoningEffort = getDocumentExtractionReasoningEffort();
  const response = await openai.responses.create({
    model: getDocumentExtractionModel(),
    instructions: GESPREKSVERSLAG_SYSTEM_PROMPT,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `${GESPREKSVERSLAG_USER_MESSAGE}\n\n${transcript}`,
          },
        ],
      },
    ],
    ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
  });

  const notes = (response.output_text || '').trim();
  if (!notes) return NextResponse.json({ error: 'Leeg gespreksverslag' }, { status: 502 });

  const updated = await updateMeetingCapture(access.supabase, employeeId, captureId, {
    notes_text: notes,
    status: 'notes_draft',
  });
  if (updated.error || !updated.data) {
    return NextResponse.json({ error: updated.error || 'Verslag opslaan mislukt' }, { status: 500 });
  }
  return NextResponse.json({ capture: updated.data, notesText: notes });
}
