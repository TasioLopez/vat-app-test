/** Idle logout after this many ms without activity. */
export const SESSION_IDLE_MS = 2 * 60 * 60 * 1000; // 2 hours

/** Hard max session lifetime from password+MFA success. */
export const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000; // 12 hours

/** Warn this long before idle logout. */
export const SESSION_IDLE_WARN_MS = 2 * 60 * 1000; // 2 minutes

export const SESSION_STARTED_COOKIE = 'vat_session_started_at';
export const SESSION_ACTIVITY_COOKIE = 'vat_last_activity';

export function sessionCookieOptions(maxAgeSec: number) {
  return {
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: maxAgeSec,
  };
}
