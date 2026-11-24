import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { normalizeAuthOrigin } from "@/lib/auth/auth-origin";
import { getSafeAuthRedirectPath } from "@/lib/auth/safe-auth-redirect";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

/**
 * Server-side email link handler using token_hash + verifyOtp.
 * Avoids PKCE code_verifier (which breaks when the email is opened in another
 * browser/profile or on a different host than the reset request).
 *
 * Email templates should link here, e.g.:
 * {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash")?.trim() ?? "";
  const typeRaw = url.searchParams.get("type")?.trim() ?? "";
  const nextPath = getSafeAuthRedirectPath(url.searchParams.get("next"), "/login");

  const canonicalOrigin = normalizeAuthOrigin(url.origin);
  const fail = (reason: string) => {
    const dest = new URL("/login", canonicalOrigin);
    dest.searchParams.set("reason", "session_expired");
    dest.searchParams.set("auth_error", reason);
    return NextResponse.redirect(dest);
  };

  if (!tokenHash || !OTP_TYPES.has(typeRaw as EmailOtpType)) {
    return fail("invalid_link");
  }

  const type = typeRaw as EmailOtpType;
  let response = NextResponse.redirect(new URL(nextPath, canonicalOrigin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return fail("otp_failed");
  }

  return response;
}
