import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Keep the path bucket-relative; allow full storage URLs too.
function normalizeBucketRelative(rawPath: string): string {
  let s = decodeURIComponent((rawPath || "").trim());
  s = s.replace(
    /^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|authenticated):/i,
    ""
  );
  s = s.replace(/^\/+/, "");
  return s;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = (body?.path ?? "").toString();
    const docId = body?.docId as string | undefined;

    if (!raw) return NextResponse.json({ error: "Missing path" }, { status: 400 });

    const key = normalizeBucketRelative(raw);
    if (!key) return NextResponse.json({ error: "Empty key after normalization" }, { status: 400 });

    // Authz: only signed-in; admins allowed by default.
    const cookieStore = await cookies();
    const ssr = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
    );

    const { data: { user } } = await ssr.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Use service role to delete from Storage (and DB if requested).
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: delErr } = await admin.storage.from("documents").remove([key]);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });

    // Optionally delete the DB row in public.documents
    if (docId) {
      await admin.from("documents").delete().eq("id", docId);
    }

    return NextResponse.json({ ok: true, deleted: key });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad request" }, { status: 400 });
  }
}
