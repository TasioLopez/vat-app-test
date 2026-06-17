import type { NextRequest } from 'next/server';

export function getBaseUrl(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (proto && host) return `${proto}://${host}`;
  const origin = req.nextUrl?.origin;
  if (origin) return origin;
  throw new Error('Cannot resolve base URL from request.');
}
