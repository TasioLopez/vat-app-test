import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type BrowserClient = SupabaseClient<Database>;

let cached: BrowserClient | null = null;

/**
 * Browser Supabase client. Lazy so `next build` prerender does not crash when
 * NEXT_PUBLIC_* env is missing at module evaluation time.
 */
export function getSupabaseBrowserClient(): BrowserClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  cached = createBrowserClient<Database>(url, key, {
    cookies: {
      getAll() {
        if (typeof document === 'undefined') return [];
        return document.cookie.split('; ').map((cookie) => {
          const [name, ...rest] = cookie.split('=');
          return { name, value: rest.join('=') };
        });
      },
      setAll(cookiesToSet) {
        if (typeof document === 'undefined') return;
        cookiesToSet.forEach(({ name, value, options }) => {
          const cookieString = `${name}=${value}; path=/; ${options?.maxAge ? `max-age=${options.maxAge};` : ''} ${options?.domain ? `domain=${options.domain};` : ''} ${options?.sameSite ? `samesite=${options.sameSite};` : ''} ${options?.secure ? 'secure;' : ''}`;
          document.cookie = cookieString;
        });
      },
    },
  });
  return cached;
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
