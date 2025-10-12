import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Testing MijnStem setup...');

    // Test 1: Check if table exists
    let tableExists = false;
    let tableError = null;
    try {
      await supabase.from('mijn_stem_documents').select('id').limit(1);
      tableExists = true;
      console.log('✅ Database table exists');
    } catch (error: any) {
      tableError = error.message;
      console.log('❌ Database table check failed:', error.message);
    }

    // Test 2: Check storage bucket
    let bucketExists = false;
    let bucketError = null;
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) {
        bucketError = bucketsError.message;
      } else {
        bucketExists = buckets?.some(bucket => bucket.name === 'documents') || false;
        console.log('Storage bucket exists:', bucketExists);
      }
    } catch (error: any) {
      bucketError = error.message;
      console.log('❌ Storage bucket check failed:', error.message);
    }

    // Test 3: Check environment variables
    const envCheck = {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey,
      openaiKey: !!process.env.OPENAI_API_KEY
    };

    return NextResponse.json({
      success: true,
      tests: {
        tableExists,
        tableError,
        bucketExists,
        bucketError,
        envCheck
      },
      summary: {
        ready: tableExists && bucketExists,
        issues: [
          !tableExists && 'Database table does not exist',
          !bucketExists && 'Storage bucket does not exist',
          !envCheck.supabaseUrl && 'Missing SUPABASE_URL',
          !envCheck.supabaseServiceKey && 'Missing SUPABASE_SERVICE_ROLE_KEY',
          !envCheck.openaiKey && 'Missing OPENAI_API_KEY'
        ].filter(Boolean)
      }
    });

  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({ 
      error: 'Test failed: ' + error.message,
      details: error.toString()
    }, { status: 500 });
  }
}
