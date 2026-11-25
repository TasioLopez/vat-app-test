import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { redirectApexToWww } from '@/lib/auth/canonical-host';

const BLOCKED_PATHS = new Set([
  '/api/check-schema',
  '/api/mijn-stem/init',
  '/api/mijn-stem/setup',
  '/api/mijn-stem/create-bucket',
  '/api/mijn-stem/test',
  '/debug-user',
]);

/** Public or guest-token API routes (no session required at middleware). */
function isPublicApiPath(pathname: string): boolean {
  if (pathname === '/api/health-check') return true;
  if (pathname === '/api/complete-signup') return true;
  if (pathname === '/api/documents/upload') return true;
  // Guest CV share: /api/cv-share/<token>/...
  if (/^\/api\/cv-share\/[^/]+\//.test(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const apexRedirect = redirectApexToWww(request);
  if (apexRedirect) return apexRedirect;

  const { pathname } = request.nextUrl;

  if (BLOCKED_PATHS.has(pathname)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Always refresh the session on matched routes so cold new-tab loads
  // rewrite chunked auth cookies before RSC/layout AAL checks.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isApi = pathname.startsWith('/api/');
  const needsDashboardAuth =
    pathname.startsWith('/dashboard') || pathname.startsWith('/intake/print');
  const needsApiAuth = isApi && !isPublicApiPath(pathname);

  if (!user) {
    if (needsApiAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (needsDashboardAuth) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

// Matcher must be a static literal — Next.js cannot analyze spreads/imports here.
export const config = {
  matcher: [
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
  ],
};
