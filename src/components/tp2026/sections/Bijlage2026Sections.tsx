'use client';

import { A4LogoHeader, A4Page, FooterIdentity, TP2026_A4_PAGE_CLASS } from '@/components/tp2026/primitives';
import type {
  TP2026Bijlage1Activity,
  TP2026Bijlage1Phase,
  TP2026Bijlage2Model,
  TP2026Bijlage2PowTrede,
  TP2026Bijlage3Decision,
} from '@/lib/tp2026/schema';
import { BIJLAGE2_FOOTNOTES, BIJLAGE2_SECTION_BASIS } from '@/lib/tp2026/bijlage2-official';
import { BIJLAGE3_PAGE2, BIJLAGE3_TABLE_HEADERS } from '@/lib/tp2026/bijlage3-official';
import { formatNLDate } from '@/lib/tp2026/schema';
import { useMemo, useState, type ReactElement } from 'react';
import { Button } from '@/components/ui/button';

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className="w-full border border-border rounded px-2 py-1 text-sm"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

const STATUS_OPTIONS: TP2026Bijlage1Activity['status'][] = ['G', 'P', 'N', 'U'];
const ACTIVITY_LIBRARY = [
  'Verwerking verlies en acceptatie',
  'Empowerment',
  'Webinars',
  'Kwaliteiten en vaardigheden onderzoek',
  'Beroeps-en arbeidsmarktoriëntatie',
  'Scholingsmogelijkheden onderzoeken',
  'Sollicitatietools (brief en cv)',
  'Voortgangsrapportage en evaluatie',
  'Sollicitatievaardigheden vervolg (gesprek)',
  'Netwerken',
  'Solliciteren en/of netwerken via Social Media',
  'Vacatures zoeken en beoordeling',
  'Wekelijks solliciteren',
  'Activering/ werkervaringsplaats',
  'Wekelijks solliciteren vervolg',
  'Sollicitatiegesprek voorbereiden en presenteren',
  'Jobhunten',
  'Detachering onderzoeken',
  'Webinar, gericht op WIA-aanvraag',
  'Begeleiding WIA',
  'Voortgangsrapportage en eindevaluatie',
] as const;

const addMonths = (date: Date, months: number): Date => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const toISODate = (d: Date): string => d.toISOString().split('T')[0];

function normalizePhase(phase: TP2026Bijlage1Phase, index: number): TP2026Bijlage1Phase {
  return {
    title: String(phase?.title || `Planning fase ${index + 1}`),
    period_from: String(phase?.period_from || ''),
    period_to: String(phase?.period_to || ''),
    activities: Array.isArray(phase?.activities)
      ? phase.activities
          .filter((activity) => activity && typeof activity.name === 'string')
          .map((activity) => ({
            name: activity.name,
            status: STATUS_OPTIONS.includes(activity.status) ? activity.status : 'P',
          }))
      : [],
  };
}

function createTemplates(startDate: string, endDate: string): Record<'2-fases' | '3-fases', TP2026Bijlage1Phase[]> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const phase1End = addMonths(start, 3);
  const phase2Start = phase1End;
  const phase2End = addMonths(phase2Start, 3);

  return {
    '3-fases': [
      {
        title: 'Oriëntatie',
        period_from: toISODate(start),
        period_to: toISODate(phase1End),
        activities: [
          'Verwerking verlies en acceptatie',
          'Empowerment',
          'Webinars',
          'Kwaliteiten en vaardigheden onderzoek',
          'Beroeps-en arbeidsmarktoriëntatie',
          'Scholingsmogelijkheden onderzoeken',
          'Sollicitatietools (brief en cv)',
          'Voortgangsrapportage en evaluatie',
        ].map((name) => ({ name, status: 'P' as const })),
      },
      {
        title: 'Activering',
        period_from: toISODate(phase2Start),
        period_to: toISODate(phase2End),
        activities: [
          'Sollicitatievaardigheden vervolg (gesprek)',
          'Netwerken',
          'Webinars',
          'Solliciteren en/of netwerken via Social Media',
          'Vacatures zoeken en beoordeling',
          'Wekelijks solliciteren',
          'Activering/ werkervaringsplaats',
          'Voortgangsrapportage en evaluatie',
        ].map((name) => ({ name, status: 'P' as const })),
      },
      {
        title: 'Betaald werk',
        period_from: toISODate(phase2End),
        period_to: toISODate(end),
        activities: [
          'Wekelijks solliciteren vervolg',
          'Sollicitatiegesprek voorbereiden en presenteren',
          'Jobhunten',
          'Detachering onderzoeken',
          'Webinar, gericht op WIA-aanvraag',
          'Begeleiding WIA',
          'Voortgangsrapportage en eindevaluatie',
        ].map((name) => ({ name, status: 'P' as const })),
      },
    ],
    '2-fases': [
      {
        title: 'Oriëntatie',
        period_from: toISODate(start),
        period_to: toISODate(phase1End),
        activities: [
          'Verwerking verlies en acceptatie',
          'Empowerment',
          'Webinars',
          'Kwaliteiten en vaardigheden onderzoek',
          'Beroeps-en arbeidsmarktoriëntatie',
          'Scholingsmogelijkheden onderzoeken',
          'Sollicitatietools (brief en cv)',
          'Voortgangsrapportage en evaluatie',
        ].map((name) => ({ name, status: 'P' as const })),
      },
      {
        title: 'Activering/betaald werk',
        period_from: toISODate(phase1End),
        period_to: toISODate(end),
        activities: [
          'Sollicitatievaardigheden vervolg (gesprek)',
          'Netwerken',
          'Webinars',
          'Solliciteren en/of netwerken via Social Media',
          'Vacatures zoeken en beoordeling',
          'Wekelijks solliciteren',
          'Activering/ werkervaringsplaats',
          'Wekelijks solliciteren vervolg',
          'Sollicitatiegesprek voorbereiden en presenteren',
          'Jobhunten',
          'Detachering onderzoeken',
          'Webinar, gericht op WIA-aanvraag',
          'Begeleiding WIA',
          'Voortgangsrapportage en eindevaluatie',
        ].map((name) => ({ name, status: 'P' as const })),
      },
    ],
  };
}

export function Bijlage1Editor({
  phases,
  setPhases,
  planStartDate,
  planEndDate,
}: {
  phases: TP2026Bijlage1Phase[];
  setPhases: (next: TP2026Bijlage1Phase[]) => void;
  planStartDate?: string;
  planEndDate?: string;
}) {
  const [activePhaseIdx, setActivePhaseIdx] = useState(0);
  const normalized = useMemo(() => phases.map((phase, index) => normalizePhase(phase, index)), [phases]);
  const usedActivityNames = useMemo(
    () => new Set(normalized.flatMap((phase) => phase.activities.map((activity) => activity.name))),
    [normalized]
  );
  const unassigned = useMemo(
    () => ACTIVITY_LIBRARY.filter((activity) => !usedActivityNames.has(activity)),
    [usedActivityNames]
  );

  const updatePhase = (idx: number, updater: (prev: TP2026Bijlage1Phase) => TP2026Bijlage1Phase) => {
    setPhases(normalized.map((phase, i) => (i === idx ? updater(phase) : phase)));
  };

  const applyTemplate = (templateKey: '2-fases' | '3-fases') => {
    if (!planStartDate || !planEndDate) return;
    setPhases(createTemplates(planStartDate, planEndDate)[templateKey]);
    setActivePhaseIdx(0);
  };

  const addPhase = () => {
    setPhases([
      ...normalized,
      {
        title: `Planning fase ${normalized.length + 1}`,
        period_from: '',
        period_to: '',
        activities: [],
      },
    ]);
  };

  const removePhase = (index: number) => {
    const next = normalized.filter((_, phaseIdx) => phaseIdx !== index);
    setPhases(next.length > 0 ? next : [{ title: '', period_from: '', period_to: '', activities: [] }]);
    setActivePhaseIdx((current) => Math.max(0, Math.min(current, next.length - 1)));
  };

  const addActivityToActivePhase = (activityName: string) => {
    if (!normalized[activePhaseIdx]) return;
    updatePhase(activePhaseIdx, (phase) => ({
      ...phase,
      activities: [...phase.activities, { name: activityName, status: 'P' }],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/20 p-3">
        <div className="mb-2 text-sm font-semibold">Templates</div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => applyTemplate('3-fases')}
            disabled={!planStartDate || !planEndDate}
          >
            3 fases (legacy)
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => applyTemplate('2-fases')}
            disabled={!planStartDate || !planEndDate}
          >
            2 fases (legacy)
          </Button>
          <Button type="button" size="sm" onClick={addPhase}>
            Fase toevoegen
          </Button>
        </div>
        {!planStartDate || !planEndDate ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Vul start- en einddatum in bij Gegevens om templates automatisch te vullen.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md border border-border p-3">
          <div className="mb-2 text-sm font-semibold">Beschikbare activiteiten</div>
          <div className="max-h-[520px] space-y-1 overflow-y-auto pr-1">
            {unassigned.length === 0 ? (
              <p className="text-xs text-muted-foreground">Alle activiteiten zijn toegewezen.</p>
            ) : null}
            {unassigned.map((activity) => (
              <button
                type="button"
                key={activity}
                className="w-full rounded border bg-white px-2 py-1 text-left text-xs hover:bg-muted"
                onClick={() => addActivityToActivePhase(activity)}
              >
                {activity}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {normalized.map((phase, phaseIdx) => (
            <div
              key={phaseIdx}
              className={`rounded-md border p-3 ${activePhaseIdx === phaseIdx ? 'border-[#6d2a96]' : 'border-border'}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  className="text-sm font-semibold text-left"
                  onClick={() => setActivePhaseIdx(phaseIdx)}
                >
                  Planning fase {phaseIdx + 1}
                </button>
                <Button type="button" variant="ghost" size="sm" onClick={() => removePhase(phaseIdx)}>
                  Verwijder
                </Button>
              </div>
              <div className="space-y-2">
                <TextInput
                  value={phase.title}
                  onChange={(v) => updatePhase(phaseIdx, (p) => ({ ...p, title: v }))}
                  placeholder="Doel"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="w-full border border-border rounded px-2 py-1 text-sm"
                    value={phase.period_from || ''}
                    onChange={(e) => updatePhase(phaseIdx, (p) => ({ ...p, period_from: e.target.value }))}
                  />
                  <input
                    type="date"
                    className="w-full border border-border rounded px-2 py-1 text-sm"
                    value={phase.period_to || ''}
                    onChange={(e) => updatePhase(phaseIdx, (p) => ({ ...p, period_to: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {phase.activities.map((activity, actIdx) => (
                  <div key={`${phaseIdx}-${actIdx}`} className="grid grid-cols-[1fr_70px_56px] gap-2">
                    <TextInput
                      value={activity.name}
                      onChange={(v) =>
                        updatePhase(phaseIdx, (p) => ({
                          ...p,
                          activities: p.activities.map((row, rowIdx) =>
                            rowIdx === actIdx ? { ...row, name: v } : row
                          ),
                        }))
                      }
                    />
                    <select
                      className="border border-border rounded px-2 py-1 text-sm"
                      value={activity.status}
                      onChange={(e) =>
                        updatePhase(phaseIdx, (p) => ({
                          ...p,
                          activities: p.activities.map((row, rowIdx) =>
                            rowIdx === actIdx ? { ...row, status: e.target.value as TP2026Bijlage1Activity['status'] } : row
                          ),
                        }))
                      }
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updatePhase(phaseIdx, (p) => ({
                          ...p,
                          activities: p.activities.filter((_, rowIdx) => rowIdx !== actIdx),
                        }))
                      }
                    >
                      X
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Left-column label cells (Doel / Periode / Activiteiten) — Word template orange tint */
const BIJLAGE1_LABEL_ORANGE = 'bg-[#fcd8b8]';

export function Bijlage1A4Pages({
  data,
  phases,
  printMode = false,
}: {
  data: Record<string, any>;
  phases: TP2026Bijlage1Phase[];
  printMode?: boolean;
}) {
  const normalized = phases.map((phase, index) => normalizePhase(phase, index));
  const renderPeriodeText = (phase: TP2026Bijlage1Phase, idx: number) =>
    `van datum ${formatNLDate(phase.period_from)} - einddatum fase ${idx === 0 ? '1' : idx === 1 ? '2' : idx} (duur 3 maanden)`;

  const page = (
    <A4Page className={`${TP2026_A4_PAGE_CLASS} flex min-h-0 flex-col overflow-hidden`}>
      {/* Scroll main body; footer stays pinned to bottom of A4 (avoids clipped fase 3 + stray gap). */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <A4LogoHeader />
        <div className="mb-2 shrink-0">
          {/* Google Doc: "Bijlage 1" 11 pt; subtitle "Voortgang en planning" 10 pt (smaller). */}
          <div className="text-[11pt] leading-tight font-bold tracking-tight text-[#d4694a]">Bijlage 1</div>
          <div className="mt-0.5 text-[10pt] leading-tight font-bold tracking-tight text-[#2d8f82]">
            Voortgang en planning
          </div>
        </div>
        <div className="shrink-0 space-y-1.5 text-[10pt] leading-snug text-neutral-900">
          {normalized.map((phase, idx) => (
            <table key={idx} className="w-full border border-[#b8985c] border-collapse table-fixed bg-white">
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '68%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td colSpan={2} className="border border-[#b8985c] !bg-white px-2 py-0.5 text-[#6d2a96] font-bold">
                    Planning fase {idx + 1}
                  </td>
                  <td className="border border-[#b8985c] !bg-white px-2 py-0.5 text-[#6d2a96] font-bold text-center">
                    Status
                  </td>
                </tr>
                <tr>
                  <td
                    className={`border border-[#b8985c] px-2 py-0.5 text-[#6d2a96] font-bold align-top ${BIJLAGE1_LABEL_ORANGE}`}
                  >
                    Doel
                  </td>
                  <td className="border border-[#b8985c] !bg-white px-2 py-0.5 text-[#6d2a96] align-top" colSpan={2}>
                    {phase.title || '—'}
                  </td>
                </tr>
                <tr>
                  <td
                    className={`border border-[#b8985c] px-2 py-0.5 text-[#6d2a96] font-bold align-top ${BIJLAGE1_LABEL_ORANGE}`}
                  >
                    Periode
                  </td>
                  <td className="border border-[#b8985c] !bg-white px-2 py-0.5 align-top text-neutral-900" colSpan={2}>
                    {renderPeriodeText(phase, idx)}
                  </td>
                </tr>
                {(phase.activities.length ? phase.activities : [{ name: '—', status: 'P' as const }]).map(
                  (activity, rowIdx, rows) => (
                    <tr key={`${idx}-${rowIdx}`}>
                      {rowIdx === 0 ? (
                        <td
                          rowSpan={rows.length}
                          className={`border border-[#b8985c] px-2 py-0.5 text-[#6d2a96] font-bold align-top ${BIJLAGE1_LABEL_ORANGE}`}
                        >
                          Activiteiten
                        </td>
                      ) : null}
                      <td className="border border-[#b8985c] !bg-white px-2 py-0.5 align-top text-neutral-900">
                        {activity.name}
                      </td>
                      <td className="border border-[#b8985c] !bg-white px-2 py-0.5 text-center align-top text-neutral-900">
                        {activity.status}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          ))}
        </div>
        <p className="mt-1.5 shrink-0 pb-1 text-[10pt] italic text-neutral-700">
          Legenda: G gedaan / P gepland / N niet gedaan / U in uitvoering
        </p>
      </div>
      <FooterIdentity
        lastName={data.last_name}
        firstName={data.first_name}
        dateOfBirth={formatNLDate(data.date_of_birth)}
        pageNumber={1}
      />
    </A4Page>
  );
  return printMode ? <section className="print-page">{page}</section> : page;
}

const BIJLAGE2_CHECKLIST_GROUPS = ['willen', 'weten', 'kunnen', 'doen'] as const;

export function Bijlage2Editor({
  model,
  setModel,
}: {
  model: TP2026Bijlage2Model;
  setModel: (next: TP2026Bijlage2Model) => void;
}) {
  const sortedPow = useMemo(
    () => [...model.powTredes].sort((a, b) => a.trede - b.trede),
    [model.powTredes]
  );

  const updateChecklist = (group: (typeof BIJLAGE2_CHECKLIST_GROUPS)[number], idx: number, checked: boolean) => {
    setModel({
      ...model,
      [group]: model[group].map((r, i) => (i === idx ? { ...r, checked } : r)),
    });
  };

  const updatePowCriterion = (trede: number, critIdx: number, checked: boolean) => {
    setModel({
      ...model,
      powTredes: model.powTredes.map((t) =>
        t.trede === trede
          ? { ...t, criteria: t.criteria.map((c, i) => (i === critIdx ? { ...c, checked } : c)) }
          : t
      ),
    });
  };

  return (
    <div className="space-y-4">
      {BIJLAGE2_CHECKLIST_GROUPS.map((group) => (
        <div key={group} className="border border-border rounded-md p-3">
          <h4 className="font-semibold capitalize mb-2 text-[#6d2a96]">{group}</h4>
          <div className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
            {model[group].map((row, idx) => (
              <label key={idx} className="flex items-start gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 shrink-0"
                  checked={row.checked}
                  onChange={(e) => updateChecklist(group, idx, e.target.checked)}
                />
                <span>{row.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="border border-border rounded-md p-3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="font-semibold text-[#6d2a96]">Activeringsinterventies</h4>
          <span className="text-sm font-semibold text-[#6d2a96]">POW-meter™</span>
        </div>
        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {sortedPow.map((t) => (
            <details
              key={t.trede}
              className="rounded border border-border bg-muted/15 open:bg-white"
              open={t.trede <= 2}
            >
              <summary className="cursor-pointer px-2 py-1.5 text-sm font-semibold text-[#6d2a96]">
                Trede {t.trede}
              </summary>
              <div className="space-y-1 px-2 pb-2">
                <p className="text-xs text-muted-foreground">
                  Trede {t.trede} is succesvol afgerond wanneer:
                </p>
                {t.criteria.map((c, i) => (
                  <label key={i} className="flex items-start gap-2 py-0.5 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 shrink-0"
                      checked={c.checked}
                      onChange={(e) => updatePowCriterion(t.trede, i, e.target.checked)}
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </details>
          ))}
        </div>
        <p className="mt-3 text-xs italic text-muted-foreground">{BIJLAGE2_FOOTNOTES[0]}</p>
        <p className="text-xs italic text-muted-foreground">{BIJLAGE2_FOOTNOTES[1]}</p>
      </div>
    </div>
  );
}

const BIJLAGE2_TREDE_BADGE: Record<number, string> = {
  1: 'bg-[#ebe1cf] text-[#3d2f1f]',
  2: 'bg-[#c8e6c9] text-[#1b3d1c]',
  3: 'bg-[#a8d5cf] text-[#0d3d38]',
  4: 'bg-[#e6d5a8] text-[#4a3d12]',
  5: 'bg-[#e8b89a] text-[#4a2612]',
  6: 'bg-[#7d5a96] text-white',
};

function Bijlage2TitleBlock() {
  return (
    <div className="mb-2 shrink-0">
      <div className="text-[10pt] leading-tight font-bold tracking-tight text-[#d4694a]">Bijlage 2</div>
      <div className="mt-0.5 text-[10pt] leading-tight font-bold tracking-tight text-[#2d8f82]">
        ValentineZ leernavigator
      </div>
      <div className="mt-2 text-[10pt] font-bold leading-tight text-[#6d2a96]">{BIJLAGE2_SECTION_BASIS}</div>
    </div>
  );
}

/** One body row, four cells — each cell lists the full column (Word/Google Doc style). */
function Bijlage2BasisTable({ model }: { model: TP2026Bijlage2Model }) {
  const cols = [model.willen, model.weten, model.kunnen, model.doen] as const;
  const headers = ['WILLEN', 'WETEN', 'KUNNEN', 'DOEN'] as const;
  return (
    <table className="w-full shrink-0 border-collapse border border-[#b8985c] table-fixed">
      <colgroup>
        <col style={{ width: '25%' }} />
        <col style={{ width: '25%' }} />
        <col style={{ width: '25%' }} />
        <col style={{ width: '25%' }} />
      </colgroup>
      <thead>
        <tr>
          {headers.map((h) => (
            <th
              key={h}
              className="border border-[#b8985c] bg-[#ebe1cf] px-1 py-0.5 text-center text-[10pt] font-bold uppercase tracking-tight text-[#6d2a96]"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {cols.map((col, ci) => (
            <td
              key={ci}
              className="border border-[#b8985c] bg-white px-1.5 py-1 align-top text-[7pt] leading-[1.45] text-neutral-900"
            >
              {col.map((row, ri) => (
                <div key={ri} className="break-words pb-1 last:pb-0">
                  {row.checked ? '☑' : '☐'} {row.label}
                </div>
              ))}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function Bijlage2PowHeaderRow({ continued = false }: { continued?: boolean }) {
  return (
    <div className="mt-3 mb-1 flex w-full shrink-0 items-baseline justify-between text-[10pt] font-bold text-[#6d2a96]">
      <span>
        Activeringsinterventies
        {continued ? <span className="font-normal text-neutral-600"> (vervolg)</span> : null}
      </span>
      <span className="pr-1">POW-meter™</span>
    </div>
  );
}

function Bijlage2PowRows({ tredes }: { tredes: TP2026Bijlage2PowTrede[] }) {
  return (
    <table className="w-full border-collapse border border-[#b8985c] text-[7pt] leading-[1.45]">
      <tbody>
        {tredes.map((t) => (
          <tr key={t.trede}>
            <td className="w-[78%] border border-[#b8985c] bg-white px-1.5 py-1 align-top text-neutral-900">
              <div className="mb-1 font-bold text-[#6d2a96]">
                Trede {t.trede} is succesvol afgerond wanneer:
              </div>
              <div>
                {t.criteria.map((c, idx) => (
                  <div key={idx} className="break-words pb-1 last:pb-0">
                    {c.checked ? '☑' : '☐'} {c.label}
                  </div>
                ))}
              </div>
            </td>
            <td
              className={`w-[22%] border border-[#b8985c] px-1 py-1.5 align-middle text-center text-[8pt] font-bold leading-snug ${BIJLAGE2_TREDE_BADGE[t.trede] ?? 'bg-[#ebe1cf] text-[#6d2a96]'}`}
            >
              Trede {t.trede}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const bijlage2BodyClass = 'flex min-h-0 flex-1 flex-col overflow-hidden';

/** Rough height (px) for one POW trede row — packs whole tredes only; split between pages at row boundaries. */
function estimatePowTredeHeightPx(t: TP2026Bijlage2PowTrede): number {
  const criteria = t.criteria?.length ?? 0;
  const textChars = (t.criteria ?? []).reduce((n, c) => n + String(c.label || '').length, 0);
  return 40 + criteria * 15 + Math.min(textChars * 0.26, 100);
}

/**
 * Split all tredes into consecutive chunks for A4 pages. First chunk shares page 1 with basis + header;
 * later chunks get full pages. Smallest unit = one trede (one table row).
 */
function chunkPowTredesForA4(
  tredes: TP2026Bijlage2PowTrede[],
  firstPageBudgetPx: number,
  continuationPageBudgetPx: number
): TP2026Bijlage2PowTrede[][] {
  if (!tredes.length) return [];
  const chunks: TP2026Bijlage2PowTrede[][] = [];
  let i = 0;
  let pageIdx = 0;
  while (i < tredes.length) {
    const budget = pageIdx === 0 ? firstPageBudgetPx : continuationPageBudgetPx;
    const slice: TP2026Bijlage2PowTrede[] = [];
    let used = 0;
    while (i < tredes.length) {
      const cost = estimatePowTredeHeightPx(tredes[i]);
      if (slice.length > 0 && used + cost > budget) break;
      slice.push(tredes[i]);
      used += cost;
      i += 1;
    }
    if (slice.length === 0) {
      slice.push(tredes[i]);
      i += 1;
    }
    chunks.push(slice);
    pageIdx += 1;
  }
  return chunks;
}

function Bijlage2FootnotesBlock() {
  return (
    <div className="mt-2 shrink-0 space-y-0.5 text-[7pt] italic leading-snug text-neutral-800">
      {BIJLAGE2_FOOTNOTES.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

/**
 * Vertical budget (px) for POW trede rows after fixed chrome on the page.
 * A4 body is ~1123px; logo flow spacer + titles + 4-col basis + POW header consume the rest — 380 was far too low
 * (left half a page empty). Values are heuristics aligned with print preview.
 */
const BIJLAGE2_POW_BUDGET_AFTER_BASIS_PX = 640;
const BIJLAGE2_POW_BUDGET_FULL_PAGE_PX = 900;

export function Bijlage2A4Pages({
  data,
  model,
  printMode = false,
}: {
  data: Record<string, any>;
  model: TP2026Bijlage2Model;
  printMode?: boolean;
}) {
  const powSorted = useMemo(
    () => [...model.powTredes].sort((a, b) => a.trede - b.trede),
    [model.powTredes]
  );

  const powChunks = useMemo(
    () => chunkPowTredesForA4(powSorted, BIJLAGE2_POW_BUDGET_AFTER_BASIS_PX, BIJLAGE2_POW_BUDGET_FULL_PAGE_PX),
    [powSorted]
  );

  const pageShellClass = `${TP2026_A4_PAGE_CLASS} flex min-h-0 flex-col overflow-hidden`;

  const pages = useMemo(() => {
    const out: ReactElement[] = [];
    let pageNumber = 0;

    if (powChunks.length === 0) {
      pageNumber += 1;
      out.push(
        <A4Page key="b2-only-basis" className={pageShellClass}>
          <div className={bijlage2BodyClass}>
            <A4LogoHeader />
            <Bijlage2TitleBlock />
            <Bijlage2BasisTable model={model} />
            <Bijlage2FootnotesBlock />
          </div>
          <FooterIdentity
            lastName={data.last_name}
            firstName={data.first_name}
            dateOfBirth={formatNLDate(data.date_of_birth)}
            pageNumber={pageNumber}
          />
        </A4Page>
      );
      return out;
    }

    const lastChunkIdx = powChunks.length - 1;

    pageNumber += 1;
    out.push(
      <A4Page key="b2-p1" className={pageShellClass}>
        <div className={bijlage2BodyClass}>
          <A4LogoHeader />
          <Bijlage2TitleBlock />
          <Bijlage2BasisTable model={model} />
          <Bijlage2PowHeaderRow />
          <Bijlage2PowRows tredes={powChunks[0]} />
          {lastChunkIdx === 0 ? <Bijlage2FootnotesBlock /> : null}
        </div>
        <FooterIdentity
          lastName={data.last_name}
          firstName={data.first_name}
          dateOfBirth={formatNLDate(data.date_of_birth)}
          pageNumber={pageNumber}
        />
      </A4Page>
    );

    for (let ci = 1; ci < powChunks.length; ci++) {
      pageNumber += 1;
      const isLast = ci === lastChunkIdx;
      out.push(
        <A4Page key={`b2-pow-${ci}`} className={pageShellClass}>
          <div className={bijlage2BodyClass}>
            <A4LogoHeader />
            <Bijlage2PowHeaderRow continued />
            <Bijlage2PowRows tredes={powChunks[ci]} />
            {isLast ? <Bijlage2FootnotesBlock /> : null}
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

    return out;
  }, [data, model, pageShellClass, powChunks]);

  if (printMode) {
    return (
      <>
        {pages.map((node, idx) => (
          <section className="print-page" key={`print-b2-${idx}`}>
            {node}
          </section>
        ))}
      </>
    );
  }

  return <>{pages}</>;
}

function Bijlage3TitleBlock({ continued = false }: { continued?: boolean }) {
  return (
    <div className="mb-2 shrink-0">
      <div className="text-[10pt] leading-tight font-bold tracking-tight text-[#d4694a]">Bijlage 3</div>
      <div className="mt-0.5 text-[10pt] leading-tight font-bold tracking-tight text-[#2d8f82]">
        Stroomschema POW-meter™
        {continued ? <span className="font-normal text-neutral-600"> (vervolg)</span> : null}
      </div>
    </div>
  );
}

function bijlage3DoelChecksPrint(ja?: boolean, nee?: boolean) {
  return (
    <div className="text-[7pt] leading-tight text-neutral-900">
      <span>{ja ? '☑' : '☐'} ja</span> <span>{nee ? '☑' : '☐'} nee</span>
    </div>
  );
}

const BIJLAGE3_PRINT_HEADERS = [
  'Vragen stroomschema',
  '',
  'Trede-bepaling',
  'Doel uren %',
  'Werkboeken',
  'Doel behaald',
] as const;

function renderBijlage3QuestionCell(step: TP2026Bijlage3Decision) {
  const lines = String(step.question || '').split('\n').filter(Boolean);
  const firstLine = lines[0] ?? '';
  const tail = lines.slice(1).join('\n');

  return (
    <>
      <div className="whitespace-pre-line font-bold">{firstLine}</div>
      {tail ? <div className="whitespace-pre-line font-normal">{tail}</div> : null}
      {step.questionSubtitle ? (
        <div className="mt-0.5 whitespace-pre-line font-normal text-neutral-800">{step.questionSubtitle}</div>
      ) : null}
      {step.hint ? <div className="mt-1 whitespace-pre-line font-normal text-neutral-800">{step.hint}</div> : null}
      <div className="mt-2 font-bold text-[#2d8f82]">JA &gt;</div>
    </>
  );
}

function Bijlage3StroomTable({ decisions }: { decisions: TP2026Bijlage3Decision[] }) {
  const tredeCellClass = (n: number) =>
    `${BIJLAGE2_TREDE_BADGE[n] ?? 'bg-[#ebe1cf] text-[#6d2a96]'}`;

  return (
    <table className="w-full shrink-0 border-collapse border border-[#b8985c] table-fixed text-[7pt] leading-[1.45] text-neutral-900">
      <colgroup>
        <col style={{ width: '26%' }} />
        <col style={{ width: '8%' }} />
        <col style={{ width: '17%' }} />
        <col style={{ width: '16%' }} />
        <col style={{ width: '19%' }} />
        <col style={{ width: '14%' }} />
      </colgroup>
      <thead>
        <tr>
          {BIJLAGE3_PRINT_HEADERS.map((h, idx) => (
            <th
              key={`${h}-${idx}`}
              className="border border-[#b8985c] bg-[#ebe1cf] px-1 py-0.5 text-center text-[10pt] font-bold tracking-tight text-[#6d2a96]"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {decisions.map((step) => (
          <tr key={step.id}>
            <td className="border border-[#b8985c] bg-white px-1.5 py-1 align-top">
              {renderBijlage3QuestionCell(step)}
            </td>
            <td className="border border-[#b8985c] bg-white px-1 py-1 align-top text-center">
              <div className="font-bold text-[#d4694a]">NEE &gt;</div>
            </td>
            <td className={`border border-[#b8985c] px-1 py-1 align-top ${tredeCellClass(step.neeTredeNum)}`}>
              <div className="font-bold">{step.neeTredeLabel}</div>
              <div className="mt-0.5 whitespace-pre-line font-normal text-neutral-900">{step.neeTredeBody}</div>
            </td>
            <td className="border border-[#b8985c] bg-white px-1 py-1 align-top whitespace-pre-line">
              {String(step.doelUren || '').trim() ? step.doelUren : '—'}
            </td>
            <td className="border border-[#b8985c] bg-white px-1 py-1 align-top">
              {step.werkboeken.map((w, wi) => (
                <div key={wi} className="break-words pb-0.5 last:pb-0">
                  • {w}
                </div>
              ))}
            </td>
            <td className="border border-[#b8985c] bg-white px-1 py-1 align-top">
              {bijlage3DoelChecksPrint(step.doelJa, step.doelNee)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Heuristic tbody height (px) for one stroomschema row — whole steps only; split at row boundaries. */
function estimateBijlage3StepHeightPx(d: TP2026Bijlage3Decision): number {
  const qLen = String(d.question ?? '').length + String(d.questionSubtitle ?? '').length;
  const hintLen = String(d.hint ?? '').length;
  const neeLen = String(d.neeTredeBody ?? '').length + String(d.neeTredeLabel ?? '').length;
  const books = d.werkboeken ?? [];
  const wbChars = books.reduce((n, w) => n + String(w).length, 0);
  return (
    54 +
    qLen * 0.34 +
    hintLen * 0.28 +
    neeLen * 0.2 +
    books.length * 17 +
    wbChars * 0.13 +
    30
  );
}

/**
 * Split official stroomschema steps across A4 pages (each page repeats thead).
 * Budgets are for tbody rows only; logo + title + table header sit outside the budget.
 */
function chunkBijlage3Decisions(
  decisions: TP2026Bijlage3Decision[],
  firstPageBudgetPx: number,
  continuationPageBudgetPx: number
): TP2026Bijlage3Decision[][] {
  if (!decisions.length) return [[]];
  const chunks: TP2026Bijlage3Decision[][] = [];
  let i = 0;
  let pageIdx = 0;
  while (i < decisions.length) {
    const budget = pageIdx === 0 ? firstPageBudgetPx : continuationPageBudgetPx;
    const slice: TP2026Bijlage3Decision[] = [];
    let used = 0;
    while (i < decisions.length) {
      const cost = estimateBijlage3StepHeightPx(decisions[i]);
      if (slice.length > 0 && used + cost > budget) break;
      slice.push(decisions[i]);
      used += cost;
      i += 1;
    }
    if (slice.length === 0) {
      slice.push(decisions[i]);
      i += 1;
    }
    chunks.push(slice);
    pageIdx += 1;
  }
  return chunks;
}

/** Tbody vertical budget after logo + title + 5-col thead (approx.). */
const BIJLAGE3_FIRST_PAGE_TBODY_BUDGET_PX = 760;
const BIJLAGE3_CONTINUATION_TBODY_BUDGET_PX = 900;

/** Page 2 only: final JA branch + Trede 6 (always last bijlage-3 sheet; page number follows stroomschema chunks). */
function Bijlage3Page2Only({
  data,
  page2,
  pageNumber = 2,
}: {
  data: Record<string, any>;
  page2: { doelJa?: boolean; doelNee?: boolean };
  pageNumber?: number;
}) {
  const pageShellClass = `${TP2026_A4_PAGE_CLASS} flex min-h-0 flex-col overflow-hidden`;
  const tredeCellClass = `${BIJLAGE2_TREDE_BADGE[BIJLAGE3_PAGE2.tredeNum]}`;

  return (
    <A4Page className={pageShellClass}>
      <div className="flex shrink-0 flex-col overflow-hidden">
        <A4LogoHeader />
        <table className="w-full shrink-0 border-collapse border border-[#b8985c] table-fixed text-[7pt] leading-[1.45] text-neutral-900">
          <colgroup>
            <col style={{ width: '26%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '19%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr>
              {BIJLAGE3_PRINT_HEADERS.map((h, idx) => (
                <th
                  key={`${h}-${idx}`}
                  className="border border-[#b8985c] bg-[#ebe1cf] px-1 py-0.5 text-center text-[10pt] font-bold tracking-tight text-[#6d2a96]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#b8985c] bg-white px-1.5 py-1 align-top">
                <div className="font-bold text-[#2d8f82]">{BIJLAGE3_PAGE2.jaLeadIn}</div>
                <div className="mt-1 whitespace-pre-line">{BIJLAGE3_PAGE2.focusLine}</div>
              </td>
              <td className="border border-[#b8985c] bg-white px-1 py-1 align-top text-center text-neutral-500">—</td>
              <td className={`border border-[#b8985c] px-1 py-1 align-top ${tredeCellClass}`}>
                <div className="font-bold">{BIJLAGE3_PAGE2.tredeLabel}</div>
                <div className="mt-0.5 whitespace-pre-line font-normal text-neutral-900">{BIJLAGE3_PAGE2.tredeBody}</div>
              </td>
              <td className="border border-[#b8985c] bg-white px-1 py-1 align-top">
                —
              </td>
              <td className="border border-[#b8985c] bg-white px-1 py-1 align-top text-neutral-500">—</td>
              <td className="border border-[#b8985c] bg-white px-1 py-1 align-top">
                {bijlage3DoelChecksPrint(page2.doelJa, page2.doelNee)}
              </td>
            </tr>
          </tbody>
        </table>
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

export function Bijlage3Editor({
  decisions,
  setDecisions,
  page2,
  setPage2,
}: {
  decisions: TP2026Bijlage3Decision[];
  setDecisions: (next: TP2026Bijlage3Decision[]) => void;
  page2: { doelJa?: boolean; doelNee?: boolean };
  setPage2: (next: { doelJa?: boolean; doelNee?: boolean }) => void;
}) {
  const p2 = page2 || {};

  return (
    <div className="space-y-4">
      {decisions.map((decision, idx) => (
        <div key={decision.id} className="border border-border rounded-md p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-1">{decision.id}</p>
          <p className="text-sm font-semibold text-[#6d2a96] mb-1 whitespace-pre-line">{decision.question}</p>
          {decision.hint ? (
            <p className="text-xs text-neutral-700 mb-2 whitespace-pre-line">{decision.hint}</p>
          ) : null}
          <label className="mb-2 block text-sm">
            <span className="font-medium">Stroomschema (ja/nee)</span>
            <select
              className="mt-1 w-full max-w-xs border border-border rounded px-2 py-1 text-sm"
              value={decision.reached || ''}
              onChange={(e) =>
                setDecisions(
                  decisions.map((d, i) =>
                    i === idx ? { ...d, reached: (e.target.value || null) as 'yes' | 'no' | null } : d
                  )
                )
              }
            >
              <option value="">Geen keuze</option>
              <option value="yes">Ja</option>
              <option value="no">Nee</option>
            </select>
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Ja → {decision.yesOutcome} | Nee → {decision.noOutcome}
          </p>
          <div className="flex flex-wrap gap-4 border-t border-border pt-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(decision.doelJa)}
                onChange={(e) =>
                  setDecisions(
                    decisions.map((d, i) =>
                      i === idx
                        ? {
                            ...d,
                            doelJa: e.target.checked,
                            doelNee: e.target.checked ? false : Boolean(d.doelNee),
                          }
                        : d
                    )
                  )
                }
              />
              Doel behaald: ja
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(decision.doelNee)}
                onChange={(e) =>
                  setDecisions(
                    decisions.map((d, i) =>
                      i === idx
                        ? {
                            ...d,
                            doelNee: e.target.checked,
                            doelJa: e.target.checked ? false : Boolean(d.doelJa),
                          }
                        : d
                    )
                  )
                }
              />
              Doel behaald: nee
            </label>
          </div>
        </div>
      ))}

      <div className="rounded-md border border-border bg-muted/15 p-3">
        <p className="text-sm font-semibold text-[#6d2a96] mb-2">Laatste stap (pagina 2) — doel behaald</p>
        <p className="text-xs text-muted-foreground mb-2 whitespace-pre-line">
          {BIJLAGE3_PAGE2.jaLeadIn} {BIJLAGE3_PAGE2.focusLine.replace(/\n/g, ' ')}
        </p>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(p2.doelJa)}
              onChange={(e) =>
                setPage2({ ...p2, doelJa: e.target.checked, doelNee: e.target.checked ? false : p2.doelNee })
              }
            />
            Doel behaald: ja
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(p2.doelNee)}
              onChange={(e) =>
                setPage2({ ...p2, doelNee: e.target.checked, doelJa: e.target.checked ? false : p2.doelJa })
              }
            />
            Doel behaald: nee
          </label>
        </div>
      </div>
    </div>
  );
}

export function Bijlage3A4Pages({
  data,
  decisions,
  page2,
  printMode = false,
}: {
  data: Record<string, any>;
  decisions: TP2026Bijlage3Decision[];
  page2?: { doelJa?: boolean; doelNee?: boolean };
  printMode?: boolean;
}) {
  const p2 = page2 || { doelJa: false, doelNee: false };
  const pageShellClass = `${TP2026_A4_PAGE_CLASS} flex min-h-0 flex-col overflow-hidden`;

  const mainChunks = useMemo(
    () =>
      chunkBijlage3Decisions(
        decisions,
        BIJLAGE3_FIRST_PAGE_TBODY_BUDGET_PX,
        BIJLAGE3_CONTINUATION_TBODY_BUDGET_PX
      ),
    [decisions]
  );

  const mainPages = mainChunks.map((chunk, idx) => (
    <A4Page key={`b3-main-${idx}`} className={pageShellClass}>
      <div className="flex shrink-0 flex-col overflow-hidden">
        <A4LogoHeader />
        <Bijlage3TitleBlock continued={idx > 0} />
        <Bijlage3StroomTable decisions={chunk} />
      </div>
      <FooterIdentity
        lastName={data.last_name}
        firstName={data.first_name}
        dateOfBirth={formatNLDate(data.date_of_birth)}
        pageNumber={idx + 1}
      />
    </A4Page>
  ));

  const page2Node = (
    <Bijlage3Page2Only key="b3-p2" data={data} page2={p2} pageNumber={mainChunks.length + 1} />
  );

  if (printMode) {
    return (
      <>
        {mainPages.map((node, i) => (
          <section className="print-page" key={`print-b3-main-${i}`}>
            {node}
          </section>
        ))}
        <section className="print-page">{page2Node}</section>
      </>
    );
  }

  return (
    <>
      {mainPages}
      {page2Node}
    </>
  );
}
