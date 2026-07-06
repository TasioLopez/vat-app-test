import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireEmployeeAccess } from '@/lib/auth/api-auth';

export async function POST(req: NextRequest) {
  try {
    const { employee_id } = await req.json();

    if (!employee_id) {
      return NextResponse.json({ error: 'Missing employee_id' }, { status: 400 });
    }

    const authResult = await requireEmployeeAccess(employee_id);
    if (isAuthError(authResult)) return authResult;

    const { data, error } = await authResult.supabase
      .from('documents')
      .select('*')
      .eq('employee_id', employee_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
