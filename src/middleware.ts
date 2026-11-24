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

  const isApi = pathname.startsWith('/api/');
  const needsDashboardAuth =
    pathname.startsWith('/dashboard') || pathname.startsWith('/intake/print');
  const needsApiAuth = isApi && !isPublicApiPath(pathname);

  if (!needsDashboardAuth && !needsApiAuth) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (needsApiAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Apex→www must run for auth callbacks (query string preserved).
    '/auth/:path*',
    '/login',
    '/signup',
    '/reset-password',
    '/dashboard/:path*',
    '/intake/:path*',
    '/api/:path*',
    '/debug-user',
  ],
};
