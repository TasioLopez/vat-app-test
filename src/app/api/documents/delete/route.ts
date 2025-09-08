import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export async function POST(req: Request) {
  const { id, url } = await req.json();

  console.log('🗑️ Received DELETE request for:', { id, url, typeofId: typeof id });

  if (!id || !url) {
    return NextResponse.json(
      { success: false, error: 'Missing id or url' },
      { status: 400 }
    );
  }

  // ✅ Use Supabase Service Role Key here
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // 👈 MUST use this secret key for delete
  );

  // Step 0: Confirm row exists (for debug purposes)
  const { data: existingDoc, error: checkError } = await supabase
    .from('documents')
    .select('id')
    .eq('id', id.toString())
    .single();

  console.log('🔍 Document existence check:', { existingDoc, checkError });

  // Step 1: Delete from Supabase Storage
  const { data: storageData, error: storageError } = await supabase.storage
    .from('documents')
    .remove([url]);

  console.log('📦 Storage deletion:', { storageData, storageError });

  if (storageError) {
    return NextResponse.json(
      { success: false, error: storageError.message },
      { status: 500 }
    );
  }

  // Step 2: Delete from Supabase documents table
  const { data: dbData, error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', id.toString())
    .select(); // optional: returns deleted row(s)

  console.log('🧾 DB deletion:', { dbData, dbError });

  if (dbError) {
    return NextResponse.json(
      { success: false, error: dbError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, deleted: dbData });
}
