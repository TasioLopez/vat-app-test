'use client';

import {
  A4LogoHeader,
  A4Page,
  DataRow,
  FooterIdentity,
  SectionBand,
  TP2026FieldTable,
  TP2026_A4_PAGE_CLASS,
} from '@/components/tp2026/primitives';
import type {
  TP2026Bijlage1Activity,
  TP2026Bijlage1Phase,
  TP2026Bijlage2Model,
  TP2026Bijlage3Decision,
} from '@/lib/tp2026/schema';
import { formatNLDate } from '@/lib/tp2026/schema';
import { useMemo, useState } from 'react';
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
    <A4Page className={`${TP2026_A4_PAGE_CLASS} flex h-full min-h-0 flex-col overflow-hidden`}>
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

export function Bijlage2Editor({
  model,
  setModel,
}: {
  model: TP2026Bijlage2Model;
  setModel: (next: TP2026Bijlage2Model) => void;
}) {
  const groups: Array<keyof TP2026Bijlage2Model> = ['willen', 'weten', 'kunnen', 'doen'];
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group} className="border border-border rounded-md p-3">
          <h4 className="font-semibold capitalize mb-2">{group}</h4>
          {(model[group] as any[]).map((row, idx) => (
            <label key={idx} className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={row.checked}
                onChange={(e) =>
                  setModel({
                    ...model,
                    [group]: (model[group] as any[]).map((r, i) =>
                      i === idx ? { ...r, checked: e.target.checked } : r
                    ),
                  })
                }
              />
              <span>{row.label}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

export function Bijlage2A4Pages({
  data,
  model,
  printMode = false,
}: {
  data: Record<string, any>;
  model: TP2026Bijlage2Model;
  printMode?: boolean;
}) {
  const renderChecks = (rows: Array<{ label: string; checked: boolean }>) =>
    rows.map((row) => `${row.checked ? '☑' : '☐'} ${row.label}`).join('\n');

  const page = (
    <A4Page className={TP2026_A4_PAGE_CLASS}>
      <A4LogoHeader />
      <h2 className="text-lg font-bold text-[#6d2a96] mb-3">Bijlage 2 - ValentineZ leernavigator</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-[#b8985c] bg-[#f5efe6] p-3">
          <h4 className="font-bold mb-2">Willen</h4>
          <pre className="whitespace-pre-wrap text-[11px] font-sans">{renderChecks(model.willen)}</pre>
        </div>
        <div className="border border-[#b8985c] bg-[#f5efe6] p-3">
          <h4 className="font-bold mb-2">Weten</h4>
          <pre className="whitespace-pre-wrap text-[11px] font-sans">{renderChecks(model.weten)}</pre>
        </div>
        <div className="border border-[#b8985c] bg-[#f5efe6] p-3">
          <h4 className="font-bold mb-2">Kunnen</h4>
          <pre className="whitespace-pre-wrap text-[11px] font-sans">{renderChecks(model.kunnen)}</pre>
        </div>
        <div className="border border-[#b8985c] bg-[#f5efe6] p-3">
          <h4 className="font-bold mb-2">Doen</h4>
          <pre className="whitespace-pre-wrap text-[11px] font-sans">{renderChecks(model.doen)}</pre>
        </div>
      </div>

      <SectionBand title="POW-meter™ Tredes" className="mt-4" />
      <TP2026FieldTable>
        {model.powTredes.map((trede) => (
          <DataRow
            key={trede.trede}
            label={`Trede ${trede.trede}`}
            value={trede.checks.some((x) => x.checked) ? 'Behaald' : 'Niet behaald'}
            compact
          />
        ))}
      </TP2026FieldTable>
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

export function Bijlage3Editor({
  decisions,
  setDecisions,
}: {
  decisions: TP2026Bijlage3Decision[];
  setDecisions: (next: TP2026Bijlage3Decision[]) => void;
}) {
  return (
    <div className="space-y-3">
      {decisions.map((decision, idx) => (
        <div key={idx} className="border border-border rounded-md p-3">
          <p className="font-semibold mb-2">{decision.question}</p>
          <select
            className="border border-border rounded px-2 py-1 text-sm"
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
          <p className="text-xs mt-1 text-muted-foreground">Ja → {decision.yesOutcome} | Nee → {decision.noOutcome}</p>
        </div>
      ))}
    </div>
  );
}

export function Bijlage3A4Pages({
  data,
  decisions,
  printMode = false,
}: {
  data: Record<string, any>;
  decisions: TP2026Bijlage3Decision[];
  printMode?: boolean;
}) {
  const page = (
    <A4Page className={TP2026_A4_PAGE_CLASS}>
      <A4LogoHeader />
      <h2 className="text-lg font-bold text-[#6d2a96] mb-3">Bijlage 3 - Stroomschema POW-meter™</h2>
      <SectionBand title="Vragen stroomschema" />
      <TP2026FieldTable>
        {decisions.map((decision, idx) => (
          <DataRow
            key={idx}
            label={decision.question}
            value={decision.reached === 'yes' ? decision.yesOutcome : decision.reached === 'no' ? decision.noOutcome : '—'}
            compact
          />
        ))}
      </TP2026FieldTable>
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
