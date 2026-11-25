import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireEmployeeAccess, verifyDocumentPathAccess } from '@/lib/auth/api-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employee_id, type, name, url } = body;
    const documentDateRaw = body?.document_date;
    const document_date =
      typeof documentDateRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(documentDateRaw.trim())
        ? documentDateRaw.trim()
        : null;

    if (!employee_id || !type || !name || !url) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const authResult = await requireEmployeeAccess(employee_id);
    if (isAuthError(authResult)) return authResult;

    const pathAllowed = await verifyDocumentPathAccess(authResult.supabase, String(url));
    if (!pathAllowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const basePayload = {
      employee_id: String(employee_id),
      type: String(type),
      name: String(name),
      url: String(url),
    };

    let data: { id: string; uploaded_at: string | null; type: string | null } | null = null;
    let error: { message?: string } | null = null;

    if (document_date) {
      const first = await authResult.supabase
        .from('documents')
        .insert({ ...basePayload, document_date })
        .select('id, uploaded_at, type')
        .single();
      data = first.data;
      error = first.error;
      // Staging migration may not be applied yet — retry without document_date.
      if (error && /document_date/i.test(error.message || '')) {
        const second = await authResult.supabase
          .from('documents')
          .insert(basePayload)
          .select('id, uploaded_at, type')
          .single();
        data = second.data;
        error = second.error;
      }
    } else {
      const inserted = await authResult.supabase
        .from('documents')
        .insert(basePayload)
        .select('id, uploaded_at, type')
        .single();
      data = inserted.data;
      error = inserted.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: data?.id ?? null,
      uploaded_at: data?.uploaded_at ?? null,
      document_date,
      type: data?.type ?? type,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
