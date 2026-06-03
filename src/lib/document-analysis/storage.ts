export function extractStoragePath(url: string): string | null {
  const match = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (match?.[1]) return match[1];
  if (url.startsWith('documents/')) return url.slice('documents/'.length);
  if (!url.includes('://') && !url.includes('object/')) return url;
  return null;
}

export function getFileType(path: string, docName?: string): { ext: string; mime: string } {
  const pathLower = path.toLowerCase();
  const nameLower = (docName || '').toLowerCase();

  if (pathLower.endsWith('.docx') || nameLower.endsWith('.docx')) {
    return { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  }
  if (pathLower.endsWith('.docm') || nameLower.endsWith('.docm')) {
    return { ext: 'docm', mime: 'application/vnd.ms-word.document.macroEnabled.12' };
  }
  if (pathLower.endsWith('.doc') || nameLower.endsWith('.doc')) {
    return { ext: 'doc', mime: 'application/msword' };
  }
  return { ext: 'pdf', mime: 'application/pdf' };
}

export const INTAKE_TYPE_VARIANTS = ['intakeformulier', 'intake-formulier', 'intake'] as const;

export function isIntakeDocumentType(type: string | null | undefined): boolean {
  const t = (type || '').toLowerCase();
  return INTAKE_TYPE_VARIANTS.some((v) => t.includes(v));
}
