import type { SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

/**
 * Create a browser Supabase client, or null when public env is missing
 * (e.g. during `next build` prerender without Vercel env wired).
 *
 * Always use @supabase/ssr defaults (document.cookie + serialize/chunking).
 * Never pass a custom cookies.getAll/setAll — a hand-rolled setAll breaks
 * chunked `sb-*-auth-token` cookies and causes multi-tab MFA re-login.
 */
export function tryCreateBrowserSupabase(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  // Two-arg form: package singleton + correct cookie chunking.
  return createBrowserClient<Database>(url, key);
}
