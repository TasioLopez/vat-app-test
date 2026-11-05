import type { CvTemplateKey } from '@/types/cv';

export type CvChrome = 'sidebar' | 'split' | 'band' | 'editorial' | 'timeline';
export type CvSidebarFill = 'accent' | 'none';

export type CvThemeConfig = {
  rootClass: string;
  sidebarClass: string;
  mainClass: string;
  headerClass: string;
  sectionTitleClass: string;
  sidebarTitleClass: string;
  chrome: CvChrome;
  sidebarFill: CvSidebarFill;
  /** Share of the page width used by the sidebar column. Null for single-column templates. */
  sidebarFraction: number | null;
  /** Vertical padding inside a column, in px. Must match the padding classes above. */
  paddingY: { sidebar: number; main: number; root: number };
  /** Gap between stacked atoms. Must match the rendered stack. */
  atomGapPx: number;
};

const THEMES: Record<CvTemplateKey, CvThemeConfig> = {
  modern_professional: {
    rootClass: 'flex h-full min-h-0 text-[11px] leading-snug',
    sidebarClass:
      'flex h-full w-[32%] shrink-0 flex-col gap-6 p-5 text-white print:bg-[var(--cv-accent)]',
    mainClass: 'flex h-full min-w-0 flex-1 flex-col gap-6 bg-white p-6 text-gray-900',
    headerClass: 'border-b border-gray-200 pb-3',
    sectionTitleClass:
      'mb-2 mt-1 text-sm font-semibold uppercase tracking-wide text-[var(--cv-accent)]',
    sidebarTitleClass:
      'mb-2 mt-1 border-b border-white/30 pb-1 text-xs font-semibold uppercase tracking-wide',
    chrome: 'sidebar',
    sidebarFill: 'accent',
    sidebarFraction: 0.32,
    paddingY: { sidebar: 40, main: 48, root: 48 },
    atomGapPx: 24,
  },
  creative_bold: {
    rootClass: 'flex h-full min-h-0 text-[11px] leading-snug',
    sidebarClass: 'flex h-full w-1/2 shrink-0 flex-col gap-5 p-6 text-[11px] leading-snug text-gray-900',
    mainClass:
      'flex h-full min-w-0 flex-1 flex-col gap-5 border-l border-gray-100 p-6 text-[11px] leading-snug text-gray-900',
    headerClass: 'text-white',
    sectionTitleClass:
      'mb-2 mt-1 border-b border-[var(--cv-accent)] pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--cv-accent)]',
    sidebarTitleClass:
      'mb-2 mt-1 border-b border-[var(--cv-accent)] pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--cv-accent)]',
    chrome: 'band',
    sidebarFill: 'none',
    sidebarFraction: 0.5,
    paddingY: { sidebar: 48, main: 48, root: 48 },
    atomGapPx: 20,
  },
  corporate_minimal: {
    rootClass: 'flex h-full min-h-0 flex-col px-10 py-8 text-[11.5px] leading-relaxed text-gray-900',
    sidebarClass: '',
    mainClass: 'flex flex-col gap-5',
    headerClass: 'border-b border-gray-300 pb-4',
    sectionTitleClass: 'mb-2 mt-1 text-xs font-semibold uppercase tracking-widest text-gray-800',
    sidebarTitleClass: 'mb-2 mt-1 text-xs font-semibold uppercase tracking-widest text-gray-800',
    chrome: 'editorial',
    sidebarFill: 'none',
    sidebarFraction: null,
    paddingY: { sidebar: 64, main: 64, root: 64 },
    atomGapPx: 16,
  },
  linear_timeline: {
    rootClass: 'flex h-full min-h-0 flex-col px-8 py-6 text-[11px] leading-snug text-gray-900',
    sidebarClass: '',
    mainClass: 'flex flex-col gap-4',
    headerClass: 'pb-2',
    sectionTitleClass: 'mb-2 mt-1 text-sm font-semibold text-[var(--cv-accent)]',
    sidebarTitleClass: 'mb-2 mt-1 text-sm font-semibold text-[var(--cv-accent)]',
    chrome: 'timeline',
    sidebarFill: 'none',
    sidebarFraction: null,
    paddingY: { sidebar: 48, main: 48, root: 48 },
    atomGapPx: 16,
  },
  balanced_split: {
    rootClass: 'flex h-full min-h-0 text-[11px] leading-snug',
    sidebarClass: 'flex h-full w-1/2 shrink-0 flex-col gap-6 border-r border-gray-200 p-6',
    mainClass: 'flex h-full w-1/2 flex-col gap-6 p-6',
    headerClass: 'border-b border-gray-200 pb-3',
    sectionTitleClass: 'mb-2 mt-1 text-sm font-semibold uppercase tracking-wide text-[var(--cv-accent)]',
    sidebarTitleClass: 'mb-2 mt-1 text-sm font-semibold uppercase tracking-wide text-[var(--cv-accent)]',
    chrome: 'split',
    sidebarFill: 'accent',
    sidebarFraction: 0.5,
    paddingY: { sidebar: 48, main: 48, root: 48 },
    atomGapPx: 24,
  },
};

export function getCvTheme(templateKey: CvTemplateKey): CvThemeConfig {
  return THEMES[templateKey] ?? THEMES.modern_professional;
}

/** Height of the one-line name rule on Creatief pages after the first. */
export const CV_BAND_CONTINUATION_PX = 36;
