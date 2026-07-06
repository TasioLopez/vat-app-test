import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAuthError, requireAuth, verifyDocumentPathAccess } from '@/lib/auth/api-auth';

function normalizeBucketRelative(rawPath: string): string {
  let s = decodeURIComponent((rawPath || '').trim());
  s = s.replace(
    /^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|authenticated):/i,
    ''
  );
  s = s.replace(/^\/+/, '');
  return s;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = (body?.path ?? '').toString();
    if (!raw) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

    const key = normalizeBucketRelative(raw);
    if (!key) {
      return NextResponse.json({ error: 'Empty key after normalization', raw }, { status: 400 });
    }

    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const pathAllowed = await verifyDocumentPathAccess(authResult.supabase, key);
    if (!pathAllowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Missing SUPABASE env vars' }, { status: 500 });
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const sign = async (k: string) => admin.storage.from('documents').createSignedUrl(k, 60 * 60);

    let { data, error } = await sign(key);
    if (!error && data?.signedUrl) {
      return NextResponse.json({ url: data.signedUrl, key });
    }

    const alt = key.startsWith('documents/')
      ? key.replace(/^documents\//i, '')
      : `documents/${key}`;

    if (alt !== key) {
      const altRes = await sign(alt);
      if (!altRes.error && altRes.data?.signedUrl) {
        return NextResponse.json({ url: altRes.data.signedUrl, key: alt });
      }
    }

    return NextResponse.json(
      { error: 'Object not found', raw, tried: [key, alt] },
      { status: 404 }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
