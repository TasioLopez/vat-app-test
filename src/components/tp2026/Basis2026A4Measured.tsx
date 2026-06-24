'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';
import { BasisAgreementBlock, BasisSignatureBlock } from '@/components/tp2026/BasisAgreementSignature';
import {
  A4LogoHeader,
  A4Page,
  BasisToelichtingHeading,
  FooterIdentity,
  PurpleSectionBar,
  SectionBand,
  TP2026_A4_PAGE_CLASS,
} from '@/components/tp2026/primitives';
import {
  getBasisToelichtingLabel,
  normalizeWkMarkdown,
  TP_BASIS_BODY_BOX_CLASS,
  TP_BASIS_DISCLAIMER_CLASS,
  TP_BASIS_TOELICHTING_DEFAULT,
  TP_WK_INTRO_LINE,
} from '@/lib/tp2026/basis-document-layout';
import {
  TP2026_PROFIEL_PREVIEW_META,
  TP2026_PROFIEL_WERKNEMER_FIELD_ORDER,
  type TP2026ProfielWerknemerFieldKey,
} from '@/lib/tp2026/basis-profiel-field-order';
import { getAtomMarginClass, Spoor2SubsectionUnit } from '@/components/tp2026/Spoor2SectionUnits';
import { formatNLDate } from '@/lib/tp2026/schema';
import { Basis2026InhoudsopgavePage } from '@/components/tp2026/Basis2026InhoudsopgavePage';
import { renderTextWithLogoBullets } from '@/components/tp2026/BasisLegacyText';
import { InleidingSubBlock } from '@/components/tp/InleidingSubBlock';
import { AdviesPassendeArbeidBlock } from '@/components/tp/AdviesPassendeArbeidBlock';
import { BelastbaarheidsprofielBlock } from '@/components/tp/BelastbaarheidsprofielBlock';
import { PerspectiefOpWerkBlock } from '@/components/tp/PerspectiefOpWerkBlock';
import { PowInschalingTable } from '@/components/tp/PowInschalingTable';
import { VisieLoopbaanadviseurBlock } from '@/components/tp/VisieLoopbaanadviseurBlock';
import { POW_METER_FOOTNOTE } from '@/lib/tp/pow-meter/constants';
import { WETTELIJKE_KADERS } from '@/lib/tp/static';
import {
  TP_SPOOR2_SUBSECTIONS,
  TP_SPOOR2_TOELICHTING_BODY,
  TP_SPOOR2_TOELICHTING_TITLE,
} from '@/lib/tp2026/basis-spoor2-begeleiding';
import { resolveSpoor2Selections } from '@/lib/tp/tp_activities';
import { isSpoor2NotitieEligible } from '@/lib/tp2026/basis-spoor2-begeleiding';
import { useTP2026PageNumber } from '@/context/TP2026PageNumberContext';

const NB_AVG_INLEIDING =
  'NB: in het kader van de AVG worden in deze rapportage geen medische termen en diagnoses vermeld.';

export type BasisTextVariant =
  | 'markdown'
  | 'logo'
  | 'adNb'
  | 'adAdvies'
  | 'belastbaarheid'
  | 'visieLa'
  | 'powStatic'
  | 'powGraphic'
  | 'powInschaling'
  | 'pow';

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
  | {
      id: string;
      kind: 'spoor2';
      title: string;
      body: string;
      showMainBand: boolean;
      showSubsectionTitle: boolean;
      subText?: string | null;
    }
  | {
      id: string;
      kind: 'groupBanner';
      title: string;
      pageBreakBefore: boolean;
    }
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

  // Last-resort hard split so oversized dynamic content can still continue on next page.
  if (src.length >= 8) {
    const mid = Math.floor(src.length / 2);
    const a = src.slice(0, mid).trim();
    const b = src.slice(mid).trim();
    if (a.length > 2 && b.length > 2) return [a, b];
  }

  return null;
}

function splitTextAggressive(text: string): [string, string] | null {
  return bisectMarkdown(text) ?? fallbackSplitByLinesOrWords(text);
}

function textVariant(key: string, text: string): BasisTextVariant {
  const t = text.trim();
  if (key === 'prog') return 'belastbaarheid';
  if (key === 'vlb') return 'visieLa';
  if (key === 'ad' && t.startsWith('N.B.')) return 'adNb';
  if (key === 'ad') return 'adAdvies';
  if (key === 'wk') return 'logo';
  return 'markdown';
}

function buildSpoor2Atoms(data: Record<string, unknown>): BasisAtom[] {
  const selections = resolveSpoor2Selections(data.tp3_activities);
  const selectionById = new Map(selections.map((s) => [s.id, s]));

  const atoms: BasisAtom[] = [
    {
      id: 'spoor2-toel',
      kind: 'spoor2',
      title: TP_SPOOR2_TOELICHTING_TITLE,
      body: TP_SPOOR2_TOELICHTING_BODY,
      showMainBand: true,
      showSubsectionTitle: true,
    },
  ];

  for (const sub of TP_SPOOR2_SUBSECTIONS) {
    const sel = selectionById.get(sub.id);
    if (!sel) continue;
    atoms.push({
      id: `spoor2-${sub.id}`,
      kind: 'spoor2',
      title: sub.title,
      body: sub.body,
      showMainBand: false,
      showSubsectionTitle: true,
      subText: isSpoor2NotitieEligible(sub.id) ? (sel.subText ?? null) : null,
    });
  }

  return atoms;
}

function getProfielFieldFallback(
  fieldKey: TP2026ProfielWerknemerFieldKey,
  data: Record<string, any>
): string {
  if (fieldKey === 'advies_ad_passende_arbeid' && data.has_ad_report === false) {
    return 'N.B.: Tijdens het opstellen van dit trajectplan is er nog geen AD-rapport opgesteld.';
  }
  return '';
}

export function buildBasisBodyAtoms(data: Record<string, any>): BasisAtom[] {
  const atoms: BasisAtom[] = [];

  const sub = String(data.inleiding_sub || '').trim();
  const introSlices = chunkByParagraphs(String(data.inleiding ?? ''), 760);
  introSlices.forEach((slice, i) => {
    const isLast = i === introSlices.length - 1;
    atoms.push({
      id: `inl-${i}`,
      kind: 'inleiding',
      md: slice,
      showSectionTitle: i === 0,
      showToelichting: isLast && Boolean(sub),
      showAvgDisclaimer: false,
    });
  });

  const pushTextField = (key: string, title: string, value: unknown, fallback: string) => {
    const raw = String(value ?? '').trim();
    const fallbackTrim = String(fallback ?? '').trim();

    const baseText = raw || fallbackTrim;
    atoms.push({
      id: key,
      kind: 'text',
      key,
      title,
      md: baseText,
      showSectionTitle: true,
      variant: textVariant(key, baseText),
    });
  };

  pushTextField(
    'wk',
    'Wettelijke kaders en terminologie',
    data.wettelijke_kaders,
    WETTELIJKE_KADERS
  );
  atoms.push({
    id: 'profiel-banner',
    kind: 'groupBanner',
    title: 'Profiel werknemer',
    pageBreakBefore: true,
  });
  for (const fieldKey of TP2026_PROFIEL_WERKNEMER_FIELD_ORDER) {
    const meta = TP2026_PROFIEL_PREVIEW_META[fieldKey];

    if (fieldKey === 'pow_meter') {
      atoms.push(
        {
          id: 'pow-static',
          kind: 'text',
          key: 'pow-static',
          title: 'Perspectief op werk',
          md: '',
          showSectionTitle: true,
          variant: 'powStatic',
        },
        {
          id: 'pow-graphic',
          kind: 'text',
          key: 'pow-graphic',
          title: 'Grafische weergave POW-meter™',
          md: '',
          showSectionTitle: true,
          variant: 'powGraphic',
        },
        {
          id: 'pow-inschaling',
          kind: 'text',
          key: 'pow-inschaling',
          title: meta.title,
          md: String(data.pow_meter ?? '').trim(),
          showSectionTitle: true,
          variant: 'powInschaling',
        }
      );
      continue;
    }

    pushTextField(
      meta.previewKey,
      meta.title,
      data[fieldKey],
      getProfielFieldFallback(fieldKey, data)
    );
  }

  atoms.push(...buildSpoor2Atoms(data));
  atoms.push({ id: 'agree', kind: 'agreement' }, { id: 'sign', kind: 'signature' });

  return atoms;
}

function trySplitAtom(atoms: BasisAtom[], idx: number): BasisAtom[] | null {
  const atom = atoms[idx];
  if (!atom) return null;

  if (atom.kind === 'text') {
    if (
      atom.variant === 'powStatic' ||
      atom.variant === 'powGraphic' ||
      atom.variant === 'powInschaling'
    ) {
      return null;
    }
    const parts = splitTextAggressive(atom.md);
    if (!parts) return null;
    const [a, b] = parts;
    const nextVariantA = textVariant(atom.key, a);
    const nextVariantB = textVariant(atom.key, b);
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

  if (atom.kind === 'spoor2' && atom.body.trim()) {
    const parts = splitTextAggressive(atom.body);
    if (!parts) return null;
    const [a, b] = parts;
    return [
      ...atoms.slice(0, idx),
      {
        ...atom,
        id: `${atom.id}-a`,
        body: a,
        showSubsectionTitle: atom.showSubsectionTitle,
        showMainBand: atom.showMainBand,
        subText: undefined,
      },
      {
        ...atom,
        id: `${atom.id}-b`,
        body: b,
        showSubsectionTitle: false,
        showMainBand: false,
        subText: atom.subText,
      },
      ...atoms.slice(idx + 1),
    ];
  }

  return null;
}

function InleidingAtomPreview({
  data,
  atom,
}: {
  data: Record<string, any>;
  atom: Extract<BasisAtom, { kind: 'inleiding' }>;
}) {
  const sub = String(data.inleiding_sub || '').trim();

  return (
    <div>
      {atom.showSectionTitle ? <SectionBand title="Inleiding" /> : null}
      <div className={TP_BASIS_BODY_BOX_CLASS}>
        {String(atom.md || '').trim() ? (
          <Basis2026MarkdownBody markdown={String(atom.md)} />
        ) : atom.showSectionTitle ? (
          <span className="text-[12px] text-neutral-600">— nog niet ingevuld —</span>
        ) : null}
        {atom.showAvgDisclaimer ? (
          <p className="mt-3 text-[12px] font-semibold text-neutral-900">{NB_AVG_INLEIDING}</p>
        ) : null}
        {atom.showToelichting && sub ? (
          <div className="mt-4">
            <InleidingSubBlock text={sub} className="text-[12px] leading-relaxed text-neutral-900" />
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

  if (variant === 'powStatic') {
    return <PerspectiefOpWerkBlock />;
  }

  if (variant === 'powGraphic') {
    return (
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pow-meter-v2.png" alt="PoW-meter" className="mt-1 w-full h-auto" />
        <p className={`mt-4 ${TP_BASIS_DISCLAIMER_CLASS}`}>{POW_METER_FOOTNOTE}</p>
      </div>
    );
  }

  if (!trimmed) {
    return <span className="text-[12px] text-neutral-600">— nog niet ingevuld —</span>;
  }

  if (variant === 'adNb') {
    return <span className="text-[12px] font-bold text-neutral-900">{trimmed}</span>;
  }

  if (variant === 'adAdvies') {
    return <AdviesPassendeArbeidBlock text={trimmed} />;
  }

  if (variant === 'powInschaling') {
    return <PowInschalingTable raw={trimmed} />;
  }

  if (variant === 'pow') {
    return (
      <div>
        <div className="mb-4">
          <Basis2026MarkdownBody markdown={trimmed} />
        </div>
        <div className="my-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pow-meter-v2.png" alt="PoW-meter" className="mx-auto max-h-[200px] max-w-full" />
        </div>
        <p className={`mt-4 ${TP_BASIS_DISCLAIMER_CLASS}`}>{POW_METER_FOOTNOTE}</p>
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

  if (variant === 'belastbaarheid') {
    return <BelastbaarheidsprofielBlock text={trimmed} />;
  }

  if (variant === 'visieLa') {
    return <VisieLoopbaanadviseurBlock text={trimmed} />;
  }

  return <Basis2026MarkdownBody markdown={trimmed} />;
}

function TextAtomPreview({
  atom,
}: {
  atom: Extract<BasisAtom, { kind: 'text' }>;
}) {
  const toelichtingLabel = getBasisToelichtingLabel(atom.key);
  const bodyClass =
    atom.variant === 'powGraphic' ? 'text-neutral-900' : TP_BASIS_BODY_BOX_CLASS;

  return (
    <div>
      {atom.showSectionTitle ? <SectionBand title={atom.title} /> : null}
      <div className={bodyClass}>
        {toelichtingLabel ? <BasisToelichtingHeading label={toelichtingLabel} /> : null}
        <TextBlockBody variant={atom.variant} markdown={atom.md} fieldKey={atom.key} />
      </div>
    </div>
  );
}

function Spoor2AtomPreview({ atom }: { atom: Extract<BasisAtom, { kind: 'spoor2' }> }) {
  return (
    <Spoor2SubsectionUnit
      showMainBand={atom.showMainBand}
      showSubsectionTitle={atom.showSubsectionTitle}
      subsectionTitle={atom.title}
      body={atom.body}
      subText={atom.subText}
    />
  );
}

/** Collapse same-section pagination fragments on one page into a single visual block. */
function mergeSectionAtomsOnPage(atoms: BasisAtom[]): BasisAtom[] {
  const out: BasisAtom[] = [];

  for (const atom of atoms) {
    const prev = out[out.length - 1];

    if (
      prev &&
      atom.kind === 'spoor2' &&
      prev.kind === 'spoor2' &&
      prev.title === atom.title &&
      !atom.showSubsectionTitle
    ) {
      out[out.length - 1] = {
        ...prev,
        body: `${prev.body.trim()}\n\n${atom.body.trim()}`.trim(),
        subText: atom.subText ?? prev.subText,
      };
      continue;
    }

    if (
      prev &&
      atom.kind === 'text' &&
      prev.kind === 'text' &&
      prev.key === atom.key &&
      !atom.showSectionTitle
    ) {
      out[out.length - 1] = {
        ...prev,
        md: `${prev.md.trim()}\n\n${atom.md.trim()}`.trim(),
      };
      continue;
    }

    if (
      prev &&
      atom.kind === 'inleiding' &&
      prev.kind === 'inleiding' &&
      !atom.showSectionTitle
    ) {
      out[out.length - 1] = {
        ...prev,
        md: `${prev.md.trim()}\n\n${atom.md.trim()}`.trim(),
        showToelichting: atom.showToelichting || prev.showToelichting,
        showAvgDisclaimer: atom.showAvgDisclaimer || prev.showAvgDisclaimer,
      };
      continue;
    }

    out.push(atom);
  }

  return out;
}

function getBasisAtomMarginClass(atom: BasisAtom, prev: BasisAtom | undefined): string {
  if (atom.kind === 'groupBanner') {
    return prev ? 'mt-3' : '';
  }
  return getAtomMarginClass(atom, prev);
}

function renderBodyAtom(data: Record<string, any>, atom: BasisAtom): React.ReactNode {
  switch (atom.kind) {
    case 'inleiding':
      return <InleidingAtomPreview data={data} atom={atom} />;
    case 'text':
      return <TextAtomPreview atom={atom} />;
    case 'spoor2':
      return <Spoor2AtomPreview atom={atom} />;
    case 'groupBanner':
      return <PurpleSectionBar title={atom.title} className="mb-3" />;
    case 'agreement':
      return <BasisAgreementBlock />;
    case 'signature':
      return (
        <BasisSignatureBlock
          employeeName={`${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || 'Naam werknemer'}
          advisorName={data.consultant_name || 'Loopbaanadviseur'}
          employerContact={data.client_referent_name || 'Naam opdrachtgever'}
          employerFunction={data.client_referent_function || undefined}
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
  const displayAtoms = mergeSectionAtomsOnPage(atoms);

  return (
    <A4Page className={`${TP2026_A4_PAGE_CLASS} flex flex-col`}>
      <A4LogoHeader />
      <div
        data-basis-body
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {displayAtoms.map((atom, idx) => (
          <div
            key={`${atom.id}-${idx}`}
            className={getBasisAtomMarginClass(atom, idx > 0 ? displayAtoms[idx - 1] : undefined)}
          >
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

const BASIS_PRELOAD_IMG_SRC = ['/pow-meter-v2.png', '/val-logo.jpg'] as const;

function preloadImages(srcs: readonly string[]): Promise<void> {
  return Promise.all(
    srcs.map(
      (src) =>
        new Promise<void>((resolve) => {
          const i = new Image();
          i.onload = () => resolve();
          i.onerror = () => resolve();
          i.src = src;
        })
    )
  ).then(() => undefined);
}

type PackBasisPagesResult =
  | { ok: true; pages: number[][] }
  | { ok: false; reason: 'split_retry' }
  | { ok: false; reason: 'unsplittable'; atomIndex: number };

/** True when the basis body column content fits without vertical overflow (same shell as visible pages). */
function doesBasisPageFitDom(
  data: Record<string, any>,
  bodyAtoms: BasisAtom[],
  atomIndices: number[]
): boolean {
  if (atomIndices.length === 0) return true;

  const mount = document.createElement('div');
  mount.setAttribute('aria-hidden', 'true');
  mount.style.cssText =
    'position:fixed;left:-12000px;top:0;width:794px;max-width:794px;pointer-events:none;visibility:hidden;z-index:-9999;';
  document.body.appendChild(mount);

  const root = createRoot(mount);
  const atoms = atomIndices.map((i) => bodyAtoms[i]).filter(Boolean);

  try {
    flushSync(() => {
      root.render(<BasisBodyPage data={data} atoms={atoms} pageNumber={1} />);
    });
    const bodyEl = mount.querySelector('[data-basis-body]') as HTMLElement | null;
    if (!bodyEl) return true;
    const room = 4;
    return bodyEl.scrollHeight <= bodyEl.clientHeight + room;
  } finally {
    root.unmount();
    mount.remove();
  }
}

/**
 * Packs atom indices into pages using the real DOM (same BasisBodyPage layout as preview).
 * Sum-of-block-heights was unreliable (margins, flex); this matches what users see.
 */
function packPagesWithDomMeasure(
  data: Record<string, any>,
  bodyAtoms: BasisAtom[],
  onNeedSplit: (atomIndex: number) => boolean
): PackBasisPagesResult {
  const n = bodyAtoms.length;
  if (n === 0) return { ok: true, pages: [] };

  for (let i = 0; i < n; i++) {
    if (!doesBasisPageFitDom(data, bodyAtoms, [i])) {
      if (onNeedSplit(i)) return { ok: false, reason: 'split_retry' };
      return { ok: false, reason: 'unsplittable', atomIndex: i };
    }
  }

  const pages: number[][] = [];
  let current: number[] = [];

  for (let i = 0; i < n; i++) {
    const atom = bodyAtoms[i];
    if (
      atom?.kind === 'groupBanner' &&
      atom.pageBreakBefore &&
      current.length > 0
    ) {
      pages.push(current);
      current = [];
    }

    const trial = [...current, i];
    if (doesBasisPageFitDom(data, bodyAtoms, trial)) {
      current = trial;
    } else {
      if (current.length) pages.push(current);
      current = [i];
      if (!doesBasisPageFitDom(data, bodyAtoms, [i])) {
        if (onNeedSplit(i)) return { ok: false, reason: 'split_retry' };
        return { ok: false, reason: 'unsplittable', atomIndex: i };
      }
    }
  }
  if (current.length) pages.push(current);
  return { ok: true, pages };
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
  const { getSectionStartPage, setSectionPageCount } = useTP2026PageNumber();
  const baseline = useMemo(() => buildBasisBodyAtoms(data), [data]);
  const [bodyAtoms, setBodyAtoms] = useState<BasisAtom[]>(baseline);
  const [bodyPages, setBodyPages] = useState<number[][]>([]);
  const [isPaginating, setIsPaginating] = useState(true);
  const readySentRef = useRef(false);

  useEffect(() => {
    setBodyAtoms(baseline);
    setBodyPages([]);
    setIsPaginating(true);
    readySentRef.current = false;
  }, [baseline]);

  const emitReady = useCallback(() => {
    if (readySentRef.current) return;
    readySentRef.current = true;
    setIsPaginating(false);
    onPaginationReady?.();
  }, [onPaginationReady]);

  const measureAndPaginate = useCallback(async () => {
    if (typeof document === 'undefined') return;

    const fontsApi = document.fonts;
    if (fontsApi) {
      await fontsApi.ready;
    }
    await preloadImages(BASIS_PRELOAD_IMG_SRC);
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    const result = packPagesWithDomMeasure(data, bodyAtoms, (idx) => {
      const split = trySplitAtom(bodyAtoms, idx);
      if (split) {
        setBodyAtoms(split);
        return true;
      }
      return false;
    });

    if (!result.ok && result.reason === 'split_retry') {
      return;
    }

    if (!result.ok && result.reason === 'unsplittable') {
      console.warn(
        `Basis2026A4Pages: atom ${result.atomIndex} does not fit on one page and could not be split; using one atom per page.`
      );
      setBodyPages(bodyAtoms.map((_, i) => [i]));
      emitReady();
      return;
    }

    const packed = result.pages;
    setBodyPages(packed.length ? packed : bodyAtoms.map((_, i) => [i]));
    emitReady();
  }, [bodyAtoms, data, emitReady]);

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

  const pages = bodyPages;
  const basisStartPage = getSectionStartPage('basis');

  useEffect(() => {
    if (!isPaginating) {
      setSectionPageCount('basis', 1 + bodyPages.length);
    }
  }, [isPaginating, bodyPages.length, setSectionPageCount]);

  if (isPaginating) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Pagineren...</p>
      </div>
    );
  }

  return (
    <>
      {wrap(
        <Basis2026InhoudsopgavePage data={data} pageNumber={basisStartPage} />,
        'basis-inhoud'
      )}
      {pages.map((idxs, pi) =>
        wrap(
          <BasisBodyPage
            data={data}
            atoms={idxs.map((i) => bodyAtoms[i]).filter(Boolean)}
            pageNumber={basisStartPage + 1 + pi}
          />,
          `basis-body-${pi}`
        )
      )}
    </>
  );
}
