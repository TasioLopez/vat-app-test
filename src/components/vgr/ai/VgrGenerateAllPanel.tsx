'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AutofillProgressOverlay,
  type AutofillProgressState,
} from '@/components/ui/AutofillProgressOverlay';
import { useToastHelpers } from '@/components/ui/Toast';
import { useVGRInstance } from '@/context/VGRInstanceContext';
import { useVgrEmployeeDocuments } from '@/components/vgr/sections/SetupSection';
import { VGR_AI_SECTION_IDS, VGR_AI_SECTIONS, vgrAiSectionCanGenerate } from '@/lib/vgr/ai/sections';
import { VGR_APPROVED_RULES_VERSION } from '@/lib/vgr/ai/style-prompt';
import { shouldSkipAiApplyForLock } from '@/lib/vgr/lifecycle';
import { computeVgrPreflight, writableVgrAiSectionIds, type VgrPreflightStatus } from '@/lib/vgr/preflight';
import type { VGRAiProposal, VGRData } from '@/lib/vgr/schema';

const STATUS_LABEL: Record<VgrPreflightStatus, string> = {
  READY: 'Klaar',
  ADDITIONAL_INFORMATION_NEEDED: 'Aanvulling nodig',
  UNKNOWN: 'Onbekend',
  CONFLICT: 'Conflict',
  NOT_YET_RELEVANT: 'Nog niet relevant',
  NOT_APPLICABLE: 'N.v.t.',
};

/**
 * Optional first-draft pass: generate a proposal per writable body section sequentially.
 * Nothing is auto-applied — the adviser reviews each proposal in the body step (D01).
 */
export function VgrGenerateAllPanel({
  data,
  employeeId,
  vgrInstanceId,
}: {
  data: VGRData;
  employeeId: string;
  vgrInstanceId: string;
}) {
  const { updateField } = useVGRInstance();
  const { showError, showSuccess } = useToastHelpers();
  const docs = useVgrEmployeeDocuments(employeeId);
  const [busy, setBusy] = useState(false);
  const [ackConflicts, setAckConflicts] = useState(false);
  const [autofillProgress, setAutofillProgress] = useState<AutofillProgressState | null>(null);

  const selectedTypes = useMemo(() => {
    const selected = new Set(data.vgr_meta.source_document_ids);
    const types = docs.filter((d) => selected.has(d.id) || selected.size === 0).map((d) => String(d.type || ''));
    return types.filter(Boolean);
  }, [data.vgr_meta.source_document_ids, docs]);

  const preflight = useMemo(() => computeVgrPreflight(data, selectedTypes), [data, selectedTypes]);
  const blocked = preflight.blocksGenerateAll && !ackConflicts;

  const runnable = useMemo(() => {
    const writable = new Set(writableVgrAiSectionIds(preflight));
    return VGR_AI_SECTION_IDS.filter(
      (sectionId) =>
        writable.has(sectionId) &&
        vgrAiSectionCanGenerate(VGR_AI_SECTIONS[sectionId], data) &&
        !shouldSkipAiApplyForLock(data, sectionId),
    );
  }, [preflight, data]);

  const skippedCount = VGR_AI_SECTION_IDS.filter((id) => vgrAiSectionCanGenerate(VGR_AI_SECTIONS[id], data)).length - runnable.length;

  const run = async () => {
    if (blocked) return;
    if (!runnable.length) {
      showError('Preflight', 'Geen schrijfbare onderdelen. Beantwoord eerst de openstaande vragen.');
      return;
    }
    const total = Math.max(runnable.length, 1);
    setBusy(true);
    setAutofillProgress({
      currentIndex: 1,
      total,
      currentLabel: 'Voorbereiden…',
    });
    const proposals = { ...(data.ai_proposals ?? {}) };
    let ok = 0;
    let failed = 0;
    try {
      for (let i = 0; i < runnable.length; i++) {
        const sectionId = runnable[i];
        const def = VGR_AI_SECTIONS[sectionId];
        setAutofillProgress({
          currentIndex: i + 1,
          total,
          currentLabel: `${def.label} genereren…`,
        });
        const res = await fetch('/api/vgr/generate-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId, vgrInstanceId, sectionId, data }),
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          failed += 1;
          continue;
        }
        proposals[sectionId] = json.proposal as VGRAiProposal;
        ok += 1;
        updateField('ai_proposals', { ...proposals });
      }
      updateField('vgr_meta', {
        ...data.vgr_meta,
        approved_rules_version: VGR_APPROVED_RULES_VERSION,
      });
      showSuccess(
        'Eerste concept',
        failed
          ? `${ok} onderdelen klaar, ${failed} mislukt${skippedCount ? `, ${skippedCount} overgeslagen (niet schrijfbaar)` : ''}. Open Stap 4 om voorstellen over te nemen.`
          : `${ok} voorstellen klaar${skippedCount ? ` (${skippedCount} overgeslagen: niet schrijfbaar)` : ''}. Open Stap 4 om ze te controleren en over te nemen.`
      );
    } catch (err) {
      showError('AI-fout', err instanceof Error ? err.message : 'Genereren mislukt');
    } finally {
      setBusy(false);
      setAutofillProgress(null);
    }
  };

  return (
    <section className="relative rounded-lg border border-border bg-card p-4 shadow-sm">
      {autofillProgress ? (
        <AutofillProgressOverlay
          progress={autofillProgress}
          title="Eerste concept genereren"
        />
      ) : null}
      <h3 className="mb-2 text-sm font-semibold text-[#702A90]">Eerste concept (AI)</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Genereert per schrijfbaar onderdeel een voorstel op basis van de geselecteerde brondocumenten. Niets wordt
        automatisch overgenomen; PoW-tredes en medische ja/nee-keuzes worden wel als suggestie meegenomen bij Overnemen.
      </p>

      <div className="mb-3 max-h-48 overflow-y-auto rounded border border-border/70 bg-muted/20 p-2">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Volledigheidscheck
        </div>
        <ul className="space-y-1">
          {preflight.modules.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-2 text-xs">
              <span className="min-w-0 flex-1 text-neutral-800">
                {m.label}
                {!m.writable ? (
                  <span className="ml-1 text-[10px] text-amber-800">(niet schrijfbaar)</span>
                ) : null}
              </span>
              <span className="shrink-0 text-muted-foreground">{STATUS_LABEL[m.status]}</span>
            </li>
          ))}
        </ul>
      </div>

      {preflight.questions.length ? (
        <div className="mb-3 rounded border border-sky-200 bg-sky-50 px-2 py-1.5 text-xs text-sky-950">
          <div className="mb-1 font-semibold">Vragen per gap</div>
          <ul className="list-disc space-y-0.5 pl-4">
            {preflight.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {preflight.medicalConflicts.length ? (
        <div className="mb-3 rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
          <div className="mb-1 flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Medische / belastbaarheidsconflicten
          </div>
          <ul className="mb-2 list-disc space-y-0.5 pl-4">
            {preflight.medicalConflicts.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ackConflicts}
              onChange={(e) => setAckConflicts(e.target.checked)}
            />
            Ik heb de conflicten gezien en wil toch genereren
          </label>
        </div>
      ) : null}

      <Button
        type="button"
        size="sm"
        className="h-8 gap-1.5 bg-[#702A90] hover:bg-[#5a1f75]"
        disabled={busy || blocked || runnable.length === 0}
        onClick={() => void run()}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Genereer eerste concept
        {runnable.length ? ` (${runnable.length})` : ''}
      </Button>
    </section>
  );
}
