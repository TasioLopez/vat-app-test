'use client';

import { useEffect, useMemo, useRef } from 'react';
import CvAddSectionControl from '@/components/cv/CvAddSectionControl';
import CvAtomRenderer from '@/components/cv/CvAtomRenderer';
import {
  CV_ATOM_GAP_PX,
  useA4PageHeightPx,
  useCvSingleColumnPagination,
  useCvTwoColumnPagination,
} from '@/components/cv/useCvPagination';
import { useCV } from '@/context/CVContext';
import {
  buildColumnAtoms,
  findTwoColumnParts,
  type CvAtomDescriptor,
} from '@/lib/cv/atoms';
import { cvFontCss } from '@/lib/cv/font-options';
import { getCvTheme } from '@/lib/cv/theme-config';
import { pageSlice } from '@/lib/cv/pagination';
import type { CvLayoutSection } from '@/types/cv';
import { cn } from '@/lib/utils';

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const PREVIEW_GAP_PX = 20;

/** Approximate vertical padding inside themed columns (p-5/p-6/p-8). */
function columnPaddingY(templateKey: string, column: 'sidebar' | 'main' | 'root'): number {
  if (templateKey === 'corporate_minimal') return 64; // p-8
  if (column === 'sidebar') return 40; // p-5
  if (column === 'main') return 48; // p-6
  return 48;
}

function sidebarWidthFraction(templateKey: string): number {
  if (templateKey === 'balanced_split') return 0.5;
  if (templateKey === 'creative_bold') return 0.38;
  return 0.32;
}

function AtomStack({
  atomIds,
  atomMap,
  sections,
  accent,
  variant,
  readOnly,
}: {
  atomIds: string[];
  atomMap: Map<string, CvAtomDescriptor>;
  sections: CvLayoutSection[];
  accent: string;
  variant: 'default' | 'sidebar';
  readOnly: boolean;
}) {
  return (
    <div className="flex flex-col" style={{ gap: CV_ATOM_GAP_PX }}>
      {atomIds.map((id) => {
        const atom = atomMap.get(id);
        if (!atom) return null;
        return (
          <div key={id} data-cv-atom={id}>
            <CvAtomRenderer
              atom={atom}
              sections={sections}
              accent={accent}
              variant={variant}
              readOnly={readOnly}
            />
          </div>
        );
      })}
    </div>
  );
}

function MeasureColumn({
  atoms,
  sections,
  accent,
  variant,
  className,
  style,
  measureRef,
}: {
  atoms: CvAtomDescriptor[];
  sections: CvLayoutSection[];
  accent: string;
  variant: 'default' | 'sidebar';
  className?: string;
  style?: React.CSSProperties;
  measureRef: React.RefObject<HTMLDivElement | null>;
}) {
  // Always measure as read-only so editor chrome / empty placeholders do not inflate heights.
  return (
    <div
      ref={measureRef}
      aria-hidden
      className={cn('pointer-events-none absolute left-0 top-0 -z-10 opacity-0', className)}
      style={{ ...style, width: style?.width }}
    >
      <div className="flex flex-col" style={{ gap: CV_ATOM_GAP_PX }}>
        {atoms.map((atom) => (
          <div key={atom.id} data-cv-atom={atom.id}>
            <CvAtomRenderer
              atom={atom}
              sections={sections}
              accent={accent}
              variant={variant}
              readOnly
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CvPagedDocument() {
  const {
    layout,
    accentColor,
    templateKey,
    cvData,
    layoutOptions,
    readOnly,
    setPaginationReady,
  } = useCV();
  const theme = getCvTheme(templateKey);
  const accent = accentColor;
  const sidebarPosition = layoutOptions.sidebarPosition ?? 'left';
  const fontCss = cvFontCss(layoutOptions.fontFamily);
  const pageHeightPx = useA4PageHeightPx();
  const debounceMs = readOnly ? 0 : 280;

  const parts = useMemo(() => findTwoColumnParts(layout), [layout]);
  const hasTwoColumn = Boolean(parts.rootTwoColumn && parts.sidebar && parts.main);

  const sidebarSections = parts.sidebar?.children ?? [];
  const mainSections = parts.main?.children ?? [];
  const rootSections = layout;

  const sidebarAtoms = useMemo(
    () => (hasTwoColumn ? buildColumnAtoms(sidebarSections, cvData) : []),
    [hasTwoColumn, sidebarSections, cvData]
  );
  const mainAtoms = useMemo(
    () => (hasTwoColumn ? buildColumnAtoms(mainSections, cvData) : []),
    [hasTwoColumn, mainSections, cvData]
  );
  const singleAtoms = useMemo(
    () => (!hasTwoColumn ? buildColumnAtoms(rootSections, cvData) : []),
    [hasTwoColumn, rootSections, cvData]
  );

  const sidebarAtomMap = useMemo(
    () => new Map(sidebarAtoms.map((a) => [a.id, a])),
    [sidebarAtoms]
  );
  const mainAtomMap = useMemo(() => new Map(mainAtoms.map((a) => [a.id, a])), [mainAtoms]);
  const singleAtomMap = useMemo(() => new Map(singleAtoms.map((a) => [a.id, a])), [singleAtoms]);

  const measureSidebarRef = useRef<HTMLDivElement>(null);
  const measureMainRef = useRef<HTMLDivElement>(null);
  const measureSingleRef = useRef<HTMLDivElement>(null);
  const measureBeforeRef = useRef<HTMLDivElement>(null);

  const beforeAtoms = useMemo(
    () => (hasTwoColumn ? buildColumnAtoms(parts.before, cvData) : []),
    [hasTwoColumn, parts.before, cvData]
  );
  const beforeAtomMap = useMemo(
    () => new Map(beforeAtoms.map((a) => [a.id, a])),
    [beforeAtoms]
  );
  const hasBefore = beforeAtoms.length > 0;

  const sidebarInnerH = Math.max(
    1,
    pageHeightPx - columnPaddingY(templateKey, 'sidebar')
  );
  const mainInnerH = Math.max(1, pageHeightPx - columnPaddingY(templateKey, 'main'));
  const singleInnerH = Math.max(1, pageHeightPx - columnPaddingY(templateKey, 'root'));
  // Use the tighter of the two so both columns fit the page frame.
  const twoColInnerH = Math.min(sidebarInnerH, mainInnerH);

  const sideFrac = sidebarWidthFraction(templateKey);

  const twoCol = useCvTwoColumnPagination({
    measureSidebarRef,
    measureMainRef,
    pageInnerHeightPx: twoColInnerH,
    deps: [sidebarAtoms, mainAtoms, accent, templateKey, fontCss, cvData, layout],
    debounceMs,
    enabled: hasTwoColumn,
  });

  const beforePack = useCvSingleColumnPagination({
    measureRef: measureBeforeRef,
    pageInnerHeightPx: singleInnerH,
    deps: [beforeAtoms, accent, templateKey, fontCss, cvData],
    debounceMs,
    enabled: hasTwoColumn && hasBefore,
  });

  const single = useCvSingleColumnPagination({
    measureRef: measureSingleRef,
    pageInnerHeightPx: singleInnerH,
    deps: [singleAtoms, accent, templateKey, fontCss, cvData, layout],
    debounceMs,
    enabled: !hasTwoColumn,
  });

  const beforePageCount = hasTwoColumn && hasBefore ? beforePack.pageCount : 0;
  const pageCount = hasTwoColumn
    ? beforePageCount + twoCol.pageCount
    : single.pageCount;
  const ready = hasTwoColumn
    ? twoCol.ready && (!hasBefore || beforePack.ready)
    : single.ready;

  useEffect(() => {
    setPaginationReady(ready);
  }, [ready, setPaginationReady]);

  const rootStyle = {
    '--cv-accent': accent,
    '--cv-font': fontCss,
    fontFamily: 'var(--cv-font)',
  } as React.CSSProperties;

  const pageH = pageHeightPx || 1123;
  const stackHeight = pageCount * pageH + Math.max(0, pageCount - 1) * PREVIEW_GAP_PX;

  return (
    <div
      className="cv-paged-document relative mx-auto"
      style={{ width: `${PAGE_WIDTH_MM}mm`, height: readOnly ? undefined : stackHeight }}
      data-cv-pagination-ready={ready ? '1' : '0'}
    >
      {/* Offscreen measure layers */}
      {hasTwoColumn ? (
        <>
          {hasBefore ? (
            <MeasureColumn
              measureRef={measureBeforeRef}
              atoms={beforeAtoms}
              sections={parts.before}
              accent={accent}
              variant="default"
              className={theme.rootClass}
              style={{ width: `${PAGE_WIDTH_MM}mm` }}
            />
          ) : null}
          <MeasureColumn
            measureRef={measureSidebarRef}
            atoms={sidebarAtoms}
            sections={sidebarSections}
            accent={accent}
            variant="sidebar"
            className={theme.sidebarClass}
            style={{
              backgroundColor: accent,
              width: `calc(${PAGE_WIDTH_MM}mm * ${sideFrac})`,
            }}
          />
          <MeasureColumn
            measureRef={measureMainRef}
            atoms={mainAtoms}
            sections={mainSections}
            accent={accent}
            variant="default"
            className={theme.mainClass}
            style={{ width: `calc(${PAGE_WIDTH_MM}mm * ${1 - sideFrac})` }}
          />
        </>
      ) : (
        <MeasureColumn
          measureRef={measureSingleRef}
          atoms={singleAtoms}
          sections={rootSections}
          accent={accent}
          variant="default"
          className={theme.rootClass}
          style={{ width: `${PAGE_WIDTH_MM}mm` }}
        />
      )}

      <div className="flex flex-col gap-5 print:gap-0">
        {Array.from({ length: pageCount }, (_, pageIndex) => {
          const isLast = pageIndex === pageCount - 1;

          if (hasTwoColumn && parts.sidebar && parts.main) {
            // Leading full-width pages for sections before the two-column block (e.g. creative).
            if (pageIndex < beforePageCount) {
              const ids = pageSlice(beforePack.pages, pageIndex);
              return (
                <div
                  key={`page-before-${pageIndex}`}
                  className={cn(
                    'cv-print-page relative overflow-hidden bg-white shadow-lg print:shadow-none',
                    'print:break-after-page'
                  )}
                  style={{
                    width: `${PAGE_WIDTH_MM}mm`,
                    height: `${PAGE_HEIGHT_MM}mm`,
                  }}
                >
                  <div
                    className={cn(theme.rootClass, 'h-full w-full overflow-hidden')}
                    style={rootStyle}
                  >
                    <AtomStack
                      atomIds={ids}
                      atomMap={beforeAtomMap}
                      sections={parts.before}
                      accent={accent}
                      variant="default"
                      readOnly={readOnly}
                    />
                  </div>
                </div>
              );
            }

            const colIndex = pageIndex - beforePageCount;
            const sideIds = pageSlice(twoCol.sidebarPages, colIndex);
            const mainIds = pageSlice(twoCol.mainPages, colIndex);
            return (
              <div
                key={`page-${pageIndex}`}
                className={cn(
                  'cv-print-page relative overflow-hidden bg-white shadow-lg print:shadow-none',
                  pageIndex < pageCount - 1 && 'print:break-after-page'
                )}
                style={{
                  width: `${PAGE_WIDTH_MM}mm`,
                  height: `${PAGE_HEIGHT_MM}mm`,
                }}
              >
                <div className={cn(theme.rootClass, 'flex h-full w-full')} style={rootStyle}>
                  <div
                    className={cn(
                      'flex min-h-0 flex-1 items-stretch',
                      sidebarPosition === 'right' && 'flex-row-reverse'
                    )}
                  >
                    <aside
                      className={cn(theme.sidebarClass, 'relative min-h-0 overflow-hidden')}
                      style={{ backgroundColor: accent }}
                    >
                      <AtomStack
                        atomIds={sideIds}
                        atomMap={sidebarAtomMap}
                        sections={sidebarSections}
                        accent={accent}
                        variant="sidebar"
                        readOnly={readOnly}
                      />
                      {isLast && !readOnly && parts.sidebar ? (
                        <CvAddSectionControl
                          parentId={parts.sidebar.id}
                          columnHint="sidebar"
                          variant="sidebar"
                          className="mt-auto"
                        />
                      ) : null}
                    </aside>
                    <div className={cn(theme.mainClass, 'relative min-h-0 overflow-hidden')}>
                      <AtomStack
                        atomIds={mainIds}
                        atomMap={mainAtomMap}
                        sections={mainSections}
                        accent={accent}
                        variant="default"
                        readOnly={readOnly}
                      />
                      {isLast && !readOnly && parts.main ? (
                        <CvAddSectionControl
                          parentId={parts.main.id}
                          columnHint="main"
                          variant="default"
                          className="mt-auto"
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          const ids = pageSlice(single.pages, pageIndex);
          return (
            <div
              key={`page-${pageIndex}`}
              className={cn(
                'cv-print-page relative overflow-hidden bg-white shadow-lg print:shadow-none',
                pageIndex < pageCount - 1 && 'print:break-after-page'
              )}
              style={{
                width: `${PAGE_WIDTH_MM}mm`,
                height: `${PAGE_HEIGHT_MM}mm`,
              }}
            >
              <div className={cn(theme.rootClass, 'h-full w-full overflow-hidden')} style={rootStyle}>
                <AtomStack
                  atomIds={ids}
                  atomMap={singleAtomMap}
                  sections={rootSections}
                  accent={accent}
                  variant="default"
                  readOnly={readOnly}
                />
                {isLast && !readOnly ? (
                  <CvAddSectionControl parentId={null} columnHint="root" variant="default" />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
