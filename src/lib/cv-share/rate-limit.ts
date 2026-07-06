import { checkRateLimit, resetMemoryRateLimit } from '@/lib/auth/rate-limit';

const WINDOW_SEC = 15 * 60;
const MAX_ATTEMPTS = 5;

export async function checkVerifyRateLimit(
  ip: string
): Promise<{ ok: boolean; retryAfterSec?: number }> {
  return checkRateLimit(`cv-share-verify:${ip || 'unknown'}`, WINDOW_SEC, MAX_ATTEMPTS);
}

export async function resetVerifyRateLimit(ip: string): Promise<void> {
  resetMemoryRateLimit(`cv-share-verify:${ip || 'unknown'}`);
}
