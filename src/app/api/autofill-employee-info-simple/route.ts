import { NextRequest } from 'next/server';
import { handleAPIError, createSuccessResponse, validateRequiredFields, validateUUID } from '@/lib/api-utils';
import { OpenAIService } from '@/lib/openai-service';
import { SupabaseService } from '@/lib/supabase-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    
    // Validate input
    validateRequiredFields({ employeeId }, ['employeeId']);
    validateUUID(employeeId!, 'Employee ID');

    const supabaseService = SupabaseService.getInstance();
    const supabase = supabaseService.getClient();

    // Check if employee exists
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('id', employeeId!)
      .maybeSingle();

    if (employeeError) {
      return createSuccessResponse(
        { details: {} },
        'Failed to fetch employee information'
      );
    }

    if (!employee) {
      return createSuccessResponse(
        { details: {} },
        'Employee not found'
      );
    }

    // Check documents
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('id, type, url')
      .eq('employee_id', employeeId!);

    if (docsError) {
      return createSuccessResponse(
        { details: {} },
        'Failed to fetch documents'
      );
    }

    if (!docs || docs.length === 0) {
      return createSuccessResponse(
        { details: {} },
        'No documents found for this employee'
      );
    }

    // For now, return mock data to test the flow
    const mockDetails = {
      current_job: 'Test Job',
      work_experience: 'Test experience',
      education_level: 'MBO',
      drivers_license: true,
      has_transport: true,
      dutch_speaking: true,
      dutch_writing: true,
      dutch_reading: true,
      has_computer: true,
      computer_skills: 3,
      contract_hours: 40,
      other_employers: 'None'
    };

    return createSuccessResponse(
      { 
        details: mockDetails, 
        autofilled_fields: Object.keys(mockDetails) 
      },
      'Mock employee information generated successfully'
    );
  } catch (error) {
    return handleAPIError(error);
  }
}
