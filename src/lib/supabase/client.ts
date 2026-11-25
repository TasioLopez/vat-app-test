import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { tryCreateBrowserSupabase } from '@/lib/supabase/browser';

type BrowserClient = SupabaseClient<Database>;

/**
 * Browser Supabase client. Lazy so `next build` prerender does not crash when
 * NEXT_PUBLIC_* env is missing at module evaluation time.
 *
 * Shares the same @supabase/ssr default cookie store as tryCreateBrowserSupabase
 * (package singleton). Do not add a custom cookies adapter here.
 */
export function getSupabaseBrowserClient(): BrowserClient {
  const client = tryCreateBrowserSupabase();
  if (!client) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
  return client;
}

/**
 * Drop-in lazy export for existing `import { supabase } from '@/lib/supabase/client'`.
 */
export const supabase: BrowserClient = new Proxy({} as BrowserClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseBrowserClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});

export { createBrowserClient };
