import type { SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Create a browser Supabase client, or null when public env is missing
 * (e.g. during `next build` prerender without Vercel env wired).
 */
export function tryCreateBrowserSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
