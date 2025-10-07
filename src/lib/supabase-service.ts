import { createClient } from '@supabase/supabase-js';
import { APIError } from './api-utils';
import type { Database } from '@/types/supabase';

export class SupabaseService {
  private static instance: SupabaseService;
  private client: ReturnType<typeof createClient<Database>>;

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new APIError('Supabase configuration missing', 500, 'CONFIG_ERROR');
    }

    this.client = createClient<Database>(supabaseUrl, supabaseKey);
  }

  static getInstance(): SupabaseService {
    if (!this.instance) {
      this.instance = new SupabaseService();
    }
    return this.instance;
  }

  getClient() {
    return this.client;
  }

  async getEmployeeWithDetails(employeeId: string) {
    try {
      const { data, error } = await this.client
        .from('employees')
        .select(`
          *,
          employee_details(*),
          tp_meta(*),
          clients(name)
        `)
        .eq('id', employeeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new APIError('Employee not found', 404, 'NOT_FOUND');
        }
        throw new APIError(`Database error: ${error.message}`, 500, 'DB_ERROR');
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Failed to fetch employee data', 500, 'DB_ERROR');
    }
  }

  async getDocumentText(employeeId: string, documentTypes: string[]): Promise<string> {
    try {
      const { data: documents, error } = await this.client
        .from('documents')
        .select('type, url')
        .eq('employee_id', employeeId)
        .in('type', documentTypes);

      if (error) {
        throw new APIError(`Database error: ${error.message}`, 500, 'DB_ERROR');
      }

      if (!documents || documents.length === 0) {
        return '';
      }

      // For now, return the first document URL
      // In a real implementation, you'd fetch and parse the document content
      return documents[0]?.url || '';
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Failed to fetch document text', 500, 'DB_ERROR');
    }
  }

  async upsertTPMeta(employeeId: string, data: Record<string, any>) {
    try {
      const { error } = await this.client
        .from('tp_meta')
        .upsert(
          { employee_id: employeeId, ...data },
          { onConflict: 'employee_id' }
        );

      if (error) {
        throw new APIError(`Database error: ${error.message}`, 500, 'DB_ERROR');
      }
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Failed to save TP metadata', 500, 'DB_ERROR');
    }
  }

  async getUserRole(userId: string): Promise<string> {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        throw new APIError(`Database error: ${error.message}`, 500, 'DB_ERROR');
      }

      return data?.role || 'standard';
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Failed to fetch user role', 500, 'DB_ERROR');
    }
  }
}
