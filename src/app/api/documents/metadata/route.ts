import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireEmployeeAccess, verifyDocumentPathAccess } from '@/lib/auth/api-auth';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employee_id, type, name, url } = body;

    if (!employee_id || !type || !name || !url) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const authResult = await requireEmployeeAccess(employee_id);
    if (isAuthError(authResult)) return authResult;

    const pathAllowed = await verifyDocumentPathAccess(authResult.supabase, String(url));
    if (!pathAllowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await authResult.supabase.from('documents').insert({
      employee_id,
      type,
      name,
      url,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
