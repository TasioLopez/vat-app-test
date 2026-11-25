/**
 * Paths middleware must run on so session cookies can refresh on cold loads
 * (including new tabs) and apex→www stays in-app as a backup to Vercel.
 */
export const MIDDLEWARE_MATCHER = [
  '/',
  '/auth/:path*',
  '/login',
  '/signup',
  '/reset-password',
  '/mfa/:path*',
  '/dashboard/:path*',
  '/intake/:path*',
  '/api/:path*',
  '/debug-user',
] as const;
