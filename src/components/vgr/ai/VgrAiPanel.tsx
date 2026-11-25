'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToastHelpers } from '@/components/ui/Toast';
import { useVGRInstance } from '@/context/VGRInstanceContext';
import { useVgrEmployeeDocuments } from '@/components/vgr/sections/SetupSection';
import {
  buildVgrApplyBodyPatch,
  describeVgrAiSuggesties,
  type VgrBodyPatch,
} from '@/lib/vgr/ai/apply-suggesties';
import { VGR_AI_SECTIONS, isVgrAiSectionId, vgrAiSectionCanGenerate, type VGRAiSectionId } from '@/lib/vgr/ai/sections';
import { classifyModuleFeedback, filterPatchForLocks, isModuleLocked } from '@/lib/vgr/lifecycle';
import { computeVgrPreflight } from '@/lib/vgr/preflight';
import type { VGRAiProposal, VGRBody, VGRData } from '@/lib/vgr/schema';

type BodyPatch = VgrBodyPatch;

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
  const docs = useVgrEmployeeDocuments(employeeId);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const proposal: VGRAiProposal | undefined = data.ai_proposals?.[sectionId];
  const def = VGR_AI_SECTIONS[sectionId];
  const canGenerate = vgrAiSectionCanGenerate(def, data);
  const [zoekConfirm, setZoekConfirm] = useState(false);

  const selectedTypes = useMemo(() => {
    const selected = new Set(data.vgr_meta.source_document_ids);
    return docs
      .filter((d) => selected.has(d.id) || selected.size === 0)
      .map((d) => String(d.type || ''))
      .filter(Boolean);
  }, [data.vgr_meta.source_document_ids, docs]);

  const preflightMod = useMemo(() => {
    const pf = computeVgrPreflight(data, selectedTypes);
    return pf.modules.find((m) => m.id === sectionId);
  }, [data, selectedTypes, sectionId]);

  const writable = preflightMod?.writable !== false;
  const gapQuestion = preflightMod?.question;
  const moduleLocked = isModuleLocked(data, sectionId);
  const feedbackPreview = classifyModuleFeedback(instruction);

  const storeProposal = (p: VGRAiProposal | null) => {
    const next = { ...(data.ai_proposals ?? {}) };
    if (p) next[sectionId] = p;
    else delete next[sectionId];
    updateField('ai_proposals', next);
  };

  const generate = async () => {
    if (moduleLocked) {
      showError(
        'Vergrendeld',
        'Dit onderdeel is handmatig vergrendeld (manual_lock). Ontgrendel eerst; regeneratie overschrijft goedgekeurde tekst niet stilzwijgend.',
      );
      return;
    }
    if (!writable) {
      showError(
        'Niet schrijfbaar',
        gapQuestion || 'Dit onderdeel is volgens de preflight niet schrijfbaar. Vul eerst de ontbrekende bron of beantwoord de vraag.',
      );
      return;
    }
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

  const zoekprofielWouldChange = (): boolean => {
    if (sectionId !== 'zoekprofiel' || !proposal) return false;
    const next = String((proposal.patch as Record<string, unknown>)?.zoekprofiel
      ? ((proposal.patch as { zoekprofiel?: { tekst?: string } }).zoekprofiel?.tekst ?? '')
      : (fields.tekst ?? '')).trim();
    const current = String(data.body.zoekprofiel?.tekst ?? '').trim();
    if (!next || !current) return Boolean(next && next !== current);
    return next !== current;
  };

  const apply = () => {
    if (!proposal) return;
    if (moduleLocked) {
      showError(
        'Vergrendeld',
        'Overnemen geblokkeerd: onderdeel is vergrendeld. Ontgrendel om een voorstel toe te passen, of bekijk de impact-collision.',
      );
      return;
    }
    if (zoekprofielWouldChange() && !zoekConfirm) {
      setZoekConfirm(true);
      return;
    }
    const factReview = proposal.notes?.some((n) => /requires_fact_review/i.test(n));
    if (factReview && !zoekConfirm) {
      // Reuse confirm gate for fact-review acknowledgment (T19).
      setZoekConfirm(true);
      return;
    }
    const { patch: merged, refusedQuotes } = buildVgrApplyBodyPatch(data, sectionId, proposal.patch as Record<string, unknown>);
    const { patch: unlocked, skippedLocked } = filterPatchForLocks(data, merged);
    if (!Object.keys(unlocked).length) {
      showError('Niet overgenomen', skippedLocked.length ? 'Alle geraakte onderdelen zijn vergrendeld.' : 'Geen toepasbare wijziging.');
      return;
    }
    patchBody(unlocked);
    if (sectionId === 'zoekprofiel' && zoekprofielWouldChange()) {
      updateField('vgr_meta', {
        ...data.vgr_meta,
        zoekprofiel_changed_at: new Date().toISOString(),
        zoekprofiel_change_note: 'Gewijzigd via AI-voorstel (deskundige bevestigd)',
      });
    }
    storeProposal({ ...proposal, status: 'applied' });
    setZoekConfirm(false);
    setOpen(false);
    if (refusedQuotes.length) {
      showSuccess(
        'Overgenomen (citaten geweigerd)',
        `Lege/verzonnen of AD-als-medisch citaten zijn niet overgenomen: ${refusedQuotes.join('; ')}.`,
      );
    } else {
      showSuccess('Overgenomen', 'Het voorstel is in de rapportage gezet. Controleer en pas aan waar nodig.');
    }
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
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1 border-[#702A90]/40 px-2 text-xs text-[#702A90]" onClick={() => setOpen((o) => !o)}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Voorstel bekijken
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs text-[#702A90] hover:bg-[#702A90]/10"
          disabled={busy || !canGenerate || !writable || moduleLocked}
          title={
            moduleLocked
              ? 'Vergrendeld (manual_lock)'
              : !canGenerate
                ? 'Geen AI-velden voor dit onderdeel'
                : !writable
                  ? gapQuestion || 'Preflight: niet schrijfbaar'
                  : 'Genereer voorstel op basis van de brondocumenten'
          }
          onClick={() => (open || instruction ? void generate() : setOpen(true))}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
          {proposal ? 'Opnieuw' : 'AI-voorstel'}
        </Button>
      </div>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-[min(560px,80vw)] rounded-lg border border-[#702A90]/30 bg-white p-3 text-sm shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-[#702A90]">AI-voorstel · {def.label}</span>
            <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Sluiten" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {!writable && gapQuestion ? (
            <div className="mb-2 rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
              <span className="font-semibold">Preflight: </span>
              {gapQuestion}
            </div>
          ) : null}

          <label className="mb-1 block text-xs font-medium text-muted-foreground">Extra instructie (optioneel)</label>
          <Textarea
            rows={2}
            value={instruction}
            placeholder='bijv. "maak minder stellig", "zet de vorige maand in de verleden tijd", "onderbouw de beperkte sollicitaties"'
            className="mb-2 min-h-[44px] text-xs"
            onChange={(e) => setInstruction(e.target.value)}
          />
          {feedbackPreview.requires_fact_review ? (
            <div className="mb-2 rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
              <span className="font-semibold">Feit vs stijl: </span>
              {feedbackPreview.confirmation_question}
            </div>
          ) : null}
          <div className="mb-3 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 bg-[#702A90] text-xs hover:bg-[#5a1f75]"
              disabled={busy || !writable || moduleLocked}
              onClick={() => void generate()}
            >
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
                  <span className="font-semibold">Wordt meegenomen bij Overnemen: </span>
                  {describeVgrAiSuggesties(suggesties).join(' · ')}
                </div>
              ) : null}

              {zoekConfirm ? (
                <div className="rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
                  {sectionId === 'zoekprofiel' && zoekprofielWouldChange()
                    ? 'Dit AI-concept wijzigt het zoekprofiel. Bevestig als deskundige dat je de wijziging wilt overnemen (FML-impact gecontroleerd). Zonder bevestiging blijft het oude zoekprofiel leidend.'
                    : 'Dit voorstel bevat mogelijke feitcorrecties. Bevestig expliciet vóór Overnemen (T19) — stijledits wijzigen geen dossierfeiten.'}
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
                <Button
                  type="button"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  disabled={!hasContent && !Object.values(suggesties).some(Boolean)}
                  onClick={apply}
                >
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  {zoekConfirm
                    ? sectionId === 'zoekprofiel' && zoekprofielWouldChange()
                      ? 'Zoekprofiel wijzigen'
                      : 'Feit bevestigen & overnemen'
                    : 'Overnemen'}
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
