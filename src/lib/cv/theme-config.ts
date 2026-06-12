import type { CvTemplateKey } from '@/types/cv';

export type CvThemeConfig = {
  rootClass: string;
  sidebarClass: string;
  mainClass: string;
  headerClass: string;
  sectionTitleClass: string;
  sidebarTitleClass: string;
};

const THEMES: Record<CvTemplateKey, CvThemeConfig> = {
  modern_professional: {
    rootClass: 'flex min-h-[297mm] text-[11px] leading-snug',
    sidebarClass:
      'flex w-[32%] shrink-0 flex-col gap-4 p-5 text-white print:bg-[var(--cv-accent)]',
    mainClass: 'flex min-w-0 flex-1 flex-col gap-4 bg-white p-6 text-gray-900',
    headerClass: 'border-b border-gray-200 pb-3',
    sectionTitleClass:
      'mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--cv-accent)]',
    sidebarTitleClass:
      'mb-2 border-b border-white/30 pb-1 text-xs font-semibold uppercase tracking-wide',
  },
  creative_bold: {
    rootClass: 'flex min-h-[297mm] flex-col text-[11px] leading-snug',
    sidebarClass: 'flex w-[38%] shrink-0 flex-col gap-4 bg-gray-50 p-5',
    mainClass: 'flex min-w-0 flex-1 flex-col gap-4 p-6',
    headerClass: 'border-b-4 border-[var(--cv-accent)] pb-4',
    sectionTitleClass: 'mb-2 text-base font-bold text-[var(--cv-accent)]',
    sidebarTitleClass: 'mb-2 text-xs font-bold uppercase text-gray-700',
  },
  corporate_minimal: {
    rootClass: 'flex min-h-[297mm] flex-col gap-4 p-8 text-[11px] leading-relaxed max-w-[180mm] mx-auto',
    sidebarClass: '',
    mainClass: 'flex flex-col gap-4',
    headerClass: 'border-b border-gray-300 pb-2',
    sectionTitleClass: 'mb-2 text-xs font-semibold uppercase tracking-widest text-gray-800',
    sidebarTitleClass: 'mb-2 text-xs font-semibold uppercase tracking-widest text-gray-800',
  },
  linear_timeline: {
    rootClass: 'flex min-h-[297mm] flex-col gap-4 p-6 text-[11px] leading-snug',
    sidebarClass: '',
    mainClass: 'flex flex-col gap-4',
    headerClass: 'pb-2',
    sectionTitleClass: 'mb-2 text-sm font-semibold text-[var(--cv-accent)]',
    sidebarTitleClass: 'mb-2 text-sm font-semibold text-[var(--cv-accent)]',
  },
  balanced_split: {
    rootClass: 'flex min-h-[297mm] text-[11px] leading-snug',
    sidebarClass: 'flex w-1/2 shrink-0 flex-col gap-4 border-r border-gray-200 p-6',
    mainClass: 'flex w-1/2 flex-col gap-4 p-6',
    headerClass: 'border-b border-gray-200 pb-3',
    sectionTitleClass: 'mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--cv-accent)]',
    sidebarTitleClass: 'mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--cv-accent)]',
  },
};

export function getCvTheme(templateKey: CvTemplateKey): CvThemeConfig {
  return THEMES[templateKey] ?? THEMES.modern_professional;
}
