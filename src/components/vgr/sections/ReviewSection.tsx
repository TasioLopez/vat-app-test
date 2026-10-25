'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { countIssues, validateVgr, visibleIssues, type VGRIssue } from '@/lib/vgr/validation';
import { formatNLDate, trajectDoelLabel, type VGRData, type VGRMeta, type VGRStatus } from '@/lib/vgr/schema';
import { vgrPeriodeText } from '@/lib/vgr/period';
import { VgrGenerateAllPanel } from '@/components/vgr/ai/VgrGenerateAllPanel';

export const VGR_STEP_LABELS: Record<VGRIssue['step'], string> = {
  setup: 'Stap 1 · Rapportage',
  cover: 'Stap 2 · Voorblad',
  gegevens: 'Stap 3 · Gegevens',
  body: 'Stap 4 · Rapportage-inhoud',
  planning: 'Stap 5 · Bijlage 1',
  applications: 'Stap 6 · Bijlage 2',
};

const LEVEL_UI = {
  error: { icon: XCircle, cls: 'border-rose-200 bg-rose-50 text-rose-900', iconCls: 'text-rose-600', label: 'Blokkerend' },
  warning: { icon: AlertTriangle, cls: 'border-amber-200 bg-amber-50 text-amber-900', iconCls: 'text-amber-600', label: 'Controleren' },
  info: { icon: Info, cls: 'border-sky-200 bg-sky-50 text-sky-900', iconCls: 'text-sky-600', label: 'Ter info' },
} as const;

export function ReviewEditor({
  data,
  status,
  onGoToIssue,
  onSetStatus,
  updateMeta,
  employeeId,
  vgrInstanceId,
  statusBusy,
}: {
  data: VGRData;
  status: VGRStatus;
  onGoToIssue: (issue: VGRIssue) => void;
  onSetStatus: (next: VGRStatus) => void;
  updateMeta: (patch: Partial<VGRMeta>) => void;
  employeeId: string;
  vgrInstanceId: string;
  statusBusy?: boolean;
}) {
  const allIssues = useMemo(() => validateVgr(data), [data]);
  const issues = useMemo(() => visibleIssues(allIssues, data.vgr_meta.dismissed_warnings), [allIssues, data.vgr_meta.dismissed_warnings]);
  const counts = countIssues(issues);
  const canFinalize = counts.errors === 0;
  const [dismissId, setDismissId] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');

  const grouped = useMemo(() => {
    const map = new Map<VGRIssue['step'], VGRIssue[]>();
    for (const i of issues) {
      if (!map.has(i.step)) map.set(i.step, []);
      map.get(i.step)!.push(i);
    }
    return [...map.entries()];
  }, [issues]);

  const appsCount = data.applications.length;
  const actCounts = data.planning_phases.flatMap((p) => p.activities).reduce(
    (acc, a) => ({ ...acc, [a.status]: (acc[a.status] ?? 0) + 1 }),
    {} as Record<string, number>
  );

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[#6d2a96]">Samenvatting rapportage</h3>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row k="Werknemer" v={`${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || '—'} />
          <Row k="Rapportage" v={`Versie ${data.vgr_meta.version}${data.vgr_meta.prior_vgr_instance_id ? ' (vervolg)' : ' (eerste)'}`} />
          <Row k="Periode" v={vgrPeriodeText(data)} />
          <Row k="Datum rapportage" v={formatNLDate(data.vgr_meta.report_date) || '—'} />
          <Row k="Doelstelling" v={trajectDoelLabel(data.body.doelstelling_traject.huidige) || '—'} />
          <Row k="PoW-meter" v={data.body.pow.huidige_trede ? `Trede ${data.body.pow.huidige_trede}${data.body.pow.doel_trede ? ` → doel ${data.body.pow.doel_trede}` : ''}` : '—'} />
          <Row k="Bijlage 1" v={`${data.planning_phases.length} fases · ${Object.entries(actCounts).map(([s, n]) => `${n}×${s}`).join(', ') || 'geen activiteiten'}`} />
          <Row k="Bijlage 2" v={appsCount ? `${appsCount} sollicitatie(s)` : 'geen sollicitaties'} />
          <Row k="Brondocumenten" v={`${data.vgr_meta.source_document_ids.length} geselecteerd`} />
          <Row k="Status" v={status === 'final' ? 'Definitief' : status === 'review' ? 'Ter controle' : 'Concept'} />
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#6d2a96]">Controle</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-rose-700"><XCircle className="h-3.5 w-3.5" /> {counts.errors}</span>
            <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> {counts.warnings}</span>
            <span className="inline-flex items-center gap-1 text-sky-700"><Info className="h-3.5 w-3.5" /> {counts.infos}</span>
          </div>
        </div>
        {issues.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Geen aandachtspunten gevonden.
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([step, list]) => (
              <div key={step}>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{VGR_STEP_LABELS[step]}</h4>
                <ul className="space-y-1.5">
                  {list.map((issue) => {
                    const ui = LEVEL_UI[issue.level];
                    const Icon = ui.icon;
                    return (
                      <li key={issue.id} className={`rounded-md border px-3 py-2 ${ui.cls}`}>
                        <button
                          type="button"
                          onClick={() => onGoToIssue(issue)}
                          className="flex w-full items-start gap-2 text-left text-sm transition hover:brightness-95"
                        >
                          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ui.iconCls}`} aria-hidden />
                          <span>{issue.message}</span>
                        </button>
                        {issue.level !== 'error' ? (
                          dismissId === issue.id ? (
                            <div className="mt-2 flex flex-col gap-1.5 sm:flex-row">
                              <Input
                                value={rationale}
                                onChange={(e) => setRationale(e.target.value)}
                                placeholder="Reden voor negeren (verplicht)"
                                className="h-8 bg-white text-xs"
                              />
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 text-xs"
                                  disabled={!rationale.trim()}
                                  onClick={() => {
                                    updateMeta({
                                      dismissed_warnings: { ...data.vgr_meta.dismissed_warnings, [issue.id]: rationale.trim() },
                                    });
                                    setDismissId(null);
                                    setRationale('');
                                  }}
                                >
                                  Bevestig
                                </Button>
                                <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setDismissId(null)}>
                                  Annuleer
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="mt-1 text-[11px] underline underline-offset-2 opacity-80 hover:opacity-100"
                              onClick={() => {
                                setDismissId(issue.id);
                                setRationale('');
                              }}
                            >
                              Negeren met toelichting
                            </button>
                          )
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <VgrGenerateAllPanel data={data} employeeId={employeeId} vgrInstanceId={vgrInstanceId} />

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-[#6d2a96]">Status</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Markeer de rapportage als definitief zodra alle blokkerende punten zijn opgelost. Een definitieve rapportage wordt bij
          de volgende voortgangsrapportage automatisch als basis gebruikt (doelstelling, PoW-historie, Leernavigator, planning).
          Instructieteksten (geel) uit de sjablonen worden nooit geëxporteerd.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={status === 'draft' ? 'default' : 'outline'} size="sm" disabled={statusBusy} onClick={() => onSetStatus('draft')}>
            Concept
          </Button>
          <Button type="button" variant={status === 'review' ? 'default' : 'outline'} size="sm" disabled={statusBusy} onClick={() => onSetStatus('review')}>
            Ter controle
          </Button>
          <Button
            type="button"
            variant={status === 'final' ? 'default' : 'outline'}
            size="sm"
            disabled={statusBusy || !canFinalize}
            title={canFinalize ? undefined : 'Los eerst de blokkerende punten op'}
            onClick={() => onSetStatus('final')}
          >
            Definitief
          </Button>
        </div>
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-[130px] shrink-0 text-muted-foreground">{k}</dt>
      <dd className="min-w-0 break-words font-medium text-foreground">{v}</dd>
    </div>
  );
}
