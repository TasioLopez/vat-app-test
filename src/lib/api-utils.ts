import { NextResponse } from 'next/server';

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export function handleAPIError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof APIError) {
    return NextResponse.json(
      { 
        error: error.message, 
        code: error.code,
        timestamp: new Date().toISOString()
      },
      { status: error.statusCode }
    );
  }

  // Handle known error types
  if (error instanceof Error) {
    // Supabase errors
    if (error.message.includes('JWT')) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }
    
    if (error.message.includes('permission denied')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }
  }

  // Fallback for unexpected errors
  return NextResponse.json(
    { 
      error: 'Internal server error', 
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    },
    { status: 500 }
  );
}

export function createSuccessResponse<T>(data: T, message?: string): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  });
}

export function validateRequiredFields(
  data: Record<string, any>, 
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(field => 
    data[field] === undefined || data[field] === null || data[field] === ''
  );
  
  if (missingFields.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missingFields.join(', ')}`
    );
  }
}

export function validateUUID(id: string, fieldName: string = 'ID'): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new ValidationError(`Invalid ${fieldName} format`);
  }
}
