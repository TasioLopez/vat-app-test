// /app/api/documents/metadata/route.ts

import { supabaseAdmin } from '@/lib/supabase/serverAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { employee_id, type, name, url } = body;

  if (!employee_id || !type || !name || !url) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // The DocumentModal already handles deleting existing docs,
  // so we can just insert here
  const { error } = await supabaseAdmin.from('documents').insert({
    employee_id,
    type,
    name,
    url,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
