import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

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

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const ssr = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const key = normalizeKey((body?.path ?? "").toString());
  if (!key) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const fullKey = key.startsWith("kb-media/") ? key : `kb-media/${key}`;
  const objectPath = fullKey.replace(/^kb-media\//i, "");

  const { data, error } = await admin.storage.from("kb-media").createSignedUrl(objectPath, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || "Sign failed" }, { status: 404 });
  }

  return NextResponse.json({ url: data.signedUrl, path: objectPath });
}
