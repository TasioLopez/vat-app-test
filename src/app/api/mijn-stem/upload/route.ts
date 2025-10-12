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

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `mijn-stem/${userId}/${timestamp}-${file.name}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      const errorStr = JSON.stringify(uploadError);
      
      // Check if it's a bucket not found error and try to auto-initialize
      if (errorStr.includes('Bucket not found') || errorStr.includes('not found')) {
        console.log('Attempting to auto-initialize storage bucket...');
        try {
          const initResponse = await fetch(`${req.nextUrl.origin}/api/mijn-stem/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          const initData = await initResponse.json();
          
          if (initData.success) {
            console.log('Storage bucket initialized successfully, retrying upload...');
            // Retry the storage upload
            const { data: retryUploadData, error: retryUploadError } = await supabase.storage
              .from('documents')
              .upload(fileName, file);

            if (retryUploadError) {
              return NextResponse.json({ 
                error: 'Failed to upload file to storage after initialization: ' + JSON.stringify(retryUploadError)
              }, { status: 500 });
            }

            // Continue with database insert using retry upload data
            const { data: insertData, error: insertError } = await supabase
              .from('mijn_stem_documents')
              .insert({
                user_id: userId,
                filename: file.name,
                storage_path: retryUploadData.path,
                file_size: file.size,
                file_type: file.type,
                status: 'uploaded'
              })
              .select()
              .single();

            if (insertError) {
              await supabase.storage.from('documents').remove([retryUploadData.path]);
              return NextResponse.json({ 
                error: 'Failed to save file metadata after storage initialization: ' + JSON.stringify(insertError)
              }, { status: 500 });
            }

            return NextResponse.json({
              success: true,
              document: insertData,
              message: 'File uploaded successfully (storage auto-initialized)'
            });
          } else {
            return NextResponse.json({ 
              error: 'Auto-initialization failed: ' + initData.error,
              manualSetupRequired: initData.manualSetupRequired,
              sqlScript: initData.sqlScript
            }, { status: 500 });
          }
        } catch (initError) {
          console.error('Auto-initialization failed:', initError);
          return NextResponse.json({ 
            error: 'Failed to upload file to storage: ' + errorStr
          }, { status: 500 });
        }
      }
      
      return NextResponse.json({ 
        error: 'Failed to upload file to storage: ' + errorStr
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
      
      // Check if it's a table doesn't exist error and try to auto-initialize
      const errorStr = JSON.stringify(insertError);
      if (errorStr.includes('does not exist') || errorStr.includes('relation')) {
        console.log('Attempting to auto-initialize infrastructure...');
        try {
          const initResponse = await fetch(`${req.nextUrl.origin}/api/mijn-stem/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          const initData = await initResponse.json();
          
          if (initData.success) {
            console.log('Infrastructure initialized successfully, retrying upload...');
            // Retry the database insert
            const { data: retryData, error: retryError } = await supabase
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

            if (retryError) {
              return NextResponse.json({ 
                error: 'Failed to save file metadata after initialization: ' + JSON.stringify(retryError)
              }, { status: 500 });
            }

            return NextResponse.json({
              success: true,
              document: retryData,
              message: 'File uploaded successfully (infrastructure auto-initialized)'
            });
          } else {
            return NextResponse.json({ 
              error: 'Auto-initialization failed: ' + initData.error,
              manualSetupRequired: initData.manualSetupRequired,
              sqlScript: initData.sqlScript
            }, { status: 500 });
          }
        } catch (initError) {
          console.error('Auto-initialization failed:', initError);
          return NextResponse.json({ 
            error: 'Failed to save file metadata: ' + errorStr
          }, { status: 500 });
        }
      }
      
      return NextResponse.json({ 
        error: 'Failed to save file metadata: ' + errorStr
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
