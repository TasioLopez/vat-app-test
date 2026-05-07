'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';
import { BasisAgreementBlock, BasisSignatureBlock } from '@/components/tp2026/BasisAgreementSignature';
import {
  A4LogoHeader,
  A4Page,
  A4_H,
  FooterIdentity,
  SectionBand,
  TP2026_A4_PAGE_CLASS,
} from '@/components/tp2026/primitives';
import { formatNLDate } from '@/lib/tp2026/schema';
import { TP2026_BODY_FLOW_START_SPACER_PX } from '@/lib/tp2026/document-layout';
import {
  BASIS_DOCUMENT_FRONT_PARAGRAPHS,
  BASIS_DOCUMENT_FRONT_SUBTITLE,
  BASIS_DOCUMENT_FRONT_TITLE,
} from '@/lib/tp2026/basis-document-static';
import { renderTextWithLogoBullets } from '@/components/tp2026/BasisLegacyText';
import { InleidingSubBlock } from '@/components/tp/InleidingSubBlock';
import { WETTELIJKE_KADERS } from '@/lib/tp/static';
import { TP_BASIS_TP_ACTIVITIES_INTRO } from '@/lib/tp2026/basis-document-agreement';
import TP_ACTIVITIES, { getBodyMain, normalizeTp3Activities } from '@/lib/tp/tp_activities';

const INLEIDING_SUB_DELIM = 'staat het volgende:';

const boxClass = 'border border-[#b8985c] bg-[#f5efe6] p-2.5 text-neutral-900';

const NB_AVG_INLEIDING =
  'NB: in het kader van de AVG worden in deze rapportage geen medische termen en diagnoses vermeld.';

const BLOCK_SPACING_PX = 12;
const FOOTER_RESERVE_PX = 76;
const PAGE_BOTTOM_PAD_PX = 32;
const SAFETY_PX = 64;

export type BasisTextVariant = 'markdown' | 'logo' | 'pow' | 'adNb';

/** Body atoms only — front page is always rendered separately on page 1. */
export type BasisAtom =
  | {
      id: string;
      kind: 'inleiding';
      md: string;
      showSectionTitle: boolean;
      showToelichting: boolean;
      /** NB AVG — alleen op het laatste inleidingfragment wanneer er geen toelichting is. */
      showAvgDisclaimer: boolean;
    }
  | {
      id: string;
      kind: 'text';
      key: string;
      title: string;
      md: string;
      showSectionTitle: boolean;
      variant: BasisTextVariant;
    }
  | { id: string; kind: 'activity'; title: string; body: string; subText?: string | null; showSectionTitle: boolean }
  | { id: string; kind: 'agreement' }
  | { id: string; kind: 'signature' };

function chunkByParagraphs(text: string, softMaxChars: number): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [''];
  const paras = trimmed.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let cur = '';
  for (const p of paras) {
    if (cur && cur.length + p.length + 2 > softMaxChars) {
      out.push(cur);
      cur = p;
    } else {
      cur = cur ? `${cur}\n\n${p}` : p;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}

function bisectMarkdown(md: string): [string, string] | null {
  if (md.length < 120) return null;
  const mid = Math.floor(md.length / 2);
  let splitIdx = md.lastIndexOf('\n\n', mid + 200);
  if (splitIdx < 80) splitIdx = md.lastIndexOf('\n', mid + 120);
  if (splitIdx < 80) splitIdx = mid;
  const a = md.slice(0, splitIdx).trim();
  const b = md.slice(splitIdx).trim();
  if (a.length < 40 || b.length < 40) return null;
  return [a, b];
}

function fallbackSplitByLinesOrWords(text: string): [string, string] | null {
  const src = text.trim();
  if (!src) return null;

  const lines = src.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 4) {
    const mid = Math.floor(lines.length / 2);
    const a = lines.slice(0, mid).join('\n').trim();
    const b = lines.slice(mid).join('\n').trim();
    if (a.length > 20 && b.length > 20) return [a, b];
  }

  const words = src.split(/\s+/).filter(Boolean);
  if (words.length >= 18) {
    const mid = Math.floor(words.length / 2);
    const a = words.slice(0, mid).join(' ').trim();
    const b = words.slice(mid).join(' ').trim();
    if (a.length > 15 && b.length > 15) return [a, b];
  }

  return null;
}

function splitTextAggressive(text: string): [string, string] | null {
  return bisectMarkdown(text) ?? fallbackSplitByLinesOrWords(text);
}

function textVariant(key: string, text: string): BasisTextVariant {
  const t = text.trim();
  if (key === 'pow') return 'pow';
  if (key === 'ad' && t.startsWith('N.B.')) return 'adNb';
  if (key === 'wk' || key === 'vlb' || key === 'plaats' || key === 'ad') return 'logo';
  return 'markdown';
}

function buildActivityAtoms(data: Record<string, any>): BasisAtom[] {
  const raw = (data as { tp3_activities?: unknown }).tp3_activities;
  const selections = normalizeTp3Activities(raw);
  const atoms: BasisAtom[] = [];
  if (!selections.length) return atoms;

  const introSlices = chunkByParagraphs(TP_BASIS_TP_ACTIVITIES_INTRO, 1400);
  introSlices.forEach((slice, i) => {
    atoms.push({
      id: `acts-intro-${i}`,
      kind: 'text',
      key: 'acts-intro',
      title: 'Trajectdoel en in te zetten activiteiten',
      md: slice,
      showSectionTitle: i === 0,
      variant: 'markdown',
    });
  });

  for (const sel of selections) {
    const activity = TP_ACTIVITIES.find((a) => a.id === sel.id);
    if (!activity) continue;
    const body = getBodyMain(activity);
    const bodySlices = chunkByParagraphs(body, 1400);
    bodySlices.forEach((slice, i) => {
      atoms.push({
        id: `act-${activity.id}-${i}`,
        kind: 'activity',
        title: activity.title,
        body: slice,
        subText: i === bodySlices.length - 1 ? sel.subText ?? null : null,
        showSectionTitle: i === 0,
      });
    });
  }
  return atoms;
}

export function buildBasisBodyAtoms(data: Record<string, any>): BasisAtom[] {
  const atoms: BasisAtom[] = [];

  const sub = String(data.inleiding_sub || '').trim();
  const introSlices = chunkByParagraphs(String(data.inleiding ?? ''), 1200);
  introSlices.forEach((slice, i) => {
    const isLast = i === introSlices.length - 1;
    atoms.push({
      id: `inl-${i}`,
      kind: 'inleiding',
      md: slice,
      showSectionTitle: i === 0,
      showToelichting: isLast && Boolean(sub),
      showAvgDisclaimer: isLast && !sub && data.has_ad_report === false,
    });
  });

  const pushTextField = (key: string, title: string, value: unknown, fallback: string) => {
    const raw = String(value ?? '').trim();
    const fallbackTrim = String(fallback ?? '').trim();

    if (key === 'pow') {
      atoms.push({
        id: 'pow-0',
        kind: 'text',
        key,
        title,
        md: raw,
        showSectionTitle: true,
        variant: 'pow',
      });
      return;
    }

    const soft = key === 'wk' ? 900 : 1250;
    const baseText = raw || fallbackTrim;
    const slices = chunkByParagraphs(baseText, soft);
    slices.forEach((slice, i) => {
      atoms.push({
        id: `${key}-${i}`,
        kind: 'text',
        key,
        title,
        md: slice,
        showSectionTitle: i === 0,
        variant: textVariant(key, slice),
      });
    });
  };

  pushTextField(
    'wk',
    'Wettelijke kaders en terminologie',
    data.wettelijke_kaders,
    WETTELIJKE_KADERS
  );
  pushTextField('soc', 'Sociale achtergrond & maatschappelijke context', data.sociale_achtergrond, '');
  pushTextField('visw', 'Visie van werknemer', data.visie_werknemer, '');
  pushTextField('vlb', 'Visie van loopbaanadviseur', data.visie_loopbaanadviseur, '');
  pushTextField('prog', 'Prognose van de bedrijfsarts', data.prognose_bedrijfsarts, '');
  pushTextField('prof', 'Persoonlijk profiel', data.persoonlijk_profiel, '');
  pushTextField('zp', 'Zoekprofiel', data.zoekprofiel, '');
  pushTextField('blem', 'Praktische belemmeringen', data.praktische_belemmeringen, '');
  pushTextField(
    'ad',
    'In het arbeidsdeskundigrapport staat het volgende advies over passende arbeid',
    data.advies_ad_passende_arbeid,
    data.has_ad_report === false
      ? 'N.B.: Tijdens het opstellen van dit trajectplan is er nog geen AD-rapport opgesteld.'
      : ''
  );
  pushTextField('pow', 'Perspectief op Werk (PoW-meter)', data.pow_meter, '');
  pushTextField('plaats', 'Visie op plaatsbaarheid', data.visie_plaatsbaarheid, '');

  atoms.push(...buildActivityAtoms(data));
  atoms.push({ id: 'agree', kind: 'agreement' }, { id: 'sign', kind: 'signature' });

  return atoms;
}

function trySplitAtom(atoms: BasisAtom[], idx: number): BasisAtom[] | null {
  const atom = atoms[idx];
  if (!atom) return null;

  if (atom.kind === 'text') {
    const parts = splitTextAggressive(atom.md);
    if (!parts) return null;
    const [a, b] = parts;
    const nextVariantA = atom.key === 'pow' ? 'pow' : textVariant(atom.key, a);
    const nextVariantB = atom.key === 'pow' ? 'markdown' : textVariant(atom.key, b);
    return [
      ...atoms.slice(0, idx),
      {
        ...atom,
        id: `${atom.id}-a`,
        md: a,
        showSectionTitle: atom.showSectionTitle,
        variant: nextVariantA,
      },
      {
        ...atom,
        id: `${atom.id}-b`,
        md: b,
        showSectionTitle: false,
        variant: nextVariantB,
      },
      ...atoms.slice(idx + 1),
    ];
  }

  if (atom.kind === 'inleiding') {
    const parts = splitTextAggressive(atom.md);
    if (!parts) return null;
    const [a, b] = parts;
    const hadFooter = atom.showToelichting;
    const hadAvg = atom.showAvgDisclaimer;
    return [
      ...atoms.slice(0, idx),
      {
        ...atom,
        id: `${atom.id}-a`,
        md: a,
        showSectionTitle: atom.showSectionTitle,
        showToelichting: false,
        showAvgDisclaimer: false,
      },
      {
        ...atom,
        id: `${atom.id}-b`,
        md: b,
        showSectionTitle: false,
        showToelichting: hadFooter,
        showAvgDisclaimer: hadAvg,
      },
      ...atoms.slice(idx + 1),
    ];
  }

  if (atom.kind === 'activity') {
    const parts = splitTextAggressive(atom.body);
    if (!parts) return null;
    const [a, b] = parts;
    return [
      ...atoms.slice(0, idx),
      {
        ...atom,
        id: `${atom.id}-a`,
        body: a,
        showSectionTitle: atom.showSectionTitle,
        subText: null,
      },
      {
        ...atom,
        id: `${atom.id}-b`,
        body: b,
        showSectionTitle: false,
        subText: atom.subText,
      },
      ...atoms.slice(idx + 1),
    ];
  }

  return null;
}

function packIntoPages(heights: number[], maxUsable: number): number[][] {
  const pages: number[][] = [];
  let cur: number[] = [];
  let used = 0;

  heights.forEach((h, idx) => {
    const add = (cur.length ? BLOCK_SPACING_PX : 0) + h;
    if (h > maxUsable) {
      if (cur.length) {
        pages.push(cur);
        cur = [];
        used = 0;
      }
      pages.push([idx]);
      return;
    }
    if (used + add > maxUsable && cur.length) {
      pages.push(cur);
      cur = [idx];
      used = h;
    } else {
      used += add;
      cur.push(idx);
    }
  });
  if (cur.length) pages.push(cur);
  return pages;
}

function Basis2026FrontPage({
  data,
  pageNumber,
}: {
  data: Record<string, any>;
  pageNumber: number;
}) {
  return (
    <A4Page className={`${TP2026_A4_PAGE_CLASS} flex flex-col`}>
      <A4LogoHeader />
      <div className="flex min-h-0 flex-1 flex-col">
        <SectionBand title={BASIS_DOCUMENT_FRONT_TITLE} />
        <p className="mt-3 text-[13px] font-bold leading-tight text-[#6d2a96]">{BASIS_DOCUMENT_FRONT_SUBTITLE}</p>
        <div className="mt-4 space-y-3 text-[12px] leading-relaxed text-neutral-900">
          {BASIS_DOCUMENT_FRONT_PARAGRAPHS.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>
      <FooterIdentity
        lastName={data.last_name}
        firstName={data.first_name}
        dateOfBirth={formatNLDate(data.date_of_birth)}
        pageNumber={pageNumber}
      />
    </A4Page>
  );
}

function InleidingAtomPreview({
  data,
  atom,
}: {
  data: Record<string, any>;
  atom: Extract<BasisAtom, { kind: 'inleiding' }>;
}) {
  const sub = String(data.inleiding_sub || '').trim();
  const useDelimiterBlock = sub.includes(INLEIDING_SUB_DELIM);

  return (
    <div>
      {atom.showSectionTitle ? <SectionBand title="Inleiding" /> : null}
      <div className={boxClass}>
        {String(atom.md || '').trim() ? (
          <Basis2026MarkdownBody markdown={String(atom.md)} />
        ) : atom.showSectionTitle ? (
          <span className="text-[12px] text-neutral-600">— nog niet ingevuld —</span>
        ) : null}
        {atom.showAvgDisclaimer ? (
          <p className="mt-3 text-[12px] font-semibold text-neutral-900">{NB_AVG_INLEIDING}</p>
        ) : null}
        {atom.showToelichting && sub ? (
          <div className="mt-4 border-t border-[#b8985c]/50 pt-3">
            <h3 className="mb-1.5 text-[12px] font-bold text-green-800">Toelichting</h3>
            {useDelimiterBlock ? (
              <InleidingSubBlock text={sub} className="text-[12px] leading-relaxed text-neutral-900" />
            ) : (
              <Basis2026MarkdownBody markdown={sub} />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TextBlockBody({
  variant,
  markdown,
  fieldKey,
}: {
  variant: BasisTextVariant;
  markdown: string;
  fieldKey: string;
}) {
  const trimmed = String(markdown || '').trim();
  if (!trimmed) {
    return <span className="text-[12px] text-neutral-600">— nog niet ingevuld —</span>;
  }

  if (variant === 'adNb') {
    return <span className="text-[12px] font-bold text-neutral-900">{trimmed}</span>;
  }

  if (variant === 'pow') {
    return (
      <div>
        <div className="mb-4">
          <Basis2026MarkdownBody markdown={trimmed} />
        </div>
        <div className="my-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pow-meter.png" alt="PoW-meter" className="mx-auto max-h-[200px] max-w-full" />
        </div>
        <p className="mt-4 text-[10px] italic text-[#6d2a96]">
          * De Perspectief op Werk meter (PoW-meter) zegt niets over het opleidingsniveau of de werkervaring van de
          werknemer. Het is een momentopname, welke de huidige afstand tot de arbeidsmarkt grafisch weergeeft.
        </p>
      </div>
    );
  }

  if (variant === 'logo') {
    return (
      <div className="text-[12px] leading-relaxed text-neutral-900">
        {renderTextWithLogoBullets(trimmed, fieldKey === 'plaats', true)}
      </div>
    );
  }

  return <Basis2026MarkdownBody markdown={trimmed} />;
}

function TextAtomPreview({
  atom,
}: {
  atom: Extract<BasisAtom, { kind: 'text' }>;
}) {
  return (
    <div>
      {atom.showSectionTitle ? <SectionBand title={atom.title} /> : null}
      <div className={boxClass}>
        <TextBlockBody variant={atom.variant} markdown={atom.md} fieldKey={atom.key} />
      </div>
    </div>
  );
}

function ActivityAtomPreview({ atom }: { atom: Extract<BasisAtom, { kind: 'activity' }> }) {
  const hasSub = typeof atom.subText === 'string' && atom.subText.trim().length > 0;
  return (
    <div>
      {atom.showSectionTitle ? <SectionBand title={atom.title} /> : null}
      <div className={boxClass}>
        <div className="text-[12px] leading-relaxed">
          {String(atom.body || '').trim() ? (
            <Basis2026MarkdownBody markdown={String(atom.body)} />
          ) : (
            <span className="text-neutral-600">—</span>
          )}
          {hasSub ? (
            <div className="mt-2 flex items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/val-logo.jpg" alt="" width={14} height={14} className="mt-1 shrink-0" />
              <span>{atom.subText!.trim()}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function renderBodyAtom(data: Record<string, any>, atom: BasisAtom): React.ReactNode {
  switch (atom.kind) {
    case 'inleiding':
      return <InleidingAtomPreview data={data} atom={atom} />;
    case 'text':
      return <TextAtomPreview atom={atom} />;
    case 'activity':
      return <ActivityAtomPreview atom={atom} />;
    case 'agreement':
      return <BasisAgreementBlock />;
    case 'signature':
      return (
        <BasisSignatureBlock
          employeeName={`${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || 'Naam werknemer'}
          advisorName={data.consultant_name || 'Loopbaanadviseur'}
          employerContact={data.client_referent_name || 'Naam opdrachtgever'}
          employerFunctionCompany={
            [data.client_referent_function, data.client_name].filter(Boolean).join(', ') || undefined
          }
        />
      );
    default:
      return null;
  }
}

function BasisBodyPage({
  data,
  atoms,
  pageNumber,
}: {
  data: Record<string, any>;
  atoms: BasisAtom[];
  pageNumber: number;
}) {
  return (
    <A4Page className={`${TP2026_A4_PAGE_CLASS} flex flex-col`}>
      <A4LogoHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {atoms.map((atom, idx) => (
          <div key={`${atom.id}-${idx}`} className={idx > 0 ? 'mt-3' : ''}>
            {renderBodyAtom(data, atom)}
          </div>
        ))}
      </div>
      <FooterIdentity
        lastName={data.last_name}
        firstName={data.first_name}
        dateOfBirth={formatNLDate(data.date_of_birth)}
        pageNumber={pageNumber}
      />
    </A4Page>
  );
}

function waitImagesIn(el: HTMLElement | null): Promise<void> {
  if (!el) return Promise.resolve();
  const imgs = Array.from(el.querySelectorAll('img'));
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            window.setTimeout(resolve, 2500);
          }
        })
    )
  ).then(() => undefined);
}

export function Basis2026A4Pages({
  data,
  printMode = false,
  onPaginationReady,
}: {
  data: Record<string, any>;
  printMode?: boolean;
  onPaginationReady?: () => void;
}) {
  const baseline = useMemo(() => buildBasisBodyAtoms(data), [data]);
  const [bodyAtoms, setBodyAtoms] = useState<BasisAtom[]>(baseline);
  const [bodyPages, setBodyPages] = useState<number[][]>([]);
  const measureRootRef = useRef<HTMLDivElement | null>(null);
  const measureBodyRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const readySentRef = useRef(false);
  const measureRetriesRef = useRef(0);

  useEffect(() => {
    setBodyAtoms(baseline);
    readySentRef.current = false;
    measureRetriesRef.current = 0;
  }, [baseline]);

  const emitReady = useCallback(() => {
    if (readySentRef.current) return;
    readySentRef.current = true;
    onPaginationReady?.();
  }, [onPaginationReady]);

  const measureAndPaginate = useCallback(async () => {
    const root = measureRootRef.current;
    itemRefs.current = itemRefs.current.slice(0, bodyAtoms.length);
    await waitImagesIn(root);

    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    const fallbackMaxUsable =
      A4_H - TP2026_BODY_FLOW_START_SPACER_PX - FOOTER_RESERVE_PX - PAGE_BOTTOM_PAD_PX - SAFETY_PX;
    const measuredBodyPx = measureBodyRef.current?.clientHeight ?? 0;
    const maxUsablePx = measuredBodyPx > 0 ? Math.max(120, measuredBodyPx - SAFETY_PX) : fallbackMaxUsable;

    const heights = bodyAtoms.map((_, i) => itemRefs.current[i]?.getBoundingClientRect().height ?? 0);

    if (heights.some((h) => h <= 0) && bodyAtoms.length > 0) {
      if (measureRetriesRef.current < 30) {
        measureRetriesRef.current += 1;
        window.requestAnimationFrame(() => void measureAndPaginate());
        return;
      }
      console.warn('Basis2026A4Pages: measure heights still zero, using single-page fallback');
      setBodyPages([[...bodyAtoms.map((_, i) => i)]]);
      emitReady();
      return;
    }

    measureRetriesRef.current = 0;

    for (let i = 0; i < heights.length; i++) {
      if (heights[i] > maxUsablePx) {
        const split = trySplitAtom(bodyAtoms, i);
        if (split) {
          setBodyAtoms(split);
          return;
        }
      }
    }

    setBodyPages(packIntoPages(heights, maxUsablePx));
    emitReady();
  }, [bodyAtoms, emitReady]);

  useLayoutEffect(() => {
    void measureAndPaginate();
    const t = window.setTimeout(() => void measureAndPaginate(), 120);
    return () => window.clearTimeout(t);
  }, [measureAndPaginate]);

  const wrap = (node: React.ReactNode, key: React.Key) =>
    printMode ? (
      <section className="print-page" key={key}>
        {node}
      </section>
    ) : (
      <div key={key}>{node}</div>
    );

  const measureTree = (
    <div
      ref={measureRootRef}
      className="pointer-events-none fixed left-0 top-0 z-[-1] opacity-0"
      style={{ width: 794 }}
      aria-hidden
    >
      <A4Page className={`${TP2026_A4_PAGE_CLASS} flex flex-col`}>
        <A4LogoHeader />
        <div ref={measureBodyRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {bodyAtoms.map((atom, idx) => (
            <div
              key={atom.id}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              className={idx > 0 ? 'mt-3' : ''}
            >
              {renderBodyAtom(data, atom)}
            </div>
          ))}
        </div>
        <FooterIdentity
          lastName={data.last_name}
          firstName={data.first_name}
          dateOfBirth={formatNLDate(data.date_of_birth)}
          pageNumber={1}
        />
      </A4Page>
    </div>
  );

  const pages = bodyPages.length ? bodyPages : [[...bodyAtoms.map((_, i) => i)]];
  let pageNumber = 1;

  return (
    <>
      {measureTree}
      {wrap(<Basis2026FrontPage data={data} pageNumber={pageNumber++} />, 'basis-front')}
      {pages.map((idxs, pi) =>
        wrap(
          <BasisBodyPage
            data={data}
            atoms={idxs.map((i) => bodyAtoms[i]).filter(Boolean)}
            pageNumber={pageNumber++}
          />,
          `basis-body-${pi}`
        )
      )}
    </>
  );
}
