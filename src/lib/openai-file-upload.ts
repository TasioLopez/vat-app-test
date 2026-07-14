const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOC_MIME = 'application/msword';
const PDF_MIME = 'application/pdf';

function basename(pathOrFilename: string): string {
  return pathOrFilename.includes('/')
    ? pathOrFilename.split('/').pop()!
    : pathOrFilename;
}

/**
 * Returns filename and MIME type safe for OpenAI files.create().
 * Normalizes .docm to .docx (OpenAI Files API rejects .docm extension; OOXML content is unchanged).
 */
export function getOpenAIFileParams(pathOrFilename: string): {
  filename: string;
  mimeType: string;
} {
  const filename = basename(pathOrFilename);
  const lower = filename.toLowerCase();

  if (lower.endsWith('.docm')) {
    return {
      filename: filename.slice(0, -5) + '.docx',
      mimeType: DOCX_MIME,
    };
  }
  if (lower.endsWith('.docx')) {
    return { filename, mimeType: DOCX_MIME };
  }
  if (lower.endsWith('.doc')) {
    return { filename, mimeType: DOC_MIME };
  }
  if (lower.endsWith('.pdf')) {
    return { filename, mimeType: PDF_MIME };
  }

  return { filename, mimeType: PDF_MIME };
}

/** Optional: warn when docm/docx buffer does not look like OOXML (ZIP PK header). */
export function warnIfNotOoxmlBuffer(buffer: Buffer, storagePath: string): void {
  const lower = basename(storagePath).toLowerCase();
  if (!lower.endsWith('.docm') && !lower.endsWith('.docx')) return;
  if (buffer.length < 2 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    console.warn(
      `⚠️ File ${basename(storagePath)} may not be valid OOXML (expected ZIP header PK)`
    );
  }
}

/**
 * Build a File for openai.files.create() using storage path (or fallback name) for extension rules.
 */
export function buildOpenAIFile(
  buffer: Buffer,
  storagePath: string,
  fallbackName?: string
): File {
  const pathForNaming = fallbackName || storagePath;
  warnIfNotOoxmlBuffer(buffer, pathForNaming);
  const { filename, mimeType } = getOpenAIFileParams(pathForNaming);
  return new File([buffer], filename, { type: mimeType });
}

/** Build a File for vision PDF extraction (always application/pdf). */
export function buildOpenAIFileFromPdf(pdfBuffer: Buffer, analysisFilename: string): File {
  const base = basename(analysisFilename);
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const filename = `${stem}.pdf`;
  return new File([pdfBuffer], filename, { type: PDF_MIME });
}
