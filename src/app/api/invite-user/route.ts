// src/app/api/invite-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";

export const runtime = "nodejs"; // required for nodemailer

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

    // Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });

    await transporter.sendMail({
      from: `"VAT App" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "You're invited to join VAT",
      html: `
  <head>
    <meta charset="UTF-8" />
    <title>You're invited!</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f8f9fb; margin: 0; padding: 0;">
    <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fb; padding: 40px 0;">
      <tr>
        <td align="center">
          <table width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <tr>
              <td style="padding: 30px; text-align: center; background-color: #4f46e5; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Welcome to VAT Assist 🎉</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                <p>Hi there,</p>
                <p>You’ve been invited to join <strong>VAT Assist</strong>. To get started, please confirm your email address and set up your account.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="{{ .ConfirmationURL }}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
                    Confirm Your Account
                  </a>
                </div>
                <p>If the button above doesn’t work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #4f46e5;">{{ .ConfirmationURL }}</p>
                <p style="margin-top: 30px;">We’re excited to have you on board!</p>
                <p>The <strong>VAT Assist</strong> Team</p>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 13px; color: #666;">
                <p style="margin: 0;">If you didn’t request this, you can safely ignore this email.</p>
                <p style="margin: 5px 0 0;">© 2025 VAT Assist. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
      `,
    });

    return NextResponse.json({ message: "Invite sent." });
  } catch (err: any) {
    console.error("invite-user error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
