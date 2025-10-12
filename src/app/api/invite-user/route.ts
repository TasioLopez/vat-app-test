// src/app/api/invite-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

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
    const { email, first_name, last_name, role } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Already invited or signed up?
    const { data: existingUser, error: selErr } = await supabase
      .from("users")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (selErr) {
      return NextResponse.json({ error: selErr.message }, { status: 500 });
    }
    if (existingUser) {
      return NextResponse.json(
        { error: "User already invited or signed up." },
        { status: 400 }
      );
    }

    const signup_token = uuidv4();
    const expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    const { error: insErr } = await supabase.from("users").insert({
      email,
      first_name,
      last_name,
      role,
      status: "invited",
      signup_token,
      signup_token_expires_at: expires_at.toISOString(),
    });

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // Build absolute signup URL from the actual request host
    const base = getBaseUrl(req);
    const signupUrl = new URL("/signup", base);
    signupUrl.searchParams.set("email", email);
    signupUrl.searchParams.set("token", signup_token);

    // Send email using Supabase Auth inviteUser function
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: signupUrl.toString(),
      data: {
        first_name: first_name,
        last_name: last_name,
        role: role,
        signup_token: signup_token
      }
    });

    if (inviteError) {
      console.error("Failed to send invite email:", inviteError);
      // Continue anyway - the user record is created in the database
      // The admin can manually share the signup URL
    } else {
      console.log("Invite email sent successfully:", inviteData);
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
