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

    // 2. Try to create Supabase Auth user or handle existing user
    console.log("Attempting to create/update Supabase Auth user...");
    
    let authUserId: string | null = null;
    
    // First, try to create the user
    const { data: authUser, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    console.log("Auth signup result:", { 
      authUser: authUser ? { id: authUser.user?.id, email: authUser.user?.email, confirmed: authUser.user?.email_confirmed_at } : null,
      signUpError: signUpError ? { message: signUpError.message, code: signUpError.name } : null
    });

    if (signUpError && signUpError.message.includes("User already registered")) {
      // User already exists, we need to update their password
      console.log("User already exists, need to update password...");
      
      // Get the user ID from our database first
      const { data: dbUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();
      
      if (dbUser?.id) {
        const userId = dbUser.id;
        authUserId = userId;
        console.log("Found existing user ID in database:", userId);
        
        // Update the user's password using admin API
        const { data: updateUserData, error: updatePasswordError } = await supabase.auth.admin.updateUserById(userId, {
          password: password,
        });
        
        if (updatePasswordError) {
          console.log("Password update error:", updatePasswordError);
          return NextResponse.json({ error: `Failed to update password: ${updatePasswordError.message}` }, { status: 400 });
        }
        
        console.log("Password updated successfully for existing user");
      } else {
        console.log("No user ID found in database, this shouldn't happen");
        return NextResponse.json({ error: "User exists but no ID found in database." }, { status: 400 });
      }
    } else if (signUpError) {
      console.log("Signup error:", signUpError);
      return NextResponse.json({ error: `Signup failed: ${signUpError.message}` }, { status: 400 });
    } else {
      // New user created successfully
      authUserId = authUser?.user?.id;
      if (!authUserId) {
        console.log("No auth user ID returned:", { authUser, signUpError });
        return NextResponse.json({ error: "User signup failed - no user ID returned." }, { status: 400 });
      }
      
      console.log("New auth user created successfully:", authUserId);
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
