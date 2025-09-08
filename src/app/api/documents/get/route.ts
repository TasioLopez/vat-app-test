// app/api/documents/get/route.ts
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { employee_id } = await req.json();

    if (!employee_id) {
      return NextResponse.json({ error: 'Missing employee_id' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('employee_id', employee_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
