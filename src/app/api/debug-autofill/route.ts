import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    
    console.log('🔍 Debug autofill for employee:', employeeId);
    
    if (!employeeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing employeeId' 
      }, { status: 400 });
    }

    // Test 1: Check if employee exists
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('id', employeeId)
      .maybeSingle();

    if (employeeError) {
      console.error('❌ Employee query error:', employeeError);
      return NextResponse.json({ 
        success: false, 
        error: 'Employee query failed',
        details: employeeError.message 
      }, { status: 500 });
    }

    if (!employee) {
      return NextResponse.json({ 
        success: false, 
        error: 'Employee not found' 
      }, { status: 404 });
    }

    console.log('✅ Employee found:', employee);

    // Test 2: Check documents
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('id, type, filename, url, created_at')
      .eq('employee_id', employeeId);

    if (docsError) {
      console.error('❌ Documents query error:', docsError);
      return NextResponse.json({ 
        success: false, 
        error: 'Documents query failed',
        details: docsError.message 
      }, { status: 500 });
    }

    console.log('📄 Found documents:', docs?.length || 0);

    // Test 3: Check environment variables
    const envCheck = {
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      openai_key: !!process.env.OPENAI_API_KEY
    };

    console.log('🔧 Environment check:', envCheck);

    // Test 4: Try to download one document if available
    let downloadTest = null;
    if (docs && docs.length > 0) {
      try {
        const doc = docs[0];
        console.log('📥 Testing download for:', doc.filename);
        
        // Extract storage path
        const url = doc.url;
        let path = null;
        const match = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
        if (match?.[1]) path = match[1];
        else if (url.startsWith('documents/')) path = url.slice('documents/'.length);
        else if (!url.includes('://') && !url.includes('object/')) path = url;
        
        if (path) {
          const { data: file, error: downloadError } = await supabase.storage
            .from('documents')
            .download(path);
          
          if (downloadError) {
            downloadTest = { success: false, error: downloadError.message };
          } else {
            const buffer = Buffer.from(await file.arrayBuffer());
            downloadTest = { 
              success: true, 
              size: buffer.length,
              filename: doc.filename 
            };
          }
        } else {
          downloadTest = { success: false, error: 'Could not extract storage path' };
        }
      } catch (error: any) {
        downloadTest = { success: false, error: error.message };
      }
    }

    return NextResponse.json({
      success: true,
      debug: {
        employee: employee,
        documents: docs || [],
        documentCount: docs?.length || 0,
        environment: envCheck,
        downloadTest: downloadTest,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Debug failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
