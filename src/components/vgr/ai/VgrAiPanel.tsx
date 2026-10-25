'use client';

import React, { useState } from 'react';
import { AlertTriangle, Check, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToastHelpers } from '@/components/ui/Toast';
import { useVGRInstance } from '@/context/VGRInstanceContext';
import { VGR_AI_SECTIONS, isVgrAiSectionId, type VGRAiSectionId } from '@/lib/vgr/ai/sections';
import type { VGRAiProposal, VGRBody, VGRData } from '@/lib/vgr/schema';

type BodyPatch = { [K in keyof VGRBody]?: Partial<VGRBody[K]> };

export function VgrAiPanel({
  sectionId,
  data,
  vgrInstanceId,
  employeeId,
  patchBody,
}: {
  sectionId: keyof VGRBody;
  data: VGRData;
  vgrInstanceId: string;
  employeeId: string;
  patchBody: (patch: BodyPatch) => void;
}) {
  if (!isVgrAiSectionId(sectionId)) return null;
  return <VgrAiPanelInner sectionId={sectionId} data={data} vgrInstanceId={vgrInstanceId} employeeId={employeeId} patchBody={patchBody} />;
}

function VgrAiPanelInner({
  sectionId,
  data,
  vgrInstanceId,
  employeeId,
  patchBody,
}: {
  sectionId: VGRAiSectionId;
  data: VGRData;
  vgrInstanceId: string;
  employeeId: string;
  patchBody: (patch: BodyPatch) => void;
}) {
  const { updateField } = useVGRInstance();
  const { showError, showSuccess } = useToastHelpers();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const proposal: VGRAiProposal | undefined = data.ai_proposals?.[sectionId];
  const def = VGR_AI_SECTIONS[sectionId];
  const fieldCount = def.fields(data).length;

  const storeProposal = (p: VGRAiProposal | null) => {
    const next = { ...(data.ai_proposals ?? {}) };
    if (p) next[sectionId] = p;
    else delete next[sectionId];
    updateField('ai_proposals', next);
  };

  const generate = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/vgr/generate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, vgrInstanceId, sectionId, data, instruction: instruction.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.details || json.error || 'Genereren mislukt');
      storeProposal(json.proposal as VGRAiProposal);
      setOpen(true);
      showSuccess('Voorstel gereed', `AI-voorstel voor "${def.label}" staat klaar ter controle.`);
    } catch (err) {
      showError('AI-fout', err instanceof Error ? err.message : 'Genereren mislukt');
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!proposal) return;
    const { __fields, __suggesties, ...patch } = proposal.patch as Record<string, unknown>;
    void __fields;
    void __suggesties;
    patchBody(patch as BodyPatch);
    storeProposal({ ...proposal, status: 'applied' });
    setOpen(false);
    showSuccess('Overgenomen', 'Het voorstel is in de rapportage gezet. Controleer en pas aan waar nodig.');
  };

  const reject = () => {
    if (!proposal) return;
    storeProposal({ ...proposal, status: 'rejected' });
    setOpen(false);
  };

  const fields = (proposal?.patch?.__fields ?? {}) as Record<string, string>;
  const suggesties = (proposal?.patch?.__suggesties ?? {}) as Record<string, string>;
  const hasContent = Object.values(fields).some((v) => v && v.trim());

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        {proposal && proposal.status === 'proposed' ? (
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1 border-[#6d2a96]/40 px-2 text-xs text-[#6d2a96]" onClick={() => setOpen((o) => !o)}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Voorstel bekijken
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs text-[#6d2a96] hover:bg-[#6d2a96]/10"
          disabled={busy || fieldCount === 0}
          title={fieldCount === 0 ? 'Vink eerst interventies aan' : 'Genereer voorstel op basis van de brondocumenten'}
          onClick={() => (open || instruction ? void generate() : setOpen(true))}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
          {proposal ? 'Opnieuw' : 'AI-voorstel'}
        </Button>
      </div>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-[min(560px,80vw)] rounded-lg border border-[#6d2a96]/30 bg-white p-3 text-sm shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-[#6d2a96]">AI-voorstel · {def.label}</span>
            <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Sluiten" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="mb-1 block text-xs font-medium text-muted-foreground">Extra instructie (optioneel)</label>
          <Textarea
            rows={2}
            value={instruction}
            placeholder='bijv. "maak minder stellig", "zet de vorige maand in de verleden tijd", "onderbouw de beperkte sollicitaties"'
            className="mb-2 min-h-[44px] text-xs"
            onChange={(e) => setInstruction(e.target.value)}
          />
          <div className="mb-3 flex items-center gap-2">
            <Button type="button" size="sm" className="h-7 gap-1 bg-[#6d2a96] text-xs hover:bg-[#5a2280]" disabled={busy} onClick={() => void generate()}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
              {proposal ? 'Opnieuw genereren' : 'Genereren'}
            </Button>
            <span className="text-xs text-muted-foreground">
              Bronnen: {data.vgr_meta.source_document_ids.length ? `${data.vgr_meta.source_document_ids.length} geselecteerd (Stap 1)` : 'alleen rapportagegegevens'}
            </span>
          </div>

          {proposal && proposal.status === 'proposed' ? (
            <div className="space-y-3">
              {hasContent ? (
                <div className="max-h-[320px] space-y-2 overflow-y-auto rounded border border-border/60 bg-muted/20 p-2">
                  {Object.entries(fields)
                    .filter(([, v]) => v && v.trim())
                    .map(([k, v]) => (
                      <div key={k}>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{labelForField(k)}</div>
                        <p className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-800">{v}</p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">Geen tekst gegenereerd — zie opmerkingen hieronder.</p>
              )}

              {Object.values(suggesties).some(Boolean) ? (
                <div className="rounded border border-sky-200 bg-sky-50 px-2 py-1.5 text-xs text-sky-900">
                  <span className="font-semibold">Suggesties (zelf instellen): </span>
                  {Object.entries(suggesties)
                    .filter(([, v]) => v)
                    .map(([k, v]) => `${labelForField(k)}: ${v}`)
                    .join(' · ')}
                </div>
              ) : null}

              {proposal.notes.length ? (
                <ul className="space-y-0.5 text-xs text-amber-900">
                  {proposal.notes.map((n, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" aria-hidden />
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {proposal.evidence.length ? <p className="text-[11px] text-muted-foreground">Gebruikt: {proposal.evidence.join(' · ')}</p> : null}

              <div className="flex items-center justify-end gap-2 border-t border-border pt-2">
                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={reject}>
                  Verwerpen
                </Button>
                <Button type="button" size="sm" className="h-7 gap-1 text-xs" disabled={!hasContent} onClick={apply}>
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  Overnemen
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function labelForField(key: string): string {
  if (key.startsWith('toelichting__')) return `Toelichting · ${key.slice('toelichting__'.length).replace(/_/g, ' ')}`;
  if (key.startsWith('score__')) return `Score · ${key.slice('score__'.length).replace(/_/g, ' ')}`;
  if (key.startsWith('tekst__')) return `Tekst · ${key.slice('tekst__'.length).replace(/_/g, ' ')}`;
  return key.replace(/_/g, ' ');
}
