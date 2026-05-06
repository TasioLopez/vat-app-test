'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import { TP2026BasisFields, formatNLDate } from '@/lib/tp2026/schema';
import { TP2026_BASIS_AUTOFILL_ENDPOINTS } from '@/lib/tp2026/basis-autofill-endpoints';
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';
import { BasisAgreementBlock, BasisSignatureBlock } from '@/components/tp2026/BasisAgreementSignature';
import { A4LogoHeader, A4Page, FooterIdentity, SectionBand, TP2026_A4_PAGE_CLASS } from '@/components/tp2026/primitives';
import FieldControl from '@/components/tp2026/FieldControl';

const Basis2026MarkdownFieldEditor = dynamic(
  () =>
    import('@/components/tp2026/Basis2026MarkdownFieldEditor').then((m) => m.Basis2026MarkdownFieldEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[220px] rounded-md border border-dashed border-[#b8985c]/50 bg-muted/40" aria-hidden />
    ),
  }
);
import { InleidingSubBlock } from '@/components/tp/InleidingSubBlock';
import { WETTELIJKE_KADERS } from '@/lib/tp/static';
import { TP_BASIS_TP_ACTIVITIES_INTRO } from '@/lib/tp2026/basis-document-agreement';
import TP_ACTIVITIES, { getBodyMain, normalizeTp3Activities } from '@/lib/tp/tp_activities';

const INLEIDING_SUB_DELIM = 'staat het volgende:';

const boxClass = 'border border-[#b8985c] bg-[#f5efe6] p-3 text-neutral-900';

const NB_AVG_INLEIDING =
  'NB: in het kader van de AVG worden in deze rapportage geen medische termen en diagnoses vermeld.';

type PreviewRow =
  | { t: 'inleiding' }
  | { t: 'text'; key: string; title: string; text: string }
  | { t: 'activity'; key: string; title: string; body: string; subText?: string | null }
  | { t: 'agreement' }
  | { t: 'signature' };

function rowCost(row: PreviewRow, data: Record<string, any>): number {
  switch (row.t) {
    case 'inleiding':
      return Math.ceil(
        (String(data.inleiding || '').length + String(data.inleiding_sub || '').length) * 1.15 + 900
      );
    case 'text':
      return Math.ceil(row.title.length + row.text.length * 1.25 + 420);
    case 'activity':
      return Math.ceil(row.title.length + row.body.length * 1.15 + (row.subText?.length || 0) + 420);
    case 'agreement':
      return 3800;
    case 'signature':
      return 1600;
    default:
      return 200;
  }
}

function splitRowsIntoPages(
  rows: PreviewRow[],
  data: Record<string, any>,
  maxBlocksPerPage = 2,
  maxCharsSoft = 3800
): PreviewRow[][] {
  const pages: PreviewRow[][] = [];
  let cur: PreviewRow[] = [];
  let used = 0;

  for (const row of rows) {
    const cost = rowCost(row, data);
    if (cur.length > 0 && (cur.length >= maxBlocksPerPage || used + cost > maxCharsSoft)) {
      pages.push(cur);
      cur = [];
      used = 0;
    }
    cur.push(row);
    used += cost;
  }
  if (cur.length > 0) pages.push(cur);
  return pages;
}

function buildActivityRows(data: Record<string, any>): PreviewRow[] {
  const raw = (data as { tp3_activities?: unknown }).tp3_activities;
  const selections = normalizeTp3Activities(raw);
  const rows: PreviewRow[] = [];
  if (!selections.length) return rows;

  rows.push({
    t: 'text',
    key: 'acts-intro',
    title: 'Trajectdoel en in te zetten activiteiten',
    text: TP_BASIS_TP_ACTIVITIES_INTRO,
  });

  for (const sel of selections) {
    const activity = TP_ACTIVITIES.find((a) => a.id === sel.id);
    if (!activity) continue;
    rows.push({
      t: 'activity',
      key: `act-${activity.id}`,
      title: activity.title,
      body: getBodyMain(activity),
      subText: sel.subText ?? null,
    });
  }
  return rows;
}

function buildAllPreviewRows(data: Record<string, any>): PreviewRow[] {
  const rows: PreviewRow[] = [{ t: 'inleiding' }];

  rows.push({
    t: 'text',
    key: 'wk',
    title: 'Wettelijke kaders en terminologie',
    text: String(data.wettelijke_kaders || '').trim() || WETTELIJKE_KADERS,
  });

  rows.push(
    {
      t: 'text',
      key: 'soc',
      title: 'Sociale achtergrond & maatschappelijke context',
      text: data.sociale_achtergrond || '',
    },
    {
      t: 'text',
      key: 'visw',
      title: 'Visie van werknemer',
      text: data.visie_werknemer || '',
    },
    {
      t: 'text',
      key: 'vlb',
      title: 'Visie van loopbaanadviseur',
      text: data.visie_loopbaanadviseur || '',
    },
    {
      t: 'text',
      key: 'prog',
      title: 'Prognose van de bedrijfsarts',
      text: data.prognose_bedrijfsarts || '',
    },
    {
      t: 'text',
      key: 'prof',
      title: 'Persoonlijk profiel',
      text: data.persoonlijk_profiel || '',
    },
    {
      t: 'text',
      key: 'zp',
      title: 'Zoekprofiel',
      text: data.zoekprofiel || '',
    },
    {
      t: 'text',
      key: 'blem',
      title: 'Praktische belemmeringen',
      text: data.praktische_belemmeringen || '',
    },
    {
      t: 'text',
      key: 'ad',
      title: 'In het arbeidsdeskundigrapport staat het volgende advies over passende arbeid',
      text:
        data.advies_ad_passende_arbeid ||
        (data.has_ad_report === false
          ? 'N.B.: Tijdens het opstellen van dit trajectplan is er nog geen AD-rapport opgesteld.'
          : ''),
    },
    {
      t: 'text',
      key: 'pow',
      title: 'Perspectief op Werk (PoW-meter)',
      text: data.pow_meter || '',
    },
    {
      t: 'text',
      key: 'plaats',
      title: 'Visie op plaatsbaarheid',
      text: data.visie_plaatsbaarheid || '',
    }
  );

  rows.push(...buildActivityRows(data));
  rows.push({ t: 'agreement' }, { t: 'signature' });
  return rows;
}

function InleidingPreview({ data }: { data: Record<string, any> }) {
  const sub = String(data.inleiding_sub || '').trim();
  const showNb = !sub && data.has_ad_report === false;
  const useDelimiterBlock = sub.includes(INLEIDING_SUB_DELIM);

  return (
    <div className="mb-3">
      <SectionBand title="Inleiding" />
      <div className={boxClass}>
        {String(data.inleiding || '').trim() ? (
          <Basis2026MarkdownBody markdown={String(data.inleiding)} />
        ) : (
          <span className="text-[12px] text-neutral-600">— nog niet ingevuld —</span>
        )}
        {showNb && <p className="mt-4 text-[12px] font-semibold text-neutral-900">{NB_AVG_INLEIDING}</p>}
        {sub ? (
          <div className="mt-5 border-t border-[#b8985c]/50 pt-4">
            <h3 className="mb-2 text-[12px] font-bold text-green-800">Toelichting</h3>
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

function TextBlockPreview({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-3 mt-4">
      <SectionBand title={title} />
      <div className={boxClass}>
        {String(text || '').trim() ? (
          <Basis2026MarkdownBody markdown={String(text)} />
        ) : (
          <span className="text-[12px] text-neutral-600">— nog niet ingevuld —</span>
        )}
      </div>
    </div>
  );
}

function ActivityBlockPreview({
  title,
  body,
  subText,
}: {
  title: string;
  body: string;
  subText?: string | null;
}) {
  const hasSub = typeof subText === 'string' && subText.trim().length > 0;
  return (
    <div className="mb-3 mt-4">
      <SectionBand title={title} />
      <div className={boxClass}>
        <div className="text-[12px] leading-relaxed">
          {String(body || '').trim() ? <Basis2026MarkdownBody markdown={String(body)} /> : <span className="text-neutral-600">—</span>}
          {hasSub ? (
            <div className="mt-3 flex items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/val-logo.jpg" alt="" width={14} height={14} className="mt-1 shrink-0" />
              <span>{subText!.trim()}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BasisPage({
  data,
  rows,
  pageNumber,
}: {
  data: Record<string, any>;
  rows: PreviewRow[];
  pageNumber: number;
}) {
  return (
    <A4Page className={TP2026_A4_PAGE_CLASS}>
      <A4LogoHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {rows.map((row, idx) => {
          const top = idx > 0 && row.t !== 'inleiding';
          const wrapClass = top && row.t === 'text' ? 'mt-4' : top ? 'mt-4' : '';
          return (
            <div key={`${row.t}-${row.t === 'text' || row.t === 'activity' ? row.key : row.t}-${idx}`} className={wrapClass}>
              {row.t === 'inleiding' ? <InleidingPreview data={data} /> : null}
              {row.t === 'text' ? <TextBlockPreview title={row.title} text={row.text} /> : null}
              {row.t === 'activity' ? (
                <ActivityBlockPreview title={row.title} body={row.body} subText={row.subText} />
              ) : null}
              {row.t === 'agreement' ? <BasisAgreementBlock /> : null}
              {row.t === 'signature' ? (
                <BasisSignatureBlock
                  employeeName={
                    `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || 'Naam werknemer'
                  }
                  advisorName={data.consultant_name || 'Loopbaanadviseur'}
                  employerContact={data.client_referent_name || 'Naam opdrachtgever'}
                  employerFunctionCompany={
                    [data.client_referent_function, data.client_name].filter(Boolean).join(', ') || undefined
                  }
                />
              ) : null}
            </div>
          );
        })}
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

export function Basis2026Editor({
  data,
  updateField,
  onAutofillField,
}: {
  data: Record<string, any>;
  updateField: (key: string, value: any) => void;
  onAutofillField?: (fieldKey: string) => Promise<void>;
}) {
  return (
    <div className="space-y-5">
      {TP2026BasisFields.map((field: TP2026FieldDef) => (
        <BasisFieldEditorRow
          key={field.key}
          field={field}
          data={data}
          updateField={updateField}
          onAutofillField={onAutofillField}
        />
      ))}
    </div>
  );
}

function BasisFieldEditorRow({
  field,
  data,
  updateField,
  onAutofillField,
}: {
  field: TP2026FieldDef;
  data: Record<string, any>;
  updateField: (key: string, value: any) => void;
  onAutofillField?: (fieldKey: string) => Promise<void>;
}) {
  const canAutofill = Boolean(onAutofillField && TP2026_BASIS_AUTOFILL_ENDPOINTS[field.key]);

  if (field.type !== 'multiline') {
    return <FieldControl field={field} value={data[field.key]} onChange={(v) => updateField(field.key, v)} />;
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-foreground">{field.label}</label>
        {canAutofill ? (
          <button
            type="button"
            className="text-xs font-medium text-[#6d2a96] underline underline-offset-2 hover:no-underline"
            onClick={() => void onAutofillField!(field.key)}
          >
            Autofill
          </button>
        ) : null}
      </div>
      <Basis2026MarkdownFieldEditor
        markdown={String(data[field.key] ?? '')}
        onChange={(md) => updateField(field.key, md)}
        placeholder={field.placeholder}
      />
    </div>
  );
}

export function Basis2026A4Pages({
  data,
  printMode = false,
}: {
  data: Record<string, any>;
  printMode?: boolean;
}) {
  const allRows = useMemo(() => buildAllPreviewRows(data), [data]);
  const pages = useMemo(() => splitRowsIntoPages(allRows, data, 2, 3000), [allRows, data]);

  return (
    <>
      {pages.map((rows, idx) =>
        printMode ? (
          <section className="print-page" key={idx}>
            <BasisPage data={data} rows={rows} pageNumber={idx + 1} />
          </section>
        ) : (
          <div key={idx}>
            <BasisPage data={data} rows={rows} pageNumber={idx + 1} />
          </div>
        )
      )}
    </>
  );
}
