'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AutofillProgressOverlay,
  type AutofillProgressState,
} from '@/components/ui/AutofillProgressOverlay';
import { useToastHelpers } from '@/components/ui/Toast';
import { useVGRInstance } from '@/context/VGRInstanceContext';
import { VGR_AI_SECTION_IDS, VGR_AI_SECTIONS } from '@/lib/vgr/ai/sections';
import type { VGRAiProposal, VGRData } from '@/lib/vgr/schema';

/**
 * Optional first-draft pass: generate a proposal per body section sequentially.
 * Nothing is auto-applied — the adviser reviews each proposal in the body step.
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
  const [busy, setBusy] = useState(false);
  const [autofillProgress, setAutofillProgress] = useState<AutofillProgressState | null>(null);

  const run = async () => {
    const runnable = VGR_AI_SECTION_IDS.filter((sectionId) =>
      VGR_AI_SECTIONS[sectionId].fields(data).length > 0
    );
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
      showSuccess(
        'Eerste concept',
        failed
          ? `${ok} onderdelen klaar, ${failed} mislukt. Open Stap 4 om voorstellen over te nemen.`
          : `${ok} voorstellen klaar. Open Stap 4 om ze te controleren en over te nemen.`
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
        Genereert per onderdeel een voorstel op basis van de geselecteerde brondocumenten. Niets wordt automatisch
        overgenomen; PoW-tredes en medische ja/nee-keuzes blijven van de loopbaanadviseur.
      </p>
      <Button type="button" size="sm" className="h-8 gap-1.5 bg-[#702A90] hover:bg-[#5a1f75]" disabled={busy} onClick={() => void run()}>
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Genereer eerste concept
      </Button>
    </section>
  );
}
