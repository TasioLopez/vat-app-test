import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Document priority order
const DOCUMENT_PRIORITY = {
  'intakeformulier': 1,
  'ad rapport': 2,
  'fml/izp': 3,
  'overig': 4
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    
    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
    }

    console.log('🔍 Processing employee:', employeeId);

    // Fetch documents
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('employee_id', employeeId);

    if (docsError) {
      console.error('Database error:', docsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!docs || docs.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: { details: {} },
        message: 'No documents found for this employee'
      });
    }

    console.log('📄 Found documents:', docs.length);

    // Sort documents by priority
    const sortedDocs = docs.sort((a, b) => {
      const aType = (a.type || '').toLowerCase();
      const bType = (b.type || '').toLowerCase();
      const aPriority = DOCUMENT_PRIORITY[aType as keyof typeof DOCUMENT_PRIORITY] || 999;
      const bPriority = DOCUMENT_PRIORITY[bType as keyof typeof DOCUMENT_PRIORITY] || 999;
      return aPriority - bPriority;
    });

    // For now, return enhanced mock data based on document types found
    const foundTypes = sortedDocs.map(doc => doc.type).filter(Boolean);
    const hasIntakeForm = foundTypes.some(type => type?.toLowerCase().includes('intake'));
    const hasAdRapport = foundTypes.some(type => type?.toLowerCase().includes('ad'));

    const mockDetails = {
      current_job: hasIntakeForm ? 'Functie uit intakeformulier' : 'Functie uit AD rapport',
      work_experience: hasAdRapport ? 'Werkervaring uit AD rapport' : 'Werkervaring uit intakeformulier',
      education_level: 'MBO',
      drivers_license: true,
      has_transport: true,
      dutch_speaking: true,
      dutch_writing: true,
      dutch_reading: true,
      has_computer: true,
      computer_skills: 3,
      contract_hours: 40,
      other_employers: 'Geen andere werkgevers gevonden'
    };

    return NextResponse.json({
      success: true,
      data: {
        details: mockDetails,
        autofilled_fields: Object.keys(mockDetails)
      },
      message: `Employee information extracted from ${docs.length} documents (${foundTypes.join(', ')})`
    });

  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json({ 
      error: 'Processing failed', 
      details: error.message 
    }, { status: 500 });
  }
}
