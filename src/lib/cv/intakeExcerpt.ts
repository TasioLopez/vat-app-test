import type { SupabaseClient } from '@supabase/supabase-js';
import { parseDocx } from '@/lib/parse-docx';

const MAX_EXCERPT_CHARS = 12_000;

/** Same resolution as autofill-employee-info-working */
function extractStoragePath(url: string): string | null {
  const m = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (m?.[1]) return m[1];
  if (url?.startsWith('documents/')) return url.slice('documents/'.length);
  if (url && !url.includes('://') && !url.includes('object/')) return url;
  return null;
}

function detectExt(path: string, docName: string | null | undefined): 'pdf' | 'docx' | 'doc' | 'other' {
  const p = path.toLowerCase();
  const n = (docName || '').toLowerCase();
  if (p.endsWith('.pdf') || n.endsWith('.pdf')) return 'pdf';
  if (p.endsWith('.docx') || n.endsWith('.docx')) return 'docx';
  if (p.endsWith('.doc') || n.endsWith('.doc')) return 'doc';
  return 'other';
}

async function bufferToPlainText(buffer: Buffer, kind: 'pdf' | 'docx' | 'doc' | 'other'): Promise<string> {
  if (kind === 'docx' || kind === 'doc') {
    try {
      return await parseDocx(buffer);
    } catch {
      return '';
    }
  }
  if (kind === 'pdf') {
    try {
      // Dynamic import: avoids bundling pdf-parse test fixtures into Next server chunks
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      return typeof data?.text === 'string' ? data.text : '';
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Plain-text excerpt from the newest intake-like document for use in CV AI prompts.
 * Returns null if none or extraction fails (non-fatal).
 */
export async function getIntakeExcerptForEmployee(
  supabase: SupabaseClient,
  employeeId: string
): Promise<string | null> {
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, url, name, type, uploaded_at')
    .eq('employee_id', employeeId)
    .order('uploaded_at', { ascending: false });

  if (error || !docs?.length) return null;

  const intakeDoc = docs.find((d) => {
    const t = (d.type || '').toLowerCase();
    return t.includes('intake') || t === 'intakeformulier';
  });

  if (!intakeDoc?.url || typeof intakeDoc.url !== 'string') return null;

  const path = extractStoragePath(intakeDoc.url);
  if (!path) return null;

  const { data: file, error: dlErr } = await supabase.storage.from('documents').download(path);
  if (dlErr || !file) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = detectExt(path, intakeDoc.name);
  let text = await bufferToPlainText(buffer, kind);
  if (!text.trim()) return null;

  text = text.replace(/\s+/g, ' ').trim();
  if (text.length > MAX_EXCERPT_CHARS) {
    return `${text.slice(0, MAX_EXCERPT_CHARS)}…`;
  }
  return text;
}
