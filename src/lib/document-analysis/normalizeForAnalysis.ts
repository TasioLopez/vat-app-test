/** Normalize documents to PDF before vision-based OpenAI extraction. */

export type NormalizedAnalysisDocument = {
  pdfBuffer: Buffer;
  analysisFilename: string;
  wasConverted: boolean;
};

function basename(pathOrFilename: string): string {
  return pathOrFilename.includes('/')
    ? pathOrFilename.split('/').pop()!
    : pathOrFilename;
}

function isPdfFilename(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf');
}

function isWordFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.docx') || lower.endsWith('.docm') || lower.endsWith('.doc');
}

function pdfAnalysisFilename(originalFilename: string): string {
  const base = basename(originalFilename);
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  return `${stem}.pdf`;
}

function getGotenbergUrl(): string | undefined {
  const url = process.env.GOTENBERG_URL?.trim();
  return url ? url.replace(/\/+$/, '') : undefined;
}

async function convertDocxToPdfViaGotenberg(
  buffer: Buffer,
  filename: string
): Promise<Buffer> {
  const gotenbergUrl = getGotenbergUrl();
  if (!gotenbergUrl) {
    throw new Error(
      'Intake DOCX conversion failed — GOTENBERG_URL is not configured. Set GOTENBERG_URL to your Gotenberg instance.'
    );
  }

  const form = new FormData();
  const uploadName = filename.toLowerCase().endsWith('.docm')
    ? filename.replace(/\.docm$/i, '.docx')
    : filename;
  form.append(
    'files',
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    uploadName
  );

  const response = await fetch(`${gotenbergUrl}/forms/libreoffice/convert`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Intake DOCX conversion failed — Gotenberg returned ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`
    );
  }

  const pdfArrayBuffer = await response.arrayBuffer();
  const pdfBuffer = Buffer.from(pdfArrayBuffer);
  if (pdfBuffer.length < 100) {
    throw new Error('Intake DOCX conversion failed — Gotenberg returned an empty PDF');
  }

  return pdfBuffer;
}

/**
 * Returns a PDF buffer suitable for OpenAI vision extraction.
 * PDF inputs pass through; DOC/DOCX convert via Gotenberg.
 */
export async function normalizeForAnalysis(
  buffer: Buffer,
  filename: string
): Promise<NormalizedAnalysisDocument> {
  const name = basename(filename);

  if (isPdfFilename(name)) {
    return {
      pdfBuffer: buffer,
      analysisFilename: name,
      wasConverted: false,
    };
  }

  if (isWordFilename(name)) {
    const pdfBuffer = await convertDocxToPdfViaGotenberg(buffer, name);
    return {
      pdfBuffer,
      analysisFilename: pdfAnalysisFilename(name),
      wasConverted: true,
    };
  }

  return {
    pdfBuffer: buffer,
    analysisFilename: isPdfFilename(name) ? name : pdfAnalysisFilename(name),
    wasConverted: false,
  };
}

export { getGotenbergUrl };
