export const CV_FONT_OPTIONS = [
  {
    id: 'montserrat',
    label: 'Montserrat',
    css: 'var(--font-montserrat), "Montserrat", system-ui, sans-serif',
  },
  {
    id: 'georgia',
    label: 'Georgia',
    css: 'Georgia, "Times New Roman", Times, serif',
  },
  {
    id: 'garamond',
    label: 'Garamond',
    css: 'Garamond, "Palatino Linotype", Palatino, serif',
  },
  {
    id: 'arial',
    label: 'Arial',
    css: 'Arial, Helvetica, sans-serif',
  },
  {
    id: 'calibri',
    label: 'Calibri',
    css: 'Calibri, "Segoe UI", Candara, sans-serif',
  },
  {
    id: 'times',
    label: 'Times New Roman',
    css: '"Times New Roman", Times, serif',
  },
  {
    id: 'verdana',
    label: 'Verdana',
    css: 'Verdana, Geneva, sans-serif',
  },
] as const;

export type CvFontId = (typeof CV_FONT_OPTIONS)[number]['id'];

export const DEFAULT_CV_FONT_ID: CvFontId = 'montserrat';

export function coerceCvFontId(raw: string | undefined | null): CvFontId {
  if (raw && CV_FONT_OPTIONS.some((f) => f.id === raw)) {
    return raw as CvFontId;
  }
  return DEFAULT_CV_FONT_ID;
}

export function cvFontCss(fontId: string | undefined | null): string {
  const id = coerceCvFontId(fontId);
  return CV_FONT_OPTIONS.find((f) => f.id === id)!.css;
}
