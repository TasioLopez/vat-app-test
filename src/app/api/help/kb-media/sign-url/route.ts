import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, isAuthError } from "@/lib/auth/api-auth";

function normalizeKey(raw: string): string {
  let s = decodeURIComponent((raw || "").trim());
  s = s.replace(
    /^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|authenticated):/i,
    ""
  );
  s = s.replace(/^kb-media\//i, "");
  s = s.replace(/^\/+/, "");
  return s;
}

function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

async function isKbMediaPathAllowed(objectPath: string): Promise<boolean> {
  if (!objectPath || objectPath.includes('..') || /[%_]/.test(objectPath)) {
    return false;
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const escaped = escapeLikePattern(objectPath);
  const { count, error } = await admin
    .from("kb_articles")
    .select("id", { count: "exact", head: true })
    .ilike("body", `%${escaped}%`);

  return !error && (count ?? 0) > 0;
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const body = await req.json().catch(() => ({}));
  const key = normalizeKey((body?.path ?? "").toString());
  if (!key || key.includes("..")) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const objectPath = key.replace(/^kb-media\//i, "");

  const allowed = await isKbMediaPathAllowed(objectPath);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await admin.storage.from("kb-media").createSignedUrl(objectPath, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || "Sign failed" }, { status: 404 });
  }

  return NextResponse.json({ url: data.signedUrl, path: objectPath });
}
