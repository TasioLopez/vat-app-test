import { NextRequest, NextResponse } from 'next/server';
import { SupabaseService } from '@/lib/supabase-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    
    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
    }

    const supabaseService = SupabaseService.getInstance();
    const supabase = supabaseService.getClient();

    // Test 1: Check if employee exists
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('id', employeeId)
      .maybeSingle();

    if (employeeError) {
      return NextResponse.json({ 
        error: 'Employee query failed', 
        details: employeeError.message 
      }, { status: 500 });
    }

    // Test 2: Check documents
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('id, type, url')
      .eq('employee_id', employeeId);

    if (docsError) {
      return NextResponse.json({ 
        error: 'Documents query failed', 
        details: docsError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      employee: employee || null,
      documentsCount: docs?.length || 0,
      documents: docs || []
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error.message 
    }, { status: 500 });
  }
}
