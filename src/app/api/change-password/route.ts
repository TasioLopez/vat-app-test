import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-auth";
import {
  isMfaOptionalEmail,
  listVerifiedTotpFactors,
  getAssuranceLevel,
} from "@/lib/auth/mfa";
import { passwordValidation, validateForm } from "@/lib/validation";

/**
 * Change password without calling signInWithPassword in the browser.
 * Browser sign-in would replace an AAL2 MFA session with AAL1 and break
 * subsequent updateUser / dashboard access (Natalie-class failures).
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { user, supabase } = auth;
  if (!user.email) {
    return NextResponse.json({ error: "Gebruiker niet gevonden." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const record = (body ?? {}) as Record<string, unknown>;
  const validation = validateForm(passwordValidation.changePassword, {
    currentPassword: String(record.currentPassword ?? ""),
    newPassword: String(record.newPassword ?? ""),
    confirmPassword: String(record.confirmPassword ?? ""),
  });

  if (!validation.success) {
    const firstError = Object.values(validation.errors || {})[0];
    return NextResponse.json(
      { error: firstError || "Validatiefout" },
      { status: 400 }
    );
  }

  const { currentPassword, newPassword } = validation.data!;

  if (!isMfaOptionalEmail(user.email)) {
    const totp = await listVerifiedTotpFactors(supabase);
    if (totp.length > 0) {
      const { currentLevel } = await getAssuranceLevel(supabase);
      if (currentLevel !== "aal2") {
        return NextResponse.json(
          { error: "Bevestig eerst je MFA-code en probeer opnieuw." },
          { status: 403 }
        );
      }
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return NextResponse.json(
      { error: "App-configuratie ontbreekt (Supabase)." },
      { status: 500 }
    );
  }

  // Ephemeral client: verifies the current password without touching browser cookies.
  const ephemeral = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { error: verifyError } = await ephemeral.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return NextResponse.json(
      { error: "Huidig wachtwoord is onjuist." },
      { status: 400 }
    );
  }

  try {
    await ephemeral.auth.signOut({ scope: "local" });
  } catch {
    // best-effort cleanup of the ephemeral session
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    console.error("change-password updateUser failed:", updateError.message);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het wijzigen van het wachtwoord." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
