'use client';

import React, { useState } from 'react';
import { AlertTriangle, FlaskConical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToastHelpers } from '@/components/ui/Toast';
import { useVgrEmployeeDocuments } from '@/components/vgr/sections/SetupSection';
import { getEmployeeDocLabel } from '@/lib/documents/employee-doc-types';
import { formatNLDate, type VGRBody, type VGRData, type VGRTestSummary } from '@/lib/vgr/schema';

/**
 * Test-report summarizer (distinct from section generation). Produces a draft the adviser can
 * insert into "Kwaliteiten en vaardigheden onderzoek" (scores + texts + beroepen + toelichting).
 */
export function VgrTestSummaryPanel({
  data,
  employeeId,
  updateBody,
  updateField,
}: {
  data: VGRData;
  employeeId: string;
  updateBody: <K extends keyof VGRBody>(section: K, patch: Partial<VGRBody[K]>) => void;
  updateField: (key: string, value: unknown) => void;
}) {
  const docs = useVgrEmployeeDocuments(employeeId);
  const { showError, showSuccess } = useToastHelpers();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const drafts = (data.test_summaries ?? []).filter((t) => t.status === 'draft');
  const candidates = docs.filter((d) => d.type === 'extra' || d.type === 'cv' || /test|rapport/i.test(String(d.name ?? '')));

  const run = async () => {
    setBusy(true);
    setIssues([]);
    try {
      const res = await fetch('/api/vgr/test-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, documentIds: selected }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.details || json.error || 'Samenvatting mislukt');
      const summary = json.summary as VGRTestSummary;
      updateField('test_summaries', [summary, ...(data.test_summaries ?? []).filter((t) => t.status !== 'draft')]);
      setIssues(Array.isArray(json.issues) ? json.issues : []);
      showSuccess('Testsamenvatting gereed', 'Controleer de samenvatting en voeg deze in.');
    } catch (err) {
      showError('AI-fout', err instanceof Error ? err.message : 'Samenvatting mislukt');
    } finally {
      setBusy(false);
    }
  };

  const insert = (t: VGRTestSummary) => {
    const ko = data.body.kwaliteiten_onderzoek;
    const selectedIds = new Set(ko.selected);
    if (t.personality_scores) selectedIds.add('persoonlijkheidstest');
    if (t.occupations.length) selectedIds.add('beroepen_arbeidsmarkt');
    const blocks = { ...ko.blocks };
    const summaryTarget = t.personality_scores ? 'persoonlijkheidstest' : [...selectedIds][0] ?? 'persoonlijkheidstest';
    blocks[summaryTarget] = { ...(blocks[summaryTarget] ?? { items: [], standaardtekst: true }), toelichting: t.summary_text };
    updateBody('kwaliteiten_onderzoek', {
      selected: [...selectedIds],
      blocks,
      ...(t.personality_scores ? { persoonlijkheid_scores: t.personality_scores } : {}),
      ...(t.occupations.length ? { beroepen: t.occupations } : {}),
    });
    updateField(
      'test_summaries',
      (data.test_summaries ?? []).map((x) => (x.id === t.id ? { ...x, status: 'inserted' } : x))
    );
    showSuccess('Ingevoegd', 'Testsamenvatting staat in "Kwaliteiten en vaardigheden onderzoek".');
  };

  const dismiss = (t: VGRTestSummary) => {
    updateField(
      'test_summaries',
      (data.test_summaries ?? []).map((x) => (x.id === t.id ? { ...x, status: 'rejected' } : x))
    );
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed border-[#2d8f82]/40 bg-[#2d8f82]/[0.04] p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#2d8f82]">
        <FlaskConical className="h-4 w-4" aria-hidden />
        Testrapporten samenvatten
      </div>
      <p className="text-xs text-muted-foreground">
        Selecteer de geüploade testrapporten (persoonlijkheids-, beroepskeuze-, competentie-, drijfverentest). Alleen aanwezige testen
        worden benoemd; percentages worden exact overgenomen; beroepen nooit aangevuld.
      </p>
      {candidates.length ? (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {candidates.map((d) => (
            <label key={d.id} className="flex cursor-pointer items-center gap-2 rounded border bg-white px-2 py-1 text-xs">
              <input
                type="checkbox"
                className="h-3.5 w-3.5"
                checked={selected.includes(d.id)}
                onChange={(e) => setSelected((s) => (e.target.checked ? [...s, d.id] : s.filter((x) => x !== d.id)))}
              />
              <span className="truncate">
                <span className="text-muted-foreground">{getEmployeeDocLabel(d.type ?? '')} · </span>
                {d.name}
                {d.uploaded_at ? <span className="text-muted-foreground"> ({formatNLDate(d.uploaded_at)})</span> : null}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Geen testrapporten gevonden bij deze werknemer (upload ze als "Overig" bij de documenten).</p>
      )}
      <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={busy || !selected.length} onClick={() => void run()}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <FlaskConical className="h-3.5 w-3.5" aria-hidden />}
        Samenvatting genereren
      </Button>

      {issues.length ? (
        <ul className="space-y-0.5 text-xs text-amber-900">
          {issues.map((i, n) => (
            <li key={n} className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" aria-hidden />
              {i}
            </li>
          ))}
        </ul>
      ) : null}

      {drafts.map((t) => (
        <div key={t.id} className="space-y-2 rounded border border-border bg-white p-2">
          <div className="text-xs text-muted-foreground">
            Concept {formatNLDate(t.generated_at)} · testen: {t.tests_present.join(', ') || '—'} · beroepen: {t.occupations.length}
          </div>
          <pre className="max-h-[260px] overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-neutral-800">{t.summary_text}</pre>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => dismiss(t)}>
              Verwerpen
            </Button>
            <Button type="button" size="sm" className="h-7 text-xs" onClick={() => insert(t)}>
              Invoegen in Kwaliteiten en vaardigheden
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
