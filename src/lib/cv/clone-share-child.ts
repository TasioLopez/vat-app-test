import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeCvPayload } from '@/lib/cv/normalize';
import { DEFAULT_ACCENT_COLOR, coerceCvTemplateKey, type CvDocumentPayload, type CvModel } from '@/types/cv';

function rewritePhotoPath(
  path: string | undefined,
  employeeId: string,
  fromCvId: string,
  toCvId: string
): string | undefined {
  const trimmed = path?.trim();
  if (!trimmed) return undefined;
  const fromPrefix = `${employeeId}/${fromCvId}/`;
  if (!trimmed.startsWith(fromPrefix)) return trimmed;
  return `${employeeId}/${toCvId}/${trimmed.slice(fromPrefix.length)}`;
}

function rewriteModelPhotos(
  model: CvModel,
  employeeId: string,
  fromCvId: string,
  toCvId: string
): CvModel {
  const nextPath = rewritePhotoPath(model.personal.photoStoragePath, employeeId, fromCvId, toCvId);
  if (nextPath === model.personal.photoStoragePath) return model;
  return {
    ...model,
    personal: {
      ...model.personal,
      photoStoragePath: nextPath,
    },
  };
}

export function rewritePayloadPhotosForChild(
  payload: CvDocumentPayload,
  employeeId: string,
  fromCvId: string,
  toCvId: string
): CvDocumentPayload {
  const nl = rewriteModelPhotos(payload.content.nl, employeeId, fromCvId, toCvId);
  const en = payload.content.en
    ? rewriteModelPhotos(payload.content.en, employeeId, fromCvId, toCvId)
    : undefined;
  return {
    ...payload,
    content: { nl, ...(en ? { en } : {}) },
  };
}

async function copyPhotoObject(
  storage: SupabaseClient['storage'],
  fromPath: string,
  toPath: string
): Promise<void> {
  if (fromPath === toPath) return;
  const { data: file, error: dlErr } = await storage.from('cv-photos').download(fromPath);
  if (dlErr || !file) {
    console.warn('clone-share-child: photo download failed', fromPath, dlErr);
    return;
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || 'image/jpeg';
  const { error: upErr } = await storage.from('cv-photos').upload(toPath, buf, {
    contentType,
    upsert: true,
  });
  if (upErr) {
    console.warn('clone-share-child: photo upload failed', toPath, upErr);
  }
}

async function copyPhotosReferenced(
  supabase: SupabaseClient,
  employeeId: string,
  fromCvId: string,
  toCvId: string,
  payload: CvDocumentPayload
): Promise<void> {
  const paths = new Set<string>();
  const nlPath = payload.content.nl.personal.photoStoragePath?.trim();
  const enPath = payload.content.en?.personal.photoStoragePath?.trim();
  if (nlPath) paths.add(nlPath);
  if (enPath) paths.add(enPath);

  const fromPrefix = `${employeeId}/${fromCvId}/`;
  for (const path of paths) {
    if (!path.startsWith(fromPrefix)) continue;
    const toPath = `${employeeId}/${toCvId}/${path.slice(fromPrefix.length)}`;
    await copyPhotoObject(supabase.storage, path, toPath);
  }
}

export type ShareChildResult = {
  childCvId: string;
  title: string;
};

/**
 * Create a linked child CV for guest review (copy of payload + photos).
 * Uses the given supabase client (auth or service role).
 */
export async function createShareChildCv(
  supabase: SupabaseClient,
  opts: {
    parentCvId: string;
    employeeId: string;
    createdBy: string | null;
  }
): Promise<ShareChildResult> {
  const { data: row, error } = await supabase
    .from('cv_documents')
    .select('*')
    .eq('id', opts.parentCvId)
    .eq('employee_id', opts.employeeId)
    .maybeSingle();

  if (error || !row) {
    throw new Error('CV not found');
  }

  const templateKey = coerceCvTemplateKey(row.template_key);
  const sourcePayload = normalizeCvPayload(row.payload_json, templateKey);
  const title = `${(row.title as string) || 'CV'} (gedeeld)`;

  const { data: inserted, error: insertErr } = await supabase
    .from('cv_documents')
    .insert({
      employee_id: opts.employeeId,
      title,
      template_key: templateKey,
      accent_color: (row.accent_color as string) ?? DEFAULT_ACCENT_COLOR,
      status: 'shared_for_review',
      parent_cv_id: opts.parentCvId,
      payload_json: sourcePayload as unknown as Record<string, unknown>,
      created_by: opts.createdBy,
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    throw new Error(insertErr?.message || 'Failed to create share copy');
  }

  const childCvId = inserted.id as string;
  const childPayload = rewritePayloadPhotosForChild(
    sourcePayload,
    opts.employeeId,
    opts.parentCvId,
    childCvId
  );

  await copyPhotosReferenced(supabase, opts.employeeId, opts.parentCvId, childCvId, sourcePayload);

  const { error: updErr } = await supabase
    .from('cv_documents')
    .update({
      payload_json: childPayload as unknown as Record<string, unknown>,
    })
    .eq('id', childCvId)
    .eq('employee_id', opts.employeeId);

  if (updErr) {
    console.warn('clone-share-child: failed to rewrite photo paths', updErr);
  }

  return { childCvId, title };
}
