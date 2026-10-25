'use client';

import { useEffect, useState } from 'react';
import { CalendarRange, FileText, History, Target } from 'lucide-react';
import { GegevensEditorSection } from '@/components/tp2026/GegevensEditorSection';
import FieldControl from '@/components/tp2026/FieldControl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase/client';
import { getEmployeeDocLabel } from '@/lib/documents/employee-doc-types';
import { formatNLDateForDoc } from '@/lib/tp/date-line-breaks';
import {
  VGR_TRAJECT_DOEL_OPTIONS,
  newVgrId,
  trajectDoelLabel,
  type VGRData,
  type VGRTrajectDoel,
} from '@/lib/vgr/schema';
import { vgrPeriodeText } from '@/lib/vgr/period';

export type VGREmployeeDocument = {
  id: string;
  type: string | null;
  name: string | null;
  uploaded_at: string | null;
};

export function useVgrEmployeeDocuments(employeeId: string): VGREmployeeDocument[] {
  const [docs, setDocs] = useState<VGREmployeeDocument[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await (supabase as any)
        .from('documents')
        .select('id, type, name, uploaded_at')
        .eq('employee_id', employeeId)
        .neq('type', 'vgr')
        .neq('type', 'tp')
        .order('uploaded_at', { ascending: false });
      if (!cancelled) setDocs((data || []) as VGREmployeeDocument[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [employeeId]);
  return docs;
}

export function SetupEditor({
  data,
  employeeId,
  updateMeta,
  updateBody,
}: {
  data: VGRData;
  employeeId: string;
  updateMeta: (patch: Partial<VGRData['vgr_meta']>) => void;
  updateBody: <K extends keyof VGRData['body']>(section: K, patch: Partial<VGRData['body'][K]>) => void;
}) {
  const docs = useVgrEmployeeDocuments(employeeId);
  const meta = data.vgr_meta;
  const doel = data.body.doelstelling_traject;
  const selectedDocs = new Set(meta.source_document_ids);
  const [goalChangeDate, setGoalChangeDate] = useState(meta.report_date || '');
  const [goalChangeTo, setGoalChangeTo] = useState<VGRTrajectDoel>('');

  const toggleDoc = (id: string) => {
    const next = new Set(selectedDocs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateMeta({ source_document_ids: Array.from(next) });
  };

  const selectAllDocs = () => updateMeta({ source_document_ids: docs.map((d) => d.id) });

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

  return (
    <div className="space-y-6">
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
              onChange={(e) => updateMeta({ version: Math.max(1, parseInt(e.target.value || '1', 10) || 1) })}
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
          gebruiken uitsluitend deze bronnen en worden nooit automatisch overgenomen.
        </p>
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen documenten in het dossier.</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {selectedDocs.size} van {docs.length} geselecteerd
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={selectAllDocs}>
                  Alles
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => updateMeta({ source_document_ids: [] })}>
                  Geen
                </Button>
              </div>
            </div>
            <ul className="divide-y rounded-md border">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-sm">
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
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {d.uploaded_at ? formatNLDateForDoc(d.uploaded_at.slice(0, 10)) : ''}
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
