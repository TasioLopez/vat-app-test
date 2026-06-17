import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const CV_SHARE_SESSION_COOKIE = 'cv_share_session';
const SESSION_TTL_SEC = 7 * 24 * 60 * 60; // 7 days rolling max

export type CvShareSessionPayload = {
  shareId: string;
  cvId: string;
  employeeId: string;
  email: string;
  exp: number;
};

function getSessionSecret(): string {
  const secret = process.env.CV_SHARE_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('CV_SHARE_SESSION_SECRET is not configured');
  }
  return secret;
}

function signPayload(payload: CvShareSessionPayload): string {
  const secret = getSessionSecret();
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifySignedToken(token: string): CvShareSessionPayload | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', getSessionSecret()).update(body).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as CvShareSessionPayload;
    if (!payload.shareId || !payload.cvId || !payload.employeeId || !payload.email || !payload.exp) {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Create session token; exp capped by link expiry. */
export function createShareSessionToken(
  data: Omit<CvShareSessionPayload, 'exp'>,
  linkExpiresAt: Date
): string {
  const linkExp = Math.floor(linkExpiresAt.getTime() / 1000);
  const rollingExp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const exp = Math.min(linkExp, rollingExp);
  return signPayload({ ...data, exp });
}

export function parseShareSessionToken(token: string): CvShareSessionPayload | null {
  return verifySignedToken(token);
}

export async function getShareSessionFromCookies(): Promise<CvShareSessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CV_SHARE_SESSION_COOKIE)?.value;
  if (!raw) return null;
  return parseShareSessionToken(raw);
}

export function buildShareSessionCookie(token: string, maxAgeSec: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${CV_SHARE_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}
