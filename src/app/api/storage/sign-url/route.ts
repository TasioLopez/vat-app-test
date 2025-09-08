import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Remove only the full storage URL prefix; keep the path that follows (bucket-relative).
function normalizeBucketRelative(rawPath: string): string {
  let s = decodeURIComponent((rawPath || "").trim());

  // full URL like .../storage/v1/object/authenticated:documents/...
  s = s.replace(
    /^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|authenticated):/i,
    ""
  );

  // now s should look like "documents/..." or "<something>/..."
  // DO NOT strip "documents/" here – it might be an actual folder.
  // Just remove leading slashes.
  s = s.replace(/^\/+/, "");
  return s;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = (body?.path ?? "").toString();
    if (!raw) return NextResponse.json({ error: "Missing path" }, { status: 400 });

    const key = normalizeBucketRelative(raw);
    if (!key) {
      return NextResponse.json({ error: "Empty key after normalization", raw }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: "Missing SUPABASE env vars" }, { status: 500 });
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const sign = async (k: string) =>
      admin.storage.from("documents").createSignedUrl(k, 60 * 60);

    // 1) try EXACT key
    let { data, error } = await sign(key);
    if (!error && data?.signedUrl) {
      return NextResponse.json({ url: data.signedUrl, key });
    }

    // 2) try alternate prefix (insert/remove "documents/" once)
    const alt =
      key.startsWith("documents/") ? key.replace(/^documents\//i, "") : `documents/${key}`;

    if (alt !== key) {
      const altRes = await sign(alt);
      if (!altRes.error && altRes.data?.signedUrl) {
        return NextResponse.json({ url: altRes.data.signedUrl, key: alt });
      }
    }

    // 3) give a clear error (do NOT fall back to arbitrary files)
    return NextResponse.json(
      { error: "Object not found", raw, tried: [key, alt] },
      { status: 404 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad request" }, { status: 400 });
  }
}
