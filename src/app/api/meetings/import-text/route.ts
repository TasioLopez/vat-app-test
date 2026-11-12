import { NextRequest, NextResponse } from 'next/server';
import { isAuthError } from '@/lib/auth/api-auth';
import { assertStagingOnly } from '@/lib/auth/staging-only';
import { requireStagingEmployeeAccess } from '@/lib/meetings/access';
import { meetingImportKind } from '@/lib/meetings/transcript';
import { parseDocx } from '@/lib/parse-docx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const IMPORT_MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const blocked = assertStagingOnly();
  if (blocked) return blocked;

  const form = await req.formData().catch(() => null);
  const employeeId = String(form?.get('employeeId') ?? '');
  const access = await requireStagingEmployeeAccess(employeeId);
  if (isAuthError(access)) return access;

  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Geen bestand ontvangen.' }, { status: 400 });
  }
  const kind = meetingImportKind(file.name);
  if (!kind) {
    return NextResponse.json({ error: 'Upload een .txt, .md of .docx bestand.' }, { status: 400 });
  }
  if (file.size <= 0 || file.size > IMPORT_MAX_BYTES) {
    return NextResponse.json({ error: 'Bestand is leeg of te groot (max 8 MB).' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = '';
  try {
    text = kind === 'docx' ? await parseDocx(buffer) : buffer.toString('utf8');
  } catch {
    return NextResponse.json({ error: 'Bestand lezen mislukt.' }, { status: 400 });
  }
  text = text.replace(/^\uFEFF/, '').trim();
  if (!text) return NextResponse.json({ error: 'Het bestand is leeg.' }, { status: 400 });
  return NextResponse.json({ text });
}
