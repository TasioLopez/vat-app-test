export const TP2026_BORDER_GOLD = '#c4b37b';
export const TP2026_CELL_BG_WARM = '#f3efe4';

/** Inline / print-safe border declaration (100% opacity). */
export const TP2026_BORDER_CSS = `0.5pt solid ${TP2026_BORDER_GOLD}`;

/** 0.5pt gold borders for print-aligned tables and cells. */
export const TP2026_BORDER_THIN_CLASS = 'border-[0.5pt] border-[#c4b37b]';

export const TP2026_CELL_BG_WARM_CLASS = 'bg-[#f3efe4]';

/** Simple gold-bordered box (signature blocks, etc.). */
export const TP2026_BORDER_BOX_CLASS = 'tp2026-border-box';

export const TP2026_DATA_ROW_LABEL_CLASS =
  'px-2.5 py-0.5 font-bold text-[#6d2a96] bg-[#f3efe4] align-top';

export const TP2026_DATA_ROW_VALUE_CLASS =
  'px-2.5 py-0.5 font-normal text-neutral-900 bg-white align-top';

/** Default label/value column widths for Gegevens-style field tables (~35% / 65%). */
export const TP2026_FIELD_TABLE_COL_WIDTHS: [string, string] = ['35%', '65%'];

/** Collapsed HTML table with uniform cell borders. */
export const TP2026_HTML_TABLE_CLASS = 'tp2026-html-table w-full table-fixed';

export const TP2026_HTML_TABLE_CELL_CLASS = 'tp2026-html-table-cell';

/** Injected into Puppeteer PDF export — 1pt borders survive Chromium rasterization. */
export const TP2026_PDF_PRINT_BORDER_CSS = `
  .tp2026-html-table { border: 1pt solid ${TP2026_BORDER_GOLD} !important; }
  .tp2026-html-table th, .tp2026-html-table td { border: 1pt solid ${TP2026_BORDER_GOLD} !important; }
  .tp2026-border-box { border: 1pt solid ${TP2026_BORDER_GOLD} !important; }
`;
