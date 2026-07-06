export type RateLimitResult = { ok: boolean; retryAfterSec?: number };

type MemoryEntry = { count: number; resetAt: number };
const memoryStore = new Map<string, MemoryEntry>();

function checkMemoryRateLimit(
  key: string,
  windowSeconds: number,
  maxRequests: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const entry = memoryStore.get(key);

  if (!entry || now >= entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= maxRequests) {
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { ok: true };
}

/** Supabase-backed sliding-window rate limit (service role only). Falls back to in-memory when Supabase is unavailable (tests). */
export async function checkRateLimit(
  key: string,
  windowSeconds: number,
  maxRequests: number
): Promise<RateLimitResult> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return checkMemoryRateLimit(key, windowSeconds, maxRequests);
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin.rpc('check_api_rate_limit', {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max_requests: maxRequests,
    });

    if (error) {
      console.error('rate-limit rpc error', error.message);
      return checkMemoryRateLimit(key, windowSeconds, maxRequests);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row.allowed !== 'boolean') {
      console.error('rate-limit rpc returned unexpected shape');
      return { ok: false, retryAfterSec: windowSeconds };
    }

    if (!row.allowed) {
      const retryAfter = Number(row.retry_after_seconds) || windowSeconds;
      return { ok: false, retryAfterSec: Math.max(1, retryAfter) };
    }

    return { ok: true };
  } catch (err) {
    console.error('rate-limit error', err);
    return checkMemoryRateLimit(key, windowSeconds, maxRequests);
  }
}

export function resetMemoryRateLimit(key: string): void {
  memoryStore.delete(key);
}

export function rateLimitResponse(retryAfterSec?: number): Response {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (retryAfterSec) headers['Retry-After'] = String(retryAfterSec);
  return new Response(JSON.stringify({ error: 'Too many requests' }), {
    status: 429,
    headers,
  });
}
