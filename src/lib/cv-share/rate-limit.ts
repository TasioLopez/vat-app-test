/** Simple in-memory rate limiter for verify attempts (per IP). */

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function checkVerifyRateLimit(ip: string): { ok: boolean; retryAfterSec?: number } {
  const key = ip || 'unknown';
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true };
}

export function resetVerifyRateLimit(ip: string): void {
  store.delete(ip || 'unknown');
}
