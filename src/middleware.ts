import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const BLOCKED_PATHS = new Set([
  '/api/check-schema',
  '/api/mijn-stem/init',
  '/api/mijn-stem/setup',
  '/api/mijn-stem/create-bucket',
  '/api/mijn-stem/test',
  '/debug-user',
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (BLOCKED_PATHS.has(pathname)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!pathname.startsWith('/dashboard')) {
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
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/check-schema',
    '/api/mijn-stem/init',
    '/api/mijn-stem/setup',
    '/api/mijn-stem/create-bucket',
    '/api/mijn-stem/test',
    '/debug-user',
  ],
};
