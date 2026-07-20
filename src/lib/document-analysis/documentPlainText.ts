import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
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
    return extractPdfPlainTextWithGlyphFallback(buffer);
  }
  return '';
}

/** Checkbox marks used by intake detectors (unicode + ASCII). */
export function hasCheckboxGlyphs(text: string): boolean {
  if (!text) return false;
  return (
    /[☒☑☐□✓✔]/.test(text) ||
    /\[[xX]\]/.test(text) ||
    /\[\s*\]/.test(text) ||
    /\([xX]\)/.test(text) ||
    /\(\s*\)/.test(text)
  );
}

export type IntakePlainTextMeta = {
  textLen: number;
  hasHoeVerplaatst: boolean;
  hasRijbewijzen: boolean;
  hasCheckboxGlyphs: boolean;
  hasConcept: boolean;
};

export function describeIntakePlainText(text: string): IntakePlainTextMeta {
  return {
    textLen: text.length,
    hasHoeVerplaatst: /hoe verplaatst/i.test(text),
    hasRijbewijzen: /rijbewij/i.test(text),
    hasCheckboxGlyphs: hasCheckboxGlyphs(text),
    hasConcept: /\bConcept\b/i.test(text),
  };
}

async function extractPdfTextWithUnpdf(buffer: Buffer): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    if (Array.isArray(text)) return text.join('\n');
    return typeof text === 'string' ? text : '';
  } catch (error) {
    console.warn('⚠️ unpdf text extraction failed', error);
    return '';
  }
}

async function extractPdfTextWithPdfParse(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return typeof data?.text === 'string' ? data.text : '';
  } catch (error) {
    console.warn('⚠️ pdf-parse text extraction failed', error);
    return '';
  }
}

function resolvePdfJsWorkerSrc(): string | null {
  try {
    const require = createRequire(path.join(process.cwd(), 'package.json'));
    const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs');
    return pathToFileURL(workerPath).href;
  } catch (error) {
    console.warn('⚠️ Could not resolve pdfjs workerSrc', error);
    return null;
  }
}

async function extractPdfTextWithPdfJs(buffer: Buffer): Promise<string> {
  try {
    // Legacy build works in Next.js Node server routes without a browser worker file.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const workerSrc = resolvePdfJsWorkerSrc();
    if (workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    }

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      isEvalSupported: false,
      disableFontFace: true,
      useWorkerFetch: false,
      isOffscreenCanvasSupported: false,
    });
    const doc = await loadingTask.promise;
    const parts: string[] = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? String(item.str) : ''))
        .join(' ');
      parts.push(pageText);
    }
    await doc.destroy();
    return parts.join('\n');
  } catch (error) {
    console.warn('⚠️ pdfjs text extraction failed', error);
    return '';
  }
}

/**
 * Extract PDF plain text for checkbox detection.
 * Prefer unpdf (serverless-safe, keeps ☒/☐), then pdfjs, then pdf-parse.
 */
export async function extractPdfPlainTextWithGlyphFallback(
  pdfBuffer: Buffer
): Promise<string> {
  const unpdfText = await extractPdfTextWithUnpdf(pdfBuffer);
  if (hasCheckboxGlyphs(unpdfText)) {
    console.log(`📋 PDF text via unpdf (glyphs) len=${unpdfText.length}`);
    return unpdfText;
  }

  const pdfjsText = await extractPdfTextWithPdfJs(pdfBuffer);
  if (hasCheckboxGlyphs(pdfjsText)) {
    console.log(`📋 PDF text via pdfjs (glyphs) len=${pdfjsText.length}`);
    return pdfjsText;
  }

  const parseText = await extractPdfTextWithPdfParse(pdfBuffer);
  if (hasCheckboxGlyphs(parseText)) {
    console.log(`📋 PDF text via pdf-parse (glyphs) len=${parseText.length}`);
    return parseText;
  }

  // Prefer whichever has more content for section markers even without glyphs.
  const candidates = [
    { name: 'unpdf', text: unpdfText },
    { name: 'pdfjs', text: pdfjsText },
    { name: 'parse', text: parseText },
  ];
  candidates.sort((a, b) => b.text.length - a.text.length);
  const chosen = candidates[0]!;
  console.log(
    `📋 PDF text without checkbox glyphs via=${chosen.name} len=${chosen.text.length} unpdf=${unpdfText.length} pdfjs=${pdfjsText.length} parse=${parseText.length}`
  );
  return chosen.text;
}
