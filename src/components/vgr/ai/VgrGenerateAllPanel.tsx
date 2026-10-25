'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [progress, setProgress] = useState('');

  const run = async () => {
    setBusy(true);
    const proposals = { ...(data.ai_proposals ?? {}) };
    let ok = 0;
    let failed = 0;
    try {
      for (const sectionId of VGR_AI_SECTION_IDS) {
        const def = VGR_AI_SECTIONS[sectionId];
        if (!def.fields(data).length) continue;
        setProgress(def.label);
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
      setProgress('');
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-[#702A90]">Eerste concept (AI)</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Genereert per onderdeel een voorstel op basis van de geselecteerde brondocumenten. Niets wordt automatisch
        overgenomen; PoW-tredes en medische ja/nee-keuzes blijven van de loopbaanadviseur.
      </p>
      <Button type="button" size="sm" className="h-8 gap-1.5 bg-[#702A90] hover:bg-[#5a1f75]" disabled={busy} onClick={() => void run()}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
        {busy ? `Bezig: ${progress}…` : 'Genereer eerste concept'}
      </Button>
    </section>
  );
}
