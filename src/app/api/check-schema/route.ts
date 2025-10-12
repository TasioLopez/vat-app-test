import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Checking database schema...');
    
    // Test 1: Check employees table
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .limit(1);
    
    // Test 2: Check documents table
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('*')
      .limit(1);
    
    // Test 3: Try to get table info (this might not work in all setups)
    let tableInfo = null;
    try {
      const { data: info } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'documents');
      tableInfo = info;
    } catch (e) {
      console.log('Could not get table schema info:', e);
    }
    
    return NextResponse.json({
      success: true,
      schema_check: {
        employees_table: {
          accessible: !empError,
          error: empError?.message,
          sample_columns: employees?.[0] ? Object.keys(employees[0]) : []
        },
        documents_table: {
          accessible: !docError,
          error: docError?.message,
          sample_columns: documents?.[0] ? Object.keys(documents[0]) : []
        },
        table_info: tableInfo,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('❌ Schema check error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Schema check failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
