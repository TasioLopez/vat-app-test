import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUserWithRole, isAdmin } from "@/lib/help/auth";

export async function POST(req: NextRequest) {
  const session = await getSessionUserWithRole();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const filename = (body?.filename ?? "").toString().trim();
  if (!filename || filename.includes("..") || filename.includes("/")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${session.userId}/${Date.now()}-${safe}`;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await admin.storage.from("kb-media").createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Upload URL failed" }, { status: 500 });
  }

  return NextResponse.json({
    token: data.token,
    path: data.path,
    signedUrl: data.signedUrl,
  });
}
