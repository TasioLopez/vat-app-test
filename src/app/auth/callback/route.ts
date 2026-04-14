import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import { getSafeAuthRedirectPath } from "@/lib/auth/safe-auth-redirect";

/**
 * PKCE / OAuth-style redirects land here with ?code=...
 * We exchange the code for a session and set auth cookies, then redirect to `next`.
 * Add this URL to Supabase Auth → Redirect URLs, e.g. https://vat-app.nl/auth/callback
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = getSafeAuthRedirectPath(url.searchParams.get("next"), "/signup");

  const cookieStore = await cookies();

  if (code) {
    const response = NextResponse.redirect(new URL(nextPath, url.origin));

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(new URL("/login", url.origin));
}
