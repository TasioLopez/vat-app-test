// /api/complete-signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { email, token, firstName, lastName, password } = await req.json();

  // 1. Validate the invite token
  const { data: user, error: tokenError } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .eq("signup_token", token)
    .gte("signup_token_expires_at", new Date().toISOString())
    .maybeSingle();

  if (!user || tokenError) {
    return NextResponse.json({ error: "Invalid or expired invite token." }, { status: 400 });
  }

  // 2. Try to create Supabase Auth user
  const { data: authUser, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError && !signUpError.message.includes("User already registered")) {
    return NextResponse.json({ error: signUpError.message }, { status: 400 });
  }

  const authUserId = authUser?.user?.id;
  if (!authUserId) {
    return NextResponse.json({ error: "User signup failed." }, { status: 400 });
  }

  // 3. Update users table: assign ID + confirm
  const { error: updateError } = await supabase
    .from("users")
    .update({
      id: authUserId, // ✅ match Supabase Auth user ID
      first_name: firstName,
      last_name: lastName,
      status: "confirmed",
      signup_token: null,
      signup_token_expires_at: null,
    })
    .eq("email", email);

  if (updateError) {
    return NextResponse.json({ error: "Signup succeeded but user update failed." }, { status: 500 });
  }

  // 4. Sign the user in immediately
  const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !sessionData.session) {
    return NextResponse.json({ error: "Signup completed but login failed." }, { status: 400 });
  }

  return NextResponse.json({
    message: "Signup successful",
    session: sessionData.session,
    user: sessionData.user,
  });
}
