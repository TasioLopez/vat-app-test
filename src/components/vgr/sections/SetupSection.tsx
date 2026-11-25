'use client';

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { CalendarRange, FileText, History, Target } from 'lucide-react';
import { GegevensEditorSection } from '@/components/tp2026/GegevensEditorSection';
import FieldControl from '@/components/tp2026/FieldControl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase/client';
import { isStagingEnv } from '@/lib/auth/staging-only';
import { getEmployeeDocLabel } from '@/lib/documents/employee-doc-types';
import { formatNLDateForDoc } from '@/lib/tp/date-line-breaks';
import {
  VGR_TRAJECT_DOEL_OPTIONS,
  newVgrId,
  trajectDoelLabel,
  type VGRData,
  type VGRImpactRegenResult,
  type VGRReportType,
  type VGRTrajectDoel,
} from '@/lib/vgr/schema';
import {
  applyConceptVgrDefaults,
  conceptVgrReportTypeLabel,
  resolveConceptVgrDefaults,
} from '@/lib/vgr/lifecycle';
import {
  applyWiaFinalScaffold,
  formatVgrTimelineText,
  type VgrTimelineEntry,
} from '@/lib/vgr/export';
import { vgrPeriodeText } from '@/lib/vgr/period';
import { computeVgrPreflight } from '@/lib/vgr/preflight';
import {
  pickLatestIdsByType,
  sortSourcesForSelection,
} from '@/lib/vgr/sources/selection';
import { VgrSourceStartWizard } from '@/components/vgr/sources/VgrSourceStartWizard';
import type { UploadedSourceInfo } from '@/components/vgr/sources/VgrMultiUploadZone';

export type VGREmployeeDocument = {
  id: string;
  type: string | null;
  name: string | null;
  uploaded_at: string | null;
  document_date?: string | null;
};

export function useVgrEmployeeDocuments(
  employeeId: string,
  refreshKey = 0
): VGREmployeeDocument[] {
  const [docs, setDocs] = useState<VGREmployeeDocument[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // document_date may be missing until staging migration is applied — fall back.
      let query = (supabase as any)
        .from('documents')
        .select('id, type, name, uploaded_at, document_date')
        .eq('employee_id', employeeId)
        .neq('type', 'vgr')
        .neq('type', 'tp')
        .neq('type', 'intake')
        .order('uploaded_at', { ascending: false });
      let { data, error } = await query;
      if (error && /document_date/i.test(String(error.message || ''))) {
        ({ data, error } = await (supabase as any)
          .from('documents')
          .select('id, type, name, uploaded_at')
          .eq('employee_id', employeeId)
          .neq('type', 'vgr')
          .neq('type', 'tp')
          .neq('type', 'intake')
          .order('uploaded_at', { ascending: false }));
      }
      if (!cancelled && !error) setDocs((data || []) as VGREmployeeDocument[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [employeeId, refreshKey]);
  return docs;
}

export function SetupEditor({
  data,
  employeeId,
  vgrInstanceId,
  updateMeta,
  updateBody,
  setVGRData,
}: {
  data: VGRData;
  employeeId: string;
  vgrInstanceId: string;
  updateMeta: (patch: Partial<VGRData['vgr_meta']>) => void;
  updateBody: <K extends keyof VGRData['body']>(section: K, patch: Partial<VGRData['body'][K]>) => void;
  setVGRData: Dispatch<SetStateAction<VGRData>>;
}) {
  const staging = isStagingEnv();
  const [docsRefreshKey, setDocsRefreshKey] = useState(0);
  const docs = useVgrEmployeeDocuments(employeeId, docsRefreshKey);
  const sortedDocs = useMemo(() => sortSourcesForSelection(docs), [docs]);
  const meta = data.vgr_meta;
  const doel = data.body.doelstelling_traject;
  const selectedDocs = new Set(meta.source_document_ids);
  const [goalChangeDate, setGoalChangeDate] = useState(meta.report_date || '');
  const [goalChangeTo, setGoalChangeTo] = useState<VGRTrajectDoel>('');
  const [dossierSyncBusy, setDossierSyncBusy] = useState(false);
  const [dossierSyncNote, setDossierSyncNote] = useState<string | null>(null);
  const [impactBusy, setImpactBusy] = useState(false);
  const [conceptNote, setConceptNote] = useState<string | null>(null);
  const [wiaTimeline, setWiaTimeline] = useState<VgrTimelineEntry[] | null>(null);
  const [wiaBusy, setWiaBusy] = useState(false);
  const [wizardMode, setWizardMode] = useState<'choose' | 'upload'>('choose');
  const conceptDefaults = resolveConceptVgrDefaults(data);
  const sourceIntake = meta.source_intake;
  const showSourceWizard =
    staging &&
    (sourceIntake === undefined ||
      sourceIntake === 'pending' ||
      sourceIntake === 'uploaded' ||
      wizardMode === 'upload');

  const toggleDoc = (id: string) => {
    const next = new Set(selectedDocs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateMeta({ source_document_ids: Array.from(next) });
  };

  const selectAllDocs = () => updateMeta({ source_document_ids: docs.map((d) => d.id) });
  const selectLatestPerType = () =>
    updateMeta({ source_document_ids: pickLatestIdsByType(docs) });

  const refreshDocs = useCallback(() => setDocsRefreshKey((k) => k + 1), []);

  const onDumpUploaded = useCallback(
    (uploaded: UploadedSourceInfo[]) => {
      refreshDocs();
      const next = new Set(meta.source_document_ids);
      for (const u of uploaded) next.add(u.id);
      updateMeta({
        source_document_ids: Array.from(next),
        source_intake: 'uploaded',
      });
    },
    [meta.source_document_ids, refreshDocs, updateMeta]
  );

  /** Phase 2: CLASSIFY→EXTRACT→MERGE into vgr_dossiers (does not write report text — D01). */
  const syncDossier = async () => {
    setDossierSyncBusy(true);
    setDossierSyncNote(null);
    try {
      const res = await fetch('/api/vgr/dossier/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          documentIds: selectedDocs.size ? Array.from(selectedDocs) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.details || json.error || 'Dossier sync mislukt');
      const c = json.counts || {};
      setDossierSyncNote(
        `Dossier bijgewerkt: ${c.sources ?? 0} bronnen, ${c.assertions ?? 0} claims, ${c.activities ?? 0} activiteiten` +
          (c.issues ? `, ${c.issues} open issues` : '') +
          '. AI-voorstellen gebruiken deze feiten; Overnemen blijft handmatig.',
      );
      // Phase 3: refresh impact list after sync (T10 collisions).
      await refreshImpact();
    } catch (err) {
      setDossierSyncNote(err instanceof Error ? err.message : 'Dossier sync mislukt');
    } finally {
      setDossierSyncBusy(false);
    }
  };

  const refreshImpact = async () => {
    setImpactBusy(true);
    try {
      const res = await fetch('/api/vgr/impact-regen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, vgrInstanceId, data }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.details || json.error || 'Impact mislukt');
      const impact = json.impact as VGRImpactRegenResult;
      setVGRData((prev) => ({ ...prev, impact_regen: impact }));
    } catch (err) {
      setDossierSyncNote(err instanceof Error ? err.message : 'Impact-berekening mislukt');
    } finally {
      setImpactBusy(false);
    }
  };

  /** G11: Concept-VGR maken — apply period/type defaults + show preflight; proposals stay until Overnemen (D01). */
  const makeConceptVgr = () => {
    setConceptNote(null);
    setWiaTimeline(null);
    setVGRData((prev) => applyConceptVgrDefaults(prev));
    const selectedTypes = docs
      .filter((d) => selectedDocs.has(d.id) || selectedDocs.size === 0)
      .map((d) => String(d.type || ''))
      .filter(Boolean);
    const pf = computeVgrPreflight(applyConceptVgrDefaults(data), selectedTypes);
    const ready = pf.modules.filter((m) => m.status === 'READY').length;
    const gaps = pf.questions.length;
    setConceptNote(
      `Concept-VGR voorbereid (${conceptVgrReportTypeLabel(conceptDefaults.report_type)}). ` +
        `Preflight: ${ready}/${pf.modules.length} modules klaar` +
        (gaps ? `, ${gaps} gerichte vraag/vragen` : '') +
        '. Genereer AI-voorstellen via Controle → Genereer alle schrijfbare onderdelen; Overnemen blijft handmatig.',
    );
  };

  /** Phase 4 / G12 / T22: WIA_FINAL scaffold from prior final VGR snapshots (no invented consult — D08). */
  const makeWiaConcept = async () => {
    setWiaBusy(true);
    setConceptNote(null);
    try {
      const { data: finals, error } = await (supabase as any)
        .from('vgr_instances')
        .select('id, data_json, version, status')
        .eq('employee_id', employeeId)
        .eq('status', 'final')
        .order('version', { ascending: true });
      if (error) throw new Error(error.message || 'Kon eerdere VGR’s niet laden');
      const priorReports = ((finals || []) as Array<{ id: string; data_json: Record<string, unknown> }>)
        .filter((row) => row.id !== vgrInstanceId)
        .map((row) => ({ id: row.id, data: row.data_json || {} }));
      const { data: next, scaffold } = applyWiaFinalScaffold(data, priorReports);
      setVGRData(next);
      setWiaTimeline(scaffold.timeline);
      setConceptNote(
        `WIA / eindrapportage-concept voorbereid (v${scaffold.version}). ` +
          `Tijdlijn: ${scaffold.timeline.length} eerdere VGR(s). ` +
          scaffold.warnings.join(' ') +
          ' AI-voorstellen blijven tot Overnemen (D01); export blijft PDF (D05).',
      );
    } catch (err) {
      setConceptNote(err instanceof Error ? err.message : 'WIA-concept mislukt');
    } finally {
      setWiaBusy(false);
    }
  };

  const setReportType = (type: VGRReportType) => {
    if (type === 'WIA_FINAL') {
      void makeWiaConcept();
      return;
    }
    setWiaTimeline(null);
    updateMeta({
      report_type: type,
      version: type === 'VGR1' ? 1 : Math.max(meta.version || 1, 2),
    });
  };

  const registerGoalChange = () => {
    if (!goalChangeTo || !goalChangeDate) return;
    const from = doel.huidige || doel.bij_intake;
    const changed = from !== goalChangeTo;
    updateBody('doelstelling_traject', {
      huidige: goalChangeTo,
      history: [
        { id: newVgrId('goal'), date: goalChangeDate, from, to: goalChangeTo, changed, toelichting: '' },
        ...doel.history,
      ],
    });
    if (changed) updateBody('wijzigingen_doelstelling', { aanwezig: true });
    setGoalChangeTo('');
  };

  const impact = data.impact_regen;

  return (
    <div className="space-y-6">
      {showSourceWizard ? (
        <VgrSourceStartWizard
          employeeId={employeeId}
          mode={wizardMode === 'upload' || sourceIntake === 'uploaded' ? 'upload' : 'choose'}
          onChooseExisting={() => {
            setWizardMode('choose');
            updateMeta({
              source_intake: 'existing',
              source_document_ids:
                meta.source_document_ids.length > 0
                  ? meta.source_document_ids
                  : pickLatestIdsByType(docs),
            });
          }}
          onStartUpload={() => {
            setWizardMode('upload');
            updateMeta({ source_intake: 'uploaded' });
          }}
          onUploaded={onDumpUploaded}
          onFinishUpload={() => {
            setWizardMode('choose');
            updateMeta({
              source_intake: 'done',
              source_document_ids:
                meta.source_document_ids.length > 0
                  ? meta.source_document_ids
                  : pickLatestIdsByType(docs),
            });
          }}
        />
      ) : null}

      <GegevensEditorSection title="Concept-VGR maken" icon={FileText}>
        <p className="text-sm text-muted-foreground">
          Expliciete opdracht om een <span className="font-medium text-foreground">concept</span> te maken (geen
          automatische publicatie). Rapporttype en periode worden gevuld vanuit TP / vorige VGR; AI-tekst blijft
          voorstel tot Overnemen (D01). WIA/eindrapportage is een scaffold (G12); volledig WIA-consult volgt later
          (D08). Export: PDF alleen (D05).
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-md border bg-muted/40 px-3 py-2">
            <div className="mb-1 text-xs text-muted-foreground">Rapporttype</div>
            <Select
              value={meta.report_type || conceptDefaults.report_type}
              onValueChange={(v) => setReportType(v as VGRReportType)}
            >
              <SelectTrigger className="h-8 w-full bg-background text-sm font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VGR1">VGR1 (concept)</SelectItem>
                <SelectItem value="VGR_FOLLOWUP">Vervolg-VGR (concept)</SelectItem>
                <SelectItem value="WIA_FINAL">WIA / eindrapportage (scaffold)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2">
            <div className="text-xs text-muted-foreground">Versie</div>
            <div className="font-medium">{meta.version || conceptDefaults.version}</div>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2">
            <div className="text-xs text-muted-foreground">Periode</div>
            <div className="font-medium">{vgrPeriodeText(data) || '—'}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="bg-[#702A90] hover:bg-[#5a1f75]" onClick={makeConceptVgr}>
            Concept-VGR maken
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={wiaBusy}
            onClick={() => void makeWiaConcept()}
          >
            {wiaBusy ? 'WIA…' : 'Concept WIA/eindrapportage'}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={impactBusy} onClick={() => void refreshImpact()}>
            {impactBusy ? 'Impact…' : 'Impact getroffen modules'}
          </Button>
        </div>
        {conceptNote ? (
          <p className="rounded border border-[#702A90]/25 bg-[#702A90]/5 px-2 py-1.5 text-xs text-[#3d1850]">
            {conceptNote}
          </p>
        ) : null}
        {wiaTimeline?.length ? (
          <div className="rounded-md border border-border p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cumulatieve VGR-tijdlijn (T22)
            </p>
            <pre className="whitespace-pre-wrap font-sans text-xs text-foreground">{formatVgrTimelineText(wiaTimeline)}</pre>
          </div>
        ) : null}
        {impact?.hits?.length ? (
          <div className="rounded-md border border-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Impact sinds dossier-update ({new Date(impact.computed_at).toLocaleString('nl-NL')})
            </p>
            <ul className="space-y-1.5 text-sm">
              {impact.hits.map((h) => (
                <li key={h.module_id} className="flex flex-wrap items-baseline justify-between gap-2 rounded border px-2 py-1.5">
                  <span>
                    <span className="font-medium">{h.module_id}</span>
                    <span className="text-muted-foreground"> — {h.reason}</span>
                  </span>
                  {h.manual_override_collision ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">
                      Collision · vergrendeld
                    </span>
                  ) : h.required_human_review ? (
                    <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-semibold text-sky-900">Review</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Vergrendelde modules worden niet stilzwijgend overschreven (T10). Genereer voorstellen per onderdeel of via
              Controle; Overnemen blijft handmatig.
            </p>
          </div>
        ) : null}
      </GegevensEditorSection>

      <GegevensEditorSection title="Rapportageperiode" icon={CalendarRange}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldControl
            field={{ key: 'period_start', label: 'Periode van', type: 'date' }}
            value={meta.period_start}
            onChange={(v) => updateMeta({ period_start: v })}
          />
          <FieldControl
            field={{ key: 'period_end', label: 'Periode tot en met', type: 'date' }}
            value={meta.period_end}
            onChange={(v) => updateMeta({ period_end: v })}
          />
          <FieldControl
            field={{ key: 'report_date', label: 'Datum rapportage', type: 'date' }}
            value={meta.report_date}
            onChange={(v) => updateMeta({ report_date: v })}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          In de rapportage: <span className="font-medium text-foreground">{vgrPeriodeText(data) || '—'}</span>
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Versie / volgnummer</label>
            <Input
              type="number"
              min={1}
              value={meta.version}
              onChange={(e) => {
                const version = Math.max(1, parseInt(e.target.value || '1', 10) || 1);
                updateMeta({
                  version,
                  report_type:
                    meta.report_type === 'WIA_FINAL'
                      ? 'WIA_FINAL'
                      : version >= 2
                        ? 'VGR_FOLLOWUP'
                        : 'VGR1',
                });
              }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Vervolgrapportage</label>
            <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              {meta.prior_vgr_instance_id
                ? 'Ja — historie uit de vorige definitieve rapportage is overgenomen.'
                : 'Nee — eerste voortgangsrapportage (gegevens uit trajectplan overgenomen).'}
            </div>
          </div>
        </div>
      </GegevensEditorSection>

      <GegevensEditorSection title="Doelstelling traject" icon={Target}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Doelstelling bij intake</label>
            <Select
              value={doel.bij_intake || undefined}
              onValueChange={(v) => {
                updateBody('doelstelling_traject', {
                  bij_intake: v as VGRTrajectDoel,
                  huidige: doel.huidige || (v as VGRTrajectDoel),
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecteer" />
              </SelectTrigger>
              <SelectContent>
                {VGR_TRAJECT_DOEL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Huidige doelstelling</label>
            <div className="rounded-md border bg-muted px-3 py-2 text-sm">
              {trajectDoelLabel(doel.huidige) || '—'}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-dashed border-border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Wijziging doelstelling registreren
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nieuwe doelstelling</label>
              <Select value={goalChangeTo || undefined} onValueChange={(v) => setGoalChangeTo(v as VGRTrajectDoel)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecteer" />
                </SelectTrigger>
                <SelectContent>
                  {VGR_TRAJECT_DOEL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Datum</label>
              <Input type="date" value={goalChangeDate} onChange={(e) => setGoalChangeDate(e.target.value)} />
            </div>
            <Button type="button" variant="outline" size="sm" disabled={!goalChangeTo} onClick={registerGoalChange}>
              Toevoegen
            </Button>
          </div>
        </div>

        {doel.history.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Historie</p>
            <ul className="space-y-1.5 text-sm">
              {doel.history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-1.5">
                  <span>
                    <span className="text-muted-foreground">{formatNLDateForDoc(h.date)}</span> —{' '}
                    {h.changed ? (
                      <>
                        {trajectDoelLabel(h.from) || '—'} → <span className="font-medium">{trajectDoelLabel(h.to)}</span>
                      </>
                    ) : (
                      <>ongewijzigd: {trajectDoelLabel(h.to)}</>
                    )}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      updateBody('doelstelling_traject', {
                        history: doel.history.filter((x) => x.id !== h.id),
                      })
                    }
                  >
                    Verwijderen
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </GegevensEditorSection>

      <GegevensEditorSection title="Brondocumenten voor AI-voorstellen" icon={FileText}>
        <p className="text-xs text-muted-foreground">
          Selecteer de documenten uit het dossier die voor deze rapportageperiode gebruikt mogen worden
          (gespreksverslagen, spreekuurrapportages, FML/IZP/LAB, AD-rapport, testrapporten). AI-voorstellen
          gebruiken trajectplan + app-context + uitsluitend deze bronnen en worden nooit automatisch
          overgenomen (D01). Synchroniseer eerst het claim/activity-dossier. Export: PDF alleen (D05).
          {staging
            ? ' Meerdere versies per type zijn toegestaan; kies de nieuwste of een specifieke bron via documentdatum en uploadtijd.'
            : null}
        </p>
        {staging && (sourceIntake === 'existing' || sourceIntake === 'done') ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setWizardMode('upload');
                updateMeta({ source_intake: 'uploaded' });
              }}
            >
              Meer bestanden uploaden
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setWizardMode('choose');
                updateMeta({ source_intake: 'pending' });
              }}
            >
              Bronkeuze opnieuw
            </Button>
          </div>
        ) : null}
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen documenten in het dossier.</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {selectedDocs.size} van {docs.length} geselecteerd
              </span>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={selectAllDocs}>
                  Alles
                </Button>
                {staging ? (
                  <Button type="button" variant="ghost" size="sm" onClick={selectLatestPerType}>
                    Nieuwste per type
                  </Button>
                ) : null}
                <Button type="button" variant="ghost" size="sm" onClick={() => updateMeta({ source_document_ids: [] })}>
                  Geen
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={dossierSyncBusy}
                  onClick={() => void syncDossier()}
                >
                  {dossierSyncBusy ? 'Dossier sync…' : 'Dossier synchroniseren'}
                </Button>
              </div>
            </div>
            {dossierSyncNote ? (
              <p className="rounded border border-border/60 bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
                {dossierSyncNote}
              </p>
            ) : null}
            <ul className="divide-y rounded-md border">
              {sortedDocs.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectedDocs.has(d.id)}
                    onChange={() => toggleDoc(d.id)}
                  />
                  <span className="min-w-0 flex-1 truncate">{d.name || '(zonder naam)'}</span>
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {getEmployeeDocLabel(d.type || '')}
                  </span>
                  <span
                    className="shrink-0 text-xs text-muted-foreground"
                    title="Documentdatum (uit bestand) · Uploadtijd"
                  >
                    {d.document_date
                      ? `Doc ${formatNLDateForDoc(d.document_date.slice(0, 10))}`
                      : 'Doc —'}
                    {' · '}
                    {d.uploaded_at
                      ? `Upload ${formatNLDateForDoc(d.uploaded_at.slice(0, 10))}`
                      : 'Upload —'}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </GegevensEditorSection>

      {meta.prior_vgr_instance_id ? (
        <GegevensEditorSection title="Vorige rapportage" icon={History}>
          <p className="text-sm text-muted-foreground">
            Historie (doelstelling, bijstellingen belastbaarheid, POW-metingen, Leernavigator, planning) is
            overgenomen uit de vorige definitieve rapportage. Periodegebonden onderdelen (sollicitaties, inzet,
            interventies in deze periode) beginnen leeg.
          </p>
        </GegevensEditorSection>
      ) : null}
    </div>
  );
}
