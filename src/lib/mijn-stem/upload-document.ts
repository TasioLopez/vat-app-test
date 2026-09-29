import {
  MIJN_STEM_MAX_BYTES,
  resolveMijnStemMime,
} from '@/lib/mijn-stem/prepare-signed-upload';
import { readJsonResponse } from '@/lib/documents/upload-employee-document';

export function validateMijnStemFile(file: File): string | null {
  if (!file) return 'Geen bestand geselecteerd';
  if (file.size > MIJN_STEM_MAX_BYTES) {
    return 'Bestand is te groot (max 10 MB).';
  }
  if (!resolveMijnStemMime(file.type, file.name)) {
    return 'Niet-ondersteund bestandstype. Gebruik PDF, DOC, DOCX of TXT.';
  }
  return null;
}

export async function uploadMijnStemDocument(file: File): Promise<{
  document: {
    id: string;
    filename: string;
    file_size: number;
    file_type: string;
    status: string;
    created_at: string;
  };
}> {
  const validationError = validateMijnStemFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const contentType =
    resolveMijnStemMime(file.type, file.name) || file.type || 'application/octet-stream';

  const signRes = await fetch('/api/mijn-stem/sign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: file.name,
      content_type: contentType,
      size_bytes: file.size,
    }),
  });
  const signData = await readJsonResponse(signRes);
  if (!signRes.ok || typeof signData.path !== 'string' || typeof signData.signedUrl !== 'string') {
    throw new Error(String(signData.error || 'Kon upload niet voorbereiden'));
  }

  const putRes = await fetch(signData.signedUrl as string, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error('Upload naar opslag mislukt. Probeer het opnieuw.');
  }

  const registerRes = await fetch('/api/mijn-stem/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storage_path: signData.path,
      filename: file.name,
      file_size: file.size,
      file_type: contentType,
    }),
  });
  const registerData = await readJsonResponse(registerRes);

  if (!registerRes.ok || registerData.success !== true || !registerData.document) {
    throw new Error(String(registerData.error || 'Upload mislukt'));
  }

  return {
    document: registerData.document as {
      id: string;
      filename: string;
      file_size: number;
      file_type: string;
      status: string;
      created_at: string;
    },
  };
}

export { MIJN_STEM_MAX_BYTES };
