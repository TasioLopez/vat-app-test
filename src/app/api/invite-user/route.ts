// /api/invite-user.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { email, first_name, last_name, role } = await req.json();

  // Check if already invited or signed up
  const { data: existingUser } = await supabase
    .from("users")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    return NextResponse.json({ error: "User already invited or signed up." }, { status: 400 });
  }

  const signup_token = uuidv4();
  const expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

  const { error } = await supabase.from("users").insert({
    email,
    first_name,
    last_name,
    role,
    status: "invited",
    signup_token,
    signup_token_expires_at: expires_at.toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const signupLink = `http://localhost:3000/signup?email=${email}&token=${signup_token}`;

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
    html: `<p>You’ve been invited. <a href="${signupLink}">Click here to sign up</a>. Link valid for 24 hours.</p>`,
  });

  return NextResponse.json({ message: "Invite sent." });
}
