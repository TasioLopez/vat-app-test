import { createClient } from '@supabase/supabase-js';
import { APIError } from './api-utils';
import type { Database } from '@/types/supabase';
import type { Employee, EmployeeDetails, TPMeta, Client, User } from '@/types/api';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Optimized employee queries
export async function getEmployeeWithDetails(employeeId: string) {
  try {
    const { data, error } = await supabase
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

export async function getEmployeesWithDetails(filters?: {
  clientId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    let query = supabase
      .from('employees')
      .select(`
        *,
        employee_details(*),
        tp_meta(*),
        clients(name)
      `);

    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    if (filters?.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new APIError(`Database error: ${error.message}`, 500, 'DB_ERROR');
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError('Failed to fetch employees', 500, 'DB_ERROR');
  }
}

// Batch operations
export async function batchUpdateEmployees(updates: Array<{
  id: string;
  data: Partial<Employee>;
}>) {
  try {
    const promises = updates.map(({ id, data }) =>
      supabase
        .from('employees')
        .update(data)
        .eq('id', id)
    );

    const results = await Promise.allSettled(promises);
    
    const errors = results
      .map((result, index) => {
        if (result.status === 'rejected') {
          return { index, error: result.reason };
        }
        if (result.value.error) {
          return { index, error: result.value.error };
        }
        return null;
      })
      .filter(Boolean);

    if (errors.length > 0) {
      console.error('Batch update errors:', errors);
      throw new APIError('Some updates failed', 500, 'BATCH_UPDATE_ERROR');
    }

    return { success: true, updated: updates.length };
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError('Failed to batch update employees', 500, 'DB_ERROR');
  }
}

// Optimized document queries
export async function getDocumentsByEmployee(employeeId: string, types?: string[]) {
  try {
    let query = supabase
      .from('documents')
      .select('*')
      .eq('employee_id', employeeId)
      .order('uploaded_at', { ascending: false });

    if (types && types.length > 0) {
      query = query.in('type', types);
    }

    const { data, error } = await query;

    if (error) {
      throw new APIError(`Database error: ${error.message}`, 500, 'DB_ERROR');
    }

    return data || [];
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError('Failed to fetch documents', 500, 'DB_ERROR');
  }
}

// Caching utilities
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    cache.delete(key);
    return null;
  }

  return cached.data as T;
}

export function setCachedData<T>(key: string, data: T, ttl: number = 300000) { // 5 minutes default
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

export async function getCachedEmployee(employeeId: string) {
  const cacheKey = `employee:${employeeId}`;
  const cached = getCachedData(cacheKey);
  
  if (cached) {
    return cached;
  }

  const data = await getEmployeeWithDetails(employeeId);
  setCachedData(cacheKey, data, 300000); // 5 minutes
  return data;
}

// Query optimization helpers
export function buildSearchQuery(baseQuery: any, searchTerm: string, searchFields: string[]) {
  if (!searchTerm) return baseQuery;
  
  const searchConditions = searchFields
    .map(field => `${field}.ilike.%${searchTerm}%`)
    .join(',');
  
  return baseQuery.or(searchConditions);
}

export function buildFilterQuery(baseQuery: any, filters: Record<string, any>) {
  let query = baseQuery;
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    }
  });
  
  return query;
}

// Pagination helper
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function applyPagination(
  query: any,
  { page, limit, sortBy, sortOrder = 'asc' }: PaginationOptions
) {
  const offset = (page - 1) * limit;
  
  if (sortBy) {
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  }
  
  return query.range(offset, offset + limit - 1);
}

// Connection pooling simulation (for future optimization)
export class DatabaseConnectionPool {
  private static instance: DatabaseConnectionPool;
  private connections: any[] = [];
  private maxConnections = 10;

  static getInstance(): DatabaseConnectionPool {
    if (!this.instance) {
      this.instance = new DatabaseConnectionPool();
    }
    return this.instance;
  }

  async getConnection() {
    if (this.connections.length > 0) {
      return this.connections.pop();
    }
    
    // Create new connection if pool is empty
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  releaseConnection(connection: any) {
    if (this.connections.length < this.maxConnections) {
      this.connections.push(connection);
    }
  }
}
