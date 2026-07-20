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

async function extractPdfTextWithPdfJs(buffer: Buffer): Promise<string> {
  try {
    // Legacy build works in Next.js Node server routes without a worker file.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      isEvalSupported: false,
      disableFontFace: true,
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
 * Prefer pdfjs (preserves ☒/☐ on ValentineZ intakes); fall back to pdf-parse.
 */
export async function extractPdfPlainTextWithGlyphFallback(
  pdfBuffer: Buffer
): Promise<string> {
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
  const chosen =
    pdfjsText.length >= parseText.length ? pdfjsText : parseText;
  console.log(
    `📋 PDF text without checkbox glyphs len=${chosen.length} pdfjs=${pdfjsText.length} parse=${parseText.length}`
  );
  return chosen;
}
