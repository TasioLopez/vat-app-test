import {
  SESSION_ABSOLUTE_MS,
  SESSION_ACTIVITY_COOKIE,
  SESSION_IDLE_MS,
  SESSION_STARTED_COOKIE,
} from '@/lib/auth/session-policy';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSec: number) {
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`;
}

export function clearSessionPolicyCookies() {
  writeCookie(SESSION_STARTED_COOKIE, '', 0);
  writeCookie(SESSION_ACTIVITY_COOKIE, '', 0);
}

/** Call after successful password + MFA (or enroll complete). */
export function markSessionAuthenticated() {
  const now = String(Date.now());
  const maxAgeSec = Math.ceil(SESSION_ABSOLUTE_MS / 1000);
  writeCookie(SESSION_STARTED_COOKIE, now, maxAgeSec);
  writeCookie(SESSION_ACTIVITY_COOKIE, now, maxAgeSec);
}

export function touchSessionActivity() {
  const started = readCookie(SESSION_STARTED_COOKIE);
  if (!started) return;
  const maxAgeSec = Math.ceil(SESSION_ABSOLUTE_MS / 1000);
  writeCookie(SESSION_ACTIVITY_COOKIE, String(Date.now()), maxAgeSec);
}

export type SessionExpiryState =
  | { ok: true; msUntilIdleWarn: number; msUntilIdleLogout: number }
  | { ok: false; reason: 'idle' | 'absolute' | 'missing' };

export function evaluateSessionExpiry(now = Date.now()): SessionExpiryState {
  const startedRaw = readCookie(SESSION_STARTED_COOKIE);
  const activityRaw = readCookie(SESSION_ACTIVITY_COOKIE);
  if (!startedRaw || !activityRaw) {
    return { ok: false, reason: 'missing' };
  }
  const started = Number(startedRaw);
  const activity = Number(activityRaw);
  if (!Number.isFinite(started) || !Number.isFinite(activity)) {
    return { ok: false, reason: 'missing' };
  }
  if (now - started >= SESSION_ABSOLUTE_MS) {
    return { ok: false, reason: 'absolute' };
  }
  const idleElapsed = now - activity;
  if (idleElapsed >= SESSION_IDLE_MS) {
    return { ok: false, reason: 'idle' };
  }
  const msUntilIdleLogout = SESSION_IDLE_MS - idleElapsed;
  const msUntilIdleWarn = Math.max(0, msUntilIdleLogout - 2 * 60 * 1000);
  return { ok: true, msUntilIdleWarn, msUntilIdleLogout };
}
