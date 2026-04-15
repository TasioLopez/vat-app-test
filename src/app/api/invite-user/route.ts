// src/app/api/invite-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUserWithRole, isAdmin } from "@/lib/help/auth";
import { getConfiguredServerAuthOrigin, normalizeAuthOrigin } from "@/lib/auth/auth-origin";

// -------- base URL helper (no env, no localhost) ----------
function getBaseUrl(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (proto && host) return `${proto}://${host}`;

  // Local dev / fallback
  const origin = req.nextUrl?.origin;
  if (origin) return origin;

  throw new Error("Cannot resolve base URL from request.");
}

// Server-side Supabase client (service role key)
const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUserWithRole();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, first_name, last_name, role } = await req.json();
    const emailNorm = String(email ?? "").trim().toLowerCase();
    const roleNorm = role === "admin" ? "admin" : "user";
    const firstNameNorm = String(first_name ?? "").trim();
    const lastNameNorm = String(last_name ?? "").trim();

    if (!emailNorm) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Email link lands on /auth/callback (client exchanges code or reads hash), then user is sent to /signup
    const base = getBaseUrl(req);
    const authOrigin = getConfiguredServerAuthOrigin() ?? normalizeAuthOrigin(base);
    const callbackUrl = new URL("/auth/callback", authOrigin);
    callbackUrl.searchParams.set("next", "/signup");

    // Send email using Supabase Auth inviteUser function
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(emailNorm, {
      redirectTo: callbackUrl.toString(),
      data: {
        first_name: firstNameNorm,
        last_name: lastNameNorm,
        role: roleNorm,
      },
    });

    if (inviteError) {
      console.error("Failed to send invite email:", inviteError);
      return NextResponse.json(
        { error: "User already exists or could not be invited." },
        { status: 400 }
      );
    }

    const authUserId = inviteData.user?.id;
    if (!authUserId) {
      return NextResponse.json({ error: "No invited user ID returned." }, { status: 500 });
    }

    const { data: existingRows, error: findErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", emailNorm);

    if (findErr) {
      return NextResponse.json({ error: findErr.message }, { status: 500 });
    }

    const existingByEmail = Array.isArray(existingRows) && existingRows.length > 0;
    if (existingByEmail) {
      const { error: updateErr } = await supabase
        .from("users")
        .update({
          id: authUserId,
          email: emailNorm,
          first_name: firstNameNorm,
          last_name: lastNameNorm,
          role: roleNorm,
          status: "invited",
        })
        .eq("email", emailNorm);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    } else {
      const { error: insertErr } = await supabase.from("users").insert({
        id: authUserId,
        email: emailNorm,
        first_name: firstNameNorm,
        last_name: lastNameNorm,
        role: roleNorm,
        status: "invited",
      });

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ message: "Invite sent." });
  } catch (err: any) {
    console.error("invite-user error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
