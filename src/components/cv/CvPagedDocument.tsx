'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import CvAddSectionControl from '@/components/cv/CvAddSectionControl';
import CvAtomRenderer from '@/components/cv/CvAtomRenderer';
import { CvBandHeader, CvContinuationBar } from '@/components/cv/CvChromeBlocks';
import {
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
import { CV_BAND_CONTINUATION_PX, getCvTheme } from '@/lib/cv/theme-config';
import { pageSlice } from '@/lib/cv/pagination';
import type { CvLayoutSection } from '@/types/cv';
import { cn } from '@/lib/utils';

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const PREVIEW_GAP_PX = 20;


function AtomStack({
  atomIds,
  atomMap,
  sections,
  accent,
  variant,
  readOnly,
  gapPx,
}: {
  atomIds: string[];
  atomMap: Map<string, CvAtomDescriptor>;
  sections: CvLayoutSection[];
  accent: string;
  variant: 'default' | 'sidebar';
  readOnly: boolean;
  gapPx: number;
}) {
  return (
    <div className="flex flex-col" style={{ gap: gapPx }}>
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
  gapPx,
}: {
  atoms: CvAtomDescriptor[];
  sections: CvLayoutSection[];
  accent: string;
  variant: 'default' | 'sidebar';
  className?: string;
  style?: React.CSSProperties;
  measureRef: React.RefObject<HTMLDivElement | null>;
  gapPx: number;
}) {
  // Always measure as read-only so editor chrome / empty placeholders do not inflate heights.
  return (
    <div
      ref={measureRef}
      aria-hidden
      className={cn('pointer-events-none absolute left-0 top-0 -z-10 opacity-0', className)}
      style={{ ...style, width: style?.width }}
    >
      <div className="flex flex-col" style={{ gap: gapPx }}>
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

  const atomOptions = useMemo(() => ({ chrome: theme.chrome }), [theme.chrome]);
  const gapPx = theme.atomGapPx;

  const sidebarAtoms = useMemo(
    () => (hasTwoColumn ? buildColumnAtoms(sidebarSections, cvData, atomOptions) : []),
    [hasTwoColumn, sidebarSections, cvData, atomOptions]
  );
  const mainAtoms = useMemo(
    () => (hasTwoColumn ? buildColumnAtoms(mainSections, cvData, atomOptions) : []),
    [hasTwoColumn, mainSections, cvData, atomOptions]
  );
  const singleAtoms = useMemo(
    () => (!hasTwoColumn ? buildColumnAtoms(rootSections, cvData, atomOptions) : []),
    [hasTwoColumn, rootSections, cvData, atomOptions]
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
    () => (hasTwoColumn ? buildColumnAtoms(parts.before, cvData, atomOptions) : []),
    [hasTwoColumn, parts.before, cvData, atomOptions]
  );
  const beforeAtomMap = useMemo(
    () => new Map(beforeAtoms.map((a) => [a.id, a])),
    [beforeAtoms]
  );
  const hasBefore = beforeAtoms.length > 0;
  const isBand = theme.chrome === 'band' && hasTwoColumn && hasBefore;
  const sidebarVariant = theme.sidebarFill === 'accent' ? 'sidebar' : 'default';

  const [bandHeightPx, setBandHeightPx] = useState(0);
  useLayoutEffect(() => {
    if (!isBand) {
      setBandHeightPx(0);
      return;
    }
    const el = measureBeforeRef.current;
    if (!el) return;
    const next = Math.ceil(el.getBoundingClientRect().height);
    setBandHeightPx((prev) => (prev === next ? prev : next));
  }, [isBand, beforeAtoms, accent, fontCss, templateKey, cvData, layout, pageHeightPx]);

  const sidebarInnerH = Math.max(1, pageHeightPx - theme.paddingY.sidebar);
  const mainInnerH = Math.max(1, pageHeightPx - theme.paddingY.main);
  const singleInnerH = Math.max(1, pageHeightPx - theme.paddingY.root);
  // Use the tighter of the two so both columns fit the page frame.
  const twoColInnerH = Math.min(sidebarInnerH, mainInnerH);
  const bandFirstInner = isBand ? Math.max(1, twoColInnerH - bandHeightPx) : undefined;
  const bandNextInner = isBand ? Math.max(1, twoColInnerH - CV_BAND_CONTINUATION_PX) : twoColInnerH;

  const sideFrac = theme.sidebarFraction ?? 0.32;

  const twoCol = useCvTwoColumnPagination({
    measureSidebarRef,
    measureMainRef,
    pageInnerHeightPx: bandNextInner,
    firstPageInnerHeightPx: bandFirstInner,
    preserveFirstPage: isBand,
    gapPx,
    deps: [sidebarAtoms, mainAtoms, accent, templateKey, fontCss, cvData, layout, bandHeightPx],
    debounceMs,
    enabled: hasTwoColumn,
  });

  const beforePack = useCvSingleColumnPagination({
    measureRef: measureBeforeRef,
    pageInnerHeightPx: singleInnerH,
    gapPx,
    deps: [beforeAtoms, accent, templateKey, fontCss, cvData],
    debounceMs,
    enabled: hasTwoColumn && hasBefore && !isBand,
  });

  const single = useCvSingleColumnPagination({
    measureRef: measureSingleRef,
    pageInnerHeightPx: singleInnerH,
    gapPx,
    deps: [singleAtoms, accent, templateKey, fontCss, cvData, layout],
    debounceMs,
    enabled: !hasTwoColumn,
  });

  const beforePageCount = hasTwoColumn && hasBefore && !isBand ? beforePack.pageCount : 0;
  const pageCount = hasTwoColumn
    ? beforePageCount + twoCol.pageCount
    : single.pageCount;
  const ready = hasTwoColumn
    ? twoCol.ready && (!hasBefore || isBand || beforePack.ready)
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
          {hasBefore && isBand ? (
            <div
              ref={measureBeforeRef}
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 -z-10 opacity-0"
              style={{ width: `${PAGE_WIDTH_MM}mm`, ...rootStyle }}
            >
              <CvBandHeader readOnly accent={accent} sections={parts.before} />
            </div>
          ) : null}
          {hasBefore && !isBand ? (
            <MeasureColumn
              measureRef={measureBeforeRef}
              atoms={beforeAtoms}
              sections={parts.before}
              accent={accent}
              variant="default"
              className={theme.rootClass}
              gapPx={gapPx}
              style={{ width: `${PAGE_WIDTH_MM}mm` }}
            />
          ) : null}
          <MeasureColumn
            measureRef={measureSidebarRef}
            atoms={sidebarAtoms}
            sections={sidebarSections}
            accent={accent}
            variant={sidebarVariant}
            className={theme.sidebarClass}
            gapPx={gapPx}
            style={{
              ...(theme.sidebarFill === 'accent' ? { backgroundColor: accent } : {}),
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
            gapPx={gapPx}
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
          gapPx={gapPx}
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
                      gapPx={gapPx}
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
                <div
                  className={cn(
                    isBand ? 'flex h-full min-h-0 w-full flex-col' : cn(theme.rootClass, 'flex h-full w-full')
                  )}
                  style={rootStyle}
                >
                  {isBand && colIndex === 0 ? (
                    <CvBandHeader readOnly={readOnly} accent={accent} sections={parts.before} />
                  ) : null}
                  {isBand && colIndex > 0 ? <CvContinuationBar accent={accent} /> : null}
                  <div
                    className={cn(
                      'flex min-h-0 flex-1 items-stretch',
                      sidebarPosition === 'right' && 'flex-row-reverse'
                    )}
                  >
                    <aside
                      className={cn(theme.sidebarClass, 'relative min-h-0 overflow-hidden')}
                      style={theme.sidebarFill === 'accent' ? { backgroundColor: accent } : undefined}
                    >
                      <AtomStack
                        atomIds={sideIds}
                        atomMap={sidebarAtomMap}
                        sections={sidebarSections}
                        accent={accent}
                        variant={sidebarVariant}
                        readOnly={readOnly}
                        gapPx={gapPx}
                      />
                      {isLast && !readOnly && parts.sidebar ? (
                        <CvAddSectionControl
                          parentId={parts.sidebar.id}
                          columnHint="sidebar"
                          variant={sidebarVariant}
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
                        gapPx={gapPx}
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
                  gapPx={gapPx}
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
