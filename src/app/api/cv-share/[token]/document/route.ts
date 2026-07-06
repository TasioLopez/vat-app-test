import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateGuestAccess } from '@/lib/cv-share/access';
import { CV_SHARE_SESSION_COOKIE } from '@/lib/cv-share/session';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';
import { normalizeCvPayload } from '@/lib/cv/normalize';
import { coerceCvTemplateKey, DEFAULT_ACCENT_COLOR } from '@/types/cv';
import { getActiveCvModel } from '@/lib/cv/normalize';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

async function getGuestAccess(req: NextRequest, token: string) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CV_SHARE_SESSION_COOKIE)?.value;
  return validateGuestAccess(token, sessionToken);
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const access = await getGuestAccess(req, token);
  if (!access) {
    return NextResponse.json({ error: 'Toegang geweigerd' }, { status: 403 });
  }

  const { share } = access;
  const { data: doc, error } = await supabaseAdmin
    .from('cv_documents')
    .select('*')
    .eq('id', share.cv_document_id)
    .eq('employee_id', share.employee_id)
    .maybeSingle();

  if (error || !doc) {
    return NextResponse.json({ error: 'CV niet gevonden' }, { status: 404 });
  }

  const payload = normalizeCvPayload(doc.payload_json, coerceCvTemplateKey(doc.template_key));
  const activeModel = getActiveCvModel(payload);

  let initialPhotoSignedUrl: string | null = null;
  const photoPath = activeModel.personal.photoStoragePath?.trim();
  if (photoPath && activeModel.options?.includePhotoInCv) {
    const { data, error: signErr } = await supabaseAdmin.storage
      .from('cv-photos')
      .createSignedUrl(photoPath, 3600);
    if (!signErr && data?.signedUrl) {
      initialPhotoSignedUrl = data.signedUrl;
    }
  }

  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('first_name, last_name')
    .eq('id', share.employee_id)
    .maybeSingle();

  const employeeLabel =
    [emp?.first_name, emp?.last_name].filter(Boolean).join(' ') || 'Werknemer';

  await supabaseAdmin
    .from('cv_share_links')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', share.id);

  return NextResponse.json({
    document: {
      id: doc.id,
      employee_id: doc.employee_id,
      title: doc.title,
      template_key: doc.template_key,
      accent_color: doc.accent_color || DEFAULT_ACCENT_COLOR,
      payload_json: payload,
      updated_at: doc.updated_at,
    },
    employeeLabel,
    initialPhotoSignedUrl,
  });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const access = await getGuestAccess(req, token);
  if (!access) {
    return NextResponse.json({ error: 'Toegang geweigerd' }, { status: 403 });
  }

  const { share } = access;

  const { data: existingDoc } = await supabaseAdmin
    .from('cv_documents')
    .select('template_key')
    .eq('id', share.cv_document_id)
    .eq('employee_id', share.employee_id)
    .maybeSingle();

  let body: {
    title?: string;
    template_key?: string;
    accent_color?: string;
    payload_json?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string') patch.title = body.title;
  if (typeof body.template_key === 'string') patch.template_key = body.template_key;
  if (typeof body.accent_color === 'string') patch.accent_color = body.accent_color;
  if (body.payload_json !== undefined) {
    const templateKey = coerceCvTemplateKey(
      typeof body.template_key === 'string'
        ? body.template_key
        : existingDoc?.template_key
    );
    patch.payload_json = normalizeCvPayload(body.payload_json, templateKey);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: row, error } = await supabaseAdmin
    .from('cv_documents')
    .update(patch)
    .eq('id', share.cv_document_id)
    .eq('employee_id', share.employee_id)
    .select('updated_at')
    .single();

  if (error) {
    console.error('cv-share document patch', error);
    return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 });
  }

  await supabaseAdmin
    .from('cv_share_links')
    .update({ last_saved_at: now, last_accessed_at: now })
    .eq('id', share.id);

  return NextResponse.json({ success: true, updated_at: row?.updated_at ?? now });
}
