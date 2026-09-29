import {
  DOCUMENT_MAX_BYTES,
  resolveDocumentMime,
} from '@/lib/documents/upload-validation';

export type UploadEmployeeDocumentInput = {
  employeeId: string;
  type: string;
  file: File;
  /** When replacing, delete the existing document first (id + url). */
  existingDoc?: { id: string; url: string } | null;
};

export async function readJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (
      res.status === 413 ||
      /request entity too large|function_payload_too_large/i.test(text)
    ) {
      throw new Error(
        'Bestand is te groot voor upload via de server. Probeer een kleiner bestand (max 10 MB).'
      );
    }
    throw new Error(
      text.length > 200
        ? `Upload mislukt (HTTP ${res.status})`
        : text || `Upload mislukt (HTTP ${res.status})`
    );
  }
}

export function validateEmployeeDocumentFile(file: File): string | null {
  if (!file) return 'Geen bestand geselecteerd';
  if (file.size > DOCUMENT_MAX_BYTES) {
    return 'Bestand is te groot (max 10 MB).';
  }
  if (!resolveDocumentMime(file.type, file.name)) {
    return 'Niet-ondersteund bestandstype. Gebruik PDF, DOC, DOCX, PNG of JPG.';
  }
  return null;
}

export async function uploadEmployeeDocument({
  employeeId,
  type,
  file,
  existingDoc,
}: UploadEmployeeDocumentInput): Promise<{ path: string }> {
  const validationError = validateEmployeeDocumentFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  if (existingDoc?.id && existingDoc.url) {
    const deleteRes = await fetch('/api/documents/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: existingDoc.id,
        url: existingDoc.url,
      }),
    });
    const deleteResult = await readJsonResponse(deleteRes);
    if (!deleteRes.ok || deleteResult.success !== true) {
      throw new Error(
        `Kon bestaand document niet verwijderen: ${String(deleteResult.error || 'onbekende fout')}`
      );
    }
  }

  const contentType =
    resolveDocumentMime(file.type, file.name) || file.type || 'application/octet-stream';

  const signRes = await fetch('/api/documents/sign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employee_id: employeeId,
      type,
      name: file.name,
      content_type: contentType,
      size_bytes: file.size,
    }),
  });
  const signData = await readJsonResponse(signRes);
  if (!signRes.ok || typeof signData.path !== 'string' || typeof signData.signedUrl !== 'string') {
    throw new Error(String(signData.error || 'Kon upload niet voorbereiden'));
  }

  const path = signData.path;
  const signedUrl = signData.signedUrl;

  const putRes = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error('Upload naar opslag mislukt. Probeer het opnieuw.');
  }

  const metadataRes = await fetch('/api/documents/metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employee_id: employeeId,
      type,
      name: file.name,
      url: path,
    }),
  });
  const metadataData = await readJsonResponse(metadataRes);

  if (!metadataRes.ok || metadataData.success !== true) {
    // Best-effort cleanup of orphaned storage object
    try {
      await fetch('/api/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
    } catch {
      // ignore cleanup failures
    }
    throw new Error(
      `Kon documentgegevens niet opslaan: ${String(metadataData.error || 'onbekende fout')}`
    );
  }

  return { path };
}

export { DOCUMENT_MAX_BYTES };
