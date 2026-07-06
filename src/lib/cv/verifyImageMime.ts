import { fileTypeFromBuffer } from 'file-type';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Verify uploaded bytes match declared image MIME (magic-byte check). */
export async function verifyImageMagicBytes(
  buf: Buffer,
  declaredMime: string
): Promise<boolean> {
  if (!ALLOWED.has(declaredMime)) return false;

  const detected = await fileTypeFromBuffer(buf);
  if (!detected) {
    // Some JPEGs lack a detectable signature; allow only when declared as JPEG.
    return declaredMime === 'image/jpeg';
  }

  return detected.mime === declaredMime && ALLOWED.has(detected.mime);
}
