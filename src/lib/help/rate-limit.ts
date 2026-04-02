const windowMs = 60_000;
const maxPerWindow = 30;
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimitChat(userId: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const e = hits.get(userId);
  if (!e || now > e.resetAt) {
    hits.set(userId, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (e.count >= maxPerWindow) {
    return { ok: false, retryAfter: Math.ceil((e.resetAt - now) / 1000) };
  }
  e.count += 1;
  return { ok: true };
}
