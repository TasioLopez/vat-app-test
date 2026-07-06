import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import {
  isAuthError,
  parseEmployeeIdFromDocumentPath,
  requireAuth,
  verifyDocumentPathAccess,
} from '@/lib/auth/api-auth';

function normalizeBucketRelative(rawPath: string): string {
  let s = decodeURIComponent((rawPath || '').trim());
  s = s.replace(
    /^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|authenticated):/i,
    ''
  );
  s = s.replace(/^\/+/, '');
  return s;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = (body?.path ?? '').toString();
    const docId = body?.docId as string | undefined;

    if (!raw) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

    const key = normalizeBucketRelative(raw);
    if (!key) return NextResponse.json({ error: 'Empty key after normalization' }, { status: 400 });

    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    if (docId) {
      const { data: docRow, error: docErr } = await authResult.supabase
        .from('documents')
        .select('id, url, employee_id')
        .eq('id', docId)
        .maybeSingle();

      if (docErr || !docRow) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      if (docRow.url !== key) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      const pathAllowed = await verifyDocumentPathAccess(authResult.supabase, key);
      if (!pathAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const employeeId = parseEmployeeIdFromDocumentPath(key);
    if (employeeId) {
      const { data: employeeRow } = await authResult.supabase
        .from('employees')
        .select('id')
        .eq('id', employeeId)
        .maybeSingle();
      if (!employeeRow) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: delErr } = await admin.storage.from('documents').remove([key]);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });

    if (docId) {
      await authResult.supabase.from('documents').delete().eq('id', docId);
    }

    return NextResponse.json({ ok: true, deleted: key });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
