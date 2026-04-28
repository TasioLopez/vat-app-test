'use client';

import { A4LogoHeader, A4Page, DataRow, FooterIdentity, SectionBand } from '@/components/tp2026/primitives';
import type {
  TP2026Bijlage1Phase,
  TP2026Bijlage2Model,
  TP2026Bijlage3Decision,
} from '@/lib/tp2026/schema';
import { formatNLDate } from '@/lib/tp2026/schema';

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

export function Bijlage1Editor({
  phases,
  setPhases,
}: {
  phases: TP2026Bijlage1Phase[];
  setPhases: (next: TP2026Bijlage1Phase[]) => void;
}) {
  const updatePhase = (idx: number, updater: (prev: TP2026Bijlage1Phase) => TP2026Bijlage1Phase) => {
    setPhases(phases.map((phase, i) => (i === idx ? updater(phase) : phase)));
  };

  return (
    <div className="space-y-4">
      {phases.map((phase, phaseIdx) => (
        <div key={phaseIdx} className="border border-border rounded-md p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <TextInput
              value={phase.title}
              onChange={(v) => updatePhase(phaseIdx, (p) => ({ ...p, title: v }))}
              placeholder="Doel/fase titel"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="border border-border rounded px-2 py-1 text-sm"
                value={phase.period_from || ''}
                onChange={(e) => updatePhase(phaseIdx, (p) => ({ ...p, period_from: e.target.value }))}
              />
              <input
                type="date"
                className="border border-border rounded px-2 py-1 text-sm"
                value={phase.period_to || ''}
                onChange={(e) => updatePhase(phaseIdx, (p) => ({ ...p, period_to: e.target.value }))}
              />
            </div>
          </div>
          {phase.activities.map((activity, actIdx) => (
            <div key={actIdx} className="grid grid-cols-[1fr_90px] gap-2">
              <TextInput
                value={activity.name}
                onChange={(v) =>
                  updatePhase(phaseIdx, (p) => ({
                    ...p,
                    activities: p.activities.map((a, i) => (i === actIdx ? { ...a, name: v } : a)),
                  }))
                }
              />
              <select
                className="border border-border rounded px-2 py-1 text-sm"
                value={activity.status}
                onChange={(e) =>
                  updatePhase(phaseIdx, (p) => ({
                    ...p,
                    activities: p.activities.map((a, i) =>
                      i === actIdx ? { ...a, status: e.target.value as 'G' | 'P' | 'N' | 'U' } : a
                    ),
                  }))
                }
              >
                {['G', 'P', 'N', 'U'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function Bijlage1A4Pages({
  data,
  phases,
  printMode = false,
}: {
  data: Record<string, any>;
  phases: TP2026Bijlage1Phase[];
  printMode?: boolean;
}) {
  const page = (
    <A4Page className="p-8 flex flex-col">
      <A4LogoHeader />
      <h2 className="text-lg font-bold text-[#6d2a96] mb-3">Bijlage 1 - Voortgang en planning</h2>
      {phases.map((phase, idx) => (
        <div key={idx} className="mb-3 border border-[#d7c8a2]">
          <SectionBand title={`Planning fase ${idx + 1}`} />
          <DataRow label="Doel" value={phase.title || '—'} />
          <DataRow label="Periode" value={`${formatNLDate(phase.period_from)} t/m ${formatNLDate(phase.period_to)}`} />
          {phase.activities.map((a, i) => (
            <DataRow key={`${idx}-${i}`} label={a.name} value={a.status} compact />
          ))}
        </div>
      ))}
      <p className="text-[10px] italic">Legenda: G gedaan / P gepland / N niet gedaan / U in uitvoering</p>
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
    <A4Page className="p-8 flex flex-col">
      <A4LogoHeader />
      <h2 className="text-lg font-bold text-[#6d2a96] mb-3">Bijlage 2 - ValentineZ leernavigator</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-[#d7c8a2] bg-[#f5efe6] p-3">
          <h4 className="font-bold mb-2">Willen</h4>
          <pre className="whitespace-pre-wrap text-[11px] font-sans">{renderChecks(model.willen)}</pre>
        </div>
        <div className="border border-[#d7c8a2] bg-[#f5efe6] p-3">
          <h4 className="font-bold mb-2">Weten</h4>
          <pre className="whitespace-pre-wrap text-[11px] font-sans">{renderChecks(model.weten)}</pre>
        </div>
        <div className="border border-[#d7c8a2] bg-[#f5efe6] p-3">
          <h4 className="font-bold mb-2">Kunnen</h4>
          <pre className="whitespace-pre-wrap text-[11px] font-sans">{renderChecks(model.kunnen)}</pre>
        </div>
        <div className="border border-[#d7c8a2] bg-[#f5efe6] p-3">
          <h4 className="font-bold mb-2">Doen</h4>
          <pre className="whitespace-pre-wrap text-[11px] font-sans">{renderChecks(model.doen)}</pre>
        </div>
      </div>

      <SectionBand title="POW-meter™ Tredes" />
      <div className="border-x border-[#d7c8a2]">
        {model.powTredes.map((trede) => (
          <DataRow
            key={trede.trede}
            label={`Trede ${trede.trede}`}
            value={trede.checks.some((x) => x.checked) ? 'Behaald' : 'Niet behaald'}
            compact
          />
        ))}
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
    <A4Page className="p-8 flex flex-col">
      <A4LogoHeader />
      <h2 className="text-lg font-bold text-[#6d2a96] mb-3">Bijlage 3 - Stroomschema POW-meter™</h2>
      <div className="border border-[#d7c8a2]">
        <SectionBand title="Vragen stroomschema" />
        {decisions.map((decision, idx) => (
          <DataRow
            key={idx}
            label={decision.question}
            value={decision.reached === 'yes' ? decision.yesOutcome : decision.reached === 'no' ? decision.noOutcome : '—'}
            compact
          />
        ))}
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
