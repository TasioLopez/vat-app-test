import { supabaseAdmin } from '@/lib/supabase/serverAdmin';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // for FormData parsing in Next.js

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get('file') as File;
    const employeeId = formData.get('employee_id') as string;
    const type = formData.get('type') as string;
    const name = formData.get('name') as string;

    if (!file || !employeeId || !type || !name) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const ext = name.split('.').pop();
    const safeName = name.replace(/\s+/g, '-');
    const filePath = `${employeeId}/${type}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, path: filePath });
  } catch (err: any) {
    console.error('❌ Upload failed:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
