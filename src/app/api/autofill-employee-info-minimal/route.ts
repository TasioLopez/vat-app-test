import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    
    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
    }

    // Return mock data
    const mockDetails = {
      current_job: 'Test Job from Documents',
      work_experience: 'Test work experience extracted from documents',
      education_level: 'MBO',
      drivers_license: true,
      has_transport: true,
      dutch_speaking: true,
      dutch_writing: true,
      dutch_reading: true,
      has_computer: true,
      computer_skills: 3,
      contract_hours: 40,
      other_employers: 'None found in documents'
    };

    return NextResponse.json({
      success: true,
      data: {
        details: mockDetails,
        autofilled_fields: Object.keys(mockDetails)
      },
      message: 'Mock employee information generated from document analysis'
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error.message 
    }, { status: 500 });
  }
}
