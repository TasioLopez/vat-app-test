import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

function resolveServiceRoleUrl(): string | undefined {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    undefined
  );
}

/**
 * Service-role Supabase client for API routes / server code.
 * Lazy so Next.js "Collecting page data" does not crash when env is not
 * evaluated at module import time during `next build`.
 */
export function getServiceRoleSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = resolveServiceRoleUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      'Supabase configuration missing (SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)'
    );
  }

  cached = createClient(url, key);
  return cached;
}

/**
 * Drop-in lazy client: same call sites as `const supabase = createClient(...)`,
 * but does not touch env until a property is first accessed.
 */
export const serviceRoleSupabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getServiceRoleSupabase();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});
