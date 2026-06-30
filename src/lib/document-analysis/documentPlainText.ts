import { parseDocx } from '@/lib/parse-docx';

export type DocumentKind = 'pdf' | 'docx' | 'doc' | 'other';

export function detectDocumentKind(path: string, docName?: string | null): DocumentKind {
  const p = path.toLowerCase();
  const n = (docName || '').toLowerCase();
  if (p.endsWith('.pdf') || n.endsWith('.pdf')) return 'pdf';
  if (p.endsWith('.docx') || n.endsWith('.docx')) return 'docx';
  if (p.endsWith('.doc') || n.endsWith('.doc')) return 'doc';
  return 'other';
}

export async function bufferToPlainText(buffer: Buffer, kind: DocumentKind): Promise<string> {
  if (kind === 'docx' || kind === 'doc') {
    try {
      return await parseDocx(buffer);
    } catch {
      return '';
    }
  }
  if (kind === 'pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      return typeof data?.text === 'string' ? data.text : '';
    } catch {
      return '';
    }
  }
  return '';
}
