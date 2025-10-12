// /api/complete-signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, token, firstName, lastName, password } = await req.json();

    console.log("Complete signup request:", { email, token, firstName, lastName, hasPassword: !!password });

    // 1. Validate the invite token
    const { data: user, error: tokenError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("signup_token", token)
      .gte("signup_token_expires_at", new Date().toISOString())
      .maybeSingle();

    console.log("Token validation:", { user: !!user, tokenError });

    if (!user || tokenError) {
      console.log("Token validation failed:", tokenError);
      return NextResponse.json({ error: "Invalid or expired invite token." }, { status: 400 });
    }

    // 2. Try to create Supabase Auth user or get existing one
    console.log("Attempting to create Supabase Auth user...");
    const { data: authUser, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    console.log("Auth signup result:", { 
      authUser: authUser ? { id: authUser.user?.id, email: authUser.user?.email, confirmed: authUser.user?.email_confirmed_at } : null,
      signUpError: signUpError ? { message: signUpError.message, code: signUpError.name } : null
    });

    let authUserId = authUser?.user?.id;

    // Handle case where user already exists
    if (signUpError && signUpError.message.includes("User already registered")) {
      console.log("User already exists, attempting to sign in...");
      const { data: existingUser, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        console.log("Sign in error for existing user:", signInError);
        return NextResponse.json({ error: `User exists but password is incorrect: ${signInError.message}` }, { status: 400 });
      }
      
      authUserId = existingUser.user?.id;
      console.log("Found existing user:", authUserId);
    } else if (signUpError) {
      console.log("Signup error:", signUpError);
      return NextResponse.json({ error: `Signup failed: ${signUpError.message}` }, { status: 400 });
    }

    if (!authUserId) {
      console.log("No auth user ID returned:", { authUser, signUpError });
      return NextResponse.json({ error: "User signup failed - no user ID returned." }, { status: 400 });
    }

    console.log("Auth user created successfully:", authUserId);

    // 3. Update users table: assign ID + confirm
    console.log("Updating users table...");
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
      console.log("User update error:", updateError);
      return NextResponse.json({ error: "Signup succeeded but user update failed." }, { status: 500 });
    }

    console.log("User table updated successfully");

    // 4. Sign the user in immediately
    console.log("Signing user in...");
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !sessionData.session) {
      console.log("Sign in error:", signInError);
      return NextResponse.json({ error: "Signup completed but login failed." }, { status: 400 });
    }

    console.log("Signup completed successfully");
    return NextResponse.json({
      message: "Signup successful",
      session: sessionData.session,
      user: sessionData.user,
    });

  } catch (error) {
    console.error("Complete signup error:", error);
    return NextResponse.json({ error: "Internal server error during signup." }, { status: 500 });
  }
}
