import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if table exists
    try {
      await supabase.from('mijn_stem_documents').select('id').limit(1);
    } catch (tableError: any) {
      console.error('Database table check failed:', tableError);
      const errorMessage = tableError?.message || tableError?.toString() || 'Unknown database error';
      
      if (errorMessage.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Database table not found. Please run the database setup first.',
          setupRequired: true,
          setupUrl: `${req.nextUrl.origin}/api/mijn-stem/setup`
        }, { status: 500 });
      }
      return NextResponse.json({ 
        error: 'Database error: ' + errorMessage 
      }, { status: 500 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `mijn-stem/${userId}/${timestamp}-${file.name}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      const errorMessage = uploadError?.message || uploadError?.toString() || 'Unknown storage error';
      
      // Check if bucket doesn't exist
      if (errorMessage.includes('Bucket not found')) {
        return NextResponse.json({ 
          error: 'Storage bucket not found. Please run the database setup first.',
          setupRequired: true,
          setupUrl: `${req.nextUrl.origin}/api/mijn-stem/setup`
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to upload file: ' + errorMessage 
      }, { status: 500 });
    }

    // Save file metadata to database
    const { data: insertData, error: insertError } = await supabase
      .from('mijn_stem_documents')
      .insert({
        user_id: userId,
        filename: file.name,
        storage_path: uploadData.path,
        file_size: file.size,
        file_type: file.type,
        status: 'uploaded'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('documents').remove([uploadData.path]);
      
      const errorMessage = insertError?.message || insertError?.toString() || 'Unknown database error';
      
      // Check if it's a table doesn't exist error
      if (errorMessage.includes('relation "mijn_stem_documents" does not exist')) {
        return NextResponse.json({ 
          error: 'Database table not found. Please run the database setup script first. Check MIJN_STEM_SETUP.md for instructions.',
          setupRequired: true 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to save file metadata: ' + errorMessage 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      document: insertData,
      message: 'File uploaded successfully'
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error.message || error.toString()),
      details: error.toString()
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: documents, error } = await supabase
      .from('mijn_stem_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      documents: documents || []
    });

  } catch (error: any) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
