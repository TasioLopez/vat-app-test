'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGuardedRouter } from '@/hooks/useGuardedRouter';
import UnsavedChangesSyncGuard from '@/components/unsaved/UnsavedChangesSyncGuard';
import { Check, ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { VGRInstanceProvider, useVGRInstance, type VGRInstanceSectionKey } from '@/context/VGRInstanceContext';
import { ExportButton } from '@/components/tp/ExportButton';
import TPPreviewWrapper from '@/components/tp/TPPreviewWrapper';
import { ensureVGRShape } from '@/lib/vgr/mapping';
import { persistVgrDraft } from '@/lib/vgr/persist-draft';
import { VGRPageNumberProvider } from '@/context/VGRPageNumberContext';
import { useToastHelpers } from '@/components/ui/Toast';
import { applyTPProfileContext, resolveTPProfileContext } from '@/lib/tp/resolve-profile-context';
import { normalizePhoneForStorage } from '@/lib/phone/format-dutch-display';
import type { VGRStatus } from '@/lib/vgr/schema';
import type { VGRIssue } from '@/lib/vgr/validation';
import { SetupEditor } from '@/components/vgr/sections/SetupSection';
import { CoverA4, CoverEditor } from '@/components/vgr/sections/CoverSection';
import { GegevensA4Pages, GegevensEditor } from '@/components/vgr/sections/GegevensSection';
import { BodyA4Pages, BodyEditor } from '@/components/vgr/sections/BodySection';
import { PlanningA4Pages, PlanningEditor } from '@/components/vgr/sections/PlanningSection';
import { ApplicationsA4Pages, ApplicationsEditor } from '@/components/vgr/sections/ApplicationsSection';
import { ReviewEditor } from '@/components/vgr/sections/ReviewSection';
import { VgrAiPanel } from '@/components/vgr/ai/VgrAiPanel';
import { VgrTestSummaryPanel } from '@/components/vgr/ai/VgrTestSummaryPanel';

type Props = {
  employeeId: string;
  vgrInstanceId: string;
  initialData: Record<string, any>;
  initialStatus?: VGRStatus;
};

type Step = {
  key: VGRInstanceSectionKey;
  title: string;
  renderEditor: () => React.ReactNode;
  renderPreview: () => React.ReactNode;
};

const STEP_ORDER: VGRInstanceSectionKey[] = ['setup', 'cover', 'gegevens', 'body', 'planning', 'applications', 'review'];

function VGRBuilderInner({
  employeeId,
  vgrInstanceId,
  initialStatus,
}: {
  employeeId: string;
  vgrInstanceId: string;
  initialStatus: VGRStatus;
}) {
  const guardedRouter = useGuardedRouter();
  const { vgrData, setVGRData, updateField, updateMeta, updateBody, setBodySection, patchBody, saveAll, isDirty, markSaved } =
    useVGRInstance();
  const { showSuccess, showError } = useToastHelpers();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<VGRStatus>(initialStatus);
  const [statusBusy, setStatusBusy] = useState(false);
  const hydrateKeyRef = useRef<string | null>(null);
  const editorScrollRef = useRef<HTMLDivElement | null>(null);

  /* ---------------- persistence ---------------- */

  const persistDraftFromData = useCallback(
    async (data: Record<string, unknown>, nextStatus?: VGRStatus): Promise<{ ok: boolean; error?: string }> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const result = await persistVgrDraft(supabase, {
        vgrInstanceId,
        employeeId,
        vgrData: data,
        userId: user?.id ?? null,
        status: nextStatus,
      });
      if (result.error) return { ok: false, error: result.error };
      await saveAll();
      markSaved();
      return { ok: true };
    },
    [employeeId, markSaved, saveAll, vgrInstanceId]
  );

  const persistForGuard = useCallback(async () => {
    const result = await persistDraftFromData(vgrData);
    if (!result.ok) throw new Error(result.error || 'Opslaan mislukt');
  }, [persistDraftFromData, vgrData]);

  const persist = useCallback(async () => {
    setSaving(true);
    try {
      await persistForGuard();
      showSuccess('Opgeslagen', 'VGR concept is opgeslagen.');
    } catch (err) {
      showError('Fout', err instanceof Error ? err.message : 'Opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  }, [persistForGuard, showError, showSuccess]);

  const changeStatus = useCallback(
    async (next: VGRStatus) => {
      setStatusBusy(true);
      try {
        const approved_at = next === 'final' ? new Date().toISOString() : null;
        const data = { ...vgrData, vgr_meta: { ...vgrData.vgr_meta, approved_at } };
        const result = await persistDraftFromData(data, next);
        if (!result.ok) throw new Error(result.error || 'Status wijzigen mislukt');
        updateMeta({ approved_at });
        markSaved();
        setStatus(next);
        showSuccess(
          'Status bijgewerkt',
          next === 'final' ? 'Rapportage is definitief gemarkeerd.' : next === 'review' ? 'Rapportage staat ter controle.' : 'Rapportage is weer een concept.'
        );
      } catch (err) {
        showError('Fout', err instanceof Error ? err.message : 'Status wijzigen mislukt.');
      } finally {
        setStatusBusy(false);
      }
    },
    [markSaved, persistDraftFromData, showError, showSuccess, updateMeta, vgrData]
  );

  /* ---------------- live profile context + consultant defaults ---------------- */

  useEffect(() => {
    const hydrateKey = `${employeeId}:${vgrInstanceId}`;
    if (hydrateKeyRef.current === hydrateKey) return;
    let cancelled = false;

    async function hydrate() {
      const profileContext = await resolveTPProfileContext(supabase, employeeId);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let appUserDisplayName = '';
      let appUserPhone = '';
      let appUserEmail = '';
      if (user?.id) {
        const { data: appUser } = await supabase.from('users').select('first_name, last_name, phone, email').eq('id', user.id).maybeSingle();
        if (appUser) {
          appUserDisplayName = [appUser.first_name, appUser.last_name].filter(Boolean).join(' ').trim();
          appUserPhone = normalizePhoneForStorage(appUser.phone) ?? '';
          appUserEmail = (appUser.email || '').trim();
        }
      }
      if (cancelled) return;

      setVGRData((prev) => {
        const next = applyTPProfileContext(prev as Record<string, unknown>, profileContext) as Record<string, any>;
        if (!String(next.consultant_name || '').trim() && appUserDisplayName) {
          next.consultant_name = appUserDisplayName;
          if (user?.id) next.consultant_user_id = user.id;
        }
        if (!String(next.consultant_phone || '').trim() && appUserPhone) next.consultant_phone = appUserPhone;
        if (!String(next.consultant_email || '').trim() && appUserEmail) next.consultant_email = appUserEmail;
        return ensureVGRShape(next);
      });
      hydrateKeyRef.current = hydrateKey;
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [employeeId, vgrInstanceId, setVGRData]);

  /* ---------------- navigation ---------------- */

  const goToIssue = useCallback((issue: VGRIssue) => {
    const idx = STEP_ORDER.indexOf(issue.step);
    if (idx >= 0) setCurrentStep(idx + 1);
    if (issue.sectionId) {
      window.setTimeout(() => {
        document.getElementById(`vgr-sec-${issue.sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  }, []);

  const steps: Step[] = [
    {
      key: 'setup',
      title: 'Rapportage',
      renderEditor: () => <SetupEditor data={vgrData} employeeId={employeeId} updateMeta={updateMeta} updateBody={updateBody} />,
      renderPreview: () => <CoverA4 data={vgrData} />,
    },
    {
      key: 'cover',
      title: 'Voorblad',
      renderEditor: () => <CoverEditor data={vgrData} updateField={updateField} updateMeta={updateMeta} />,
      renderPreview: () => <CoverA4 data={vgrData} />,
    },
    {
      key: 'gegevens',
      title: 'Gegevens',
      renderEditor: () => <GegevensEditor data={vgrData} updateField={updateField} employeeId={employeeId} />,
      renderPreview: () => <GegevensA4Pages data={vgrData} />,
    },
    {
      key: 'body',
      title: 'Rapportage-inhoud',
      renderEditor: () => (
        <BodyEditor
          data={vgrData}
          updateBody={updateBody}
          setBodySection={setBodySection}
          renderAi={(sectionId) => (
            <VgrAiPanel sectionId={sectionId} data={vgrData} vgrInstanceId={vgrInstanceId} employeeId={employeeId} patchBody={patchBody} />
          )}
          renderTestSummary={() => <VgrTestSummaryPanel data={vgrData} employeeId={employeeId} updateBody={updateBody} updateField={updateField} />}
        />
      ),
      renderPreview: () => <BodyA4Pages data={vgrData} />,
    },
    {
      key: 'planning',
      title: 'Bijlage 1 · Planning',
      renderEditor: () => (
        <PlanningEditor
          phases={vgrData.planning_phases}
          setPhases={(next) => updateField('planning_phases', next)}
          planStartDate={vgrData.tp_start_date}
          planEndDate={vgrData.tp_end_date}
        />
      ),
      renderPreview: () => <PlanningA4Pages data={vgrData} />,
    },
    {
      key: 'applications',
      title: 'Bijlage 2 · Sollicitaties',
      renderEditor: () => (
        <ApplicationsEditor
          applications={vgrData.applications}
          setApplications={(next) => updateField('applications', next)}
          periodStart={vgrData.vgr_meta.period_start}
          periodEnd={vgrData.vgr_meta.period_end}
        />
      ),
      renderPreview: () => <ApplicationsA4Pages data={vgrData} />,
    },
    {
      key: 'review',
      title: 'Controle & export',
      renderEditor: () => (
        <ReviewEditor
          data={vgrData}
          status={status}
          onGoToIssue={goToIssue}
          onSetStatus={changeStatus}
          updateMeta={updateMeta}
          employeeId={employeeId}
          vgrInstanceId={vgrInstanceId}
          statusBusy={statusBusy}
        />
      ),
      renderPreview: () => (
        <div className="space-y-8">
          <CoverA4 data={vgrData} />
          <GegevensA4Pages data={vgrData} />
          <BodyA4Pages data={vgrData} />
          <PlanningA4Pages data={vgrData} />
          <ApplicationsA4Pages data={vgrData} />
        </div>
      ),
    },
  ];

  const totalSteps = steps.length;
  const backLabel = currentStep === 1 ? 'Terug naar werknemer' : 'Vorige stap';

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      return;
    }
    guardedRouter.push(`/dashboard/employees/${employeeId}`);
  };

  useEffect(() => {
    editorScrollRef.current?.scrollTo({ top: 0 });
  }, [currentStep]);

  const statusBadge =
    status === 'final'
      ? { label: 'Definitief', cls: 'bg-emerald-100 text-emerald-800' }
      : status === 'review'
        ? { label: 'Ter controle', cls: 'bg-amber-100 text-amber-800' }
        : { label: 'Concept', cls: 'bg-gray-100 text-gray-700' };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <UnsavedChangesSyncGuard isDirty={isDirty} onSave={persistForGuard} autosave />
      <div className="shrink-0 border-b border-border bg-white px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-xl font-bold text-gray-900">Voortgangsrapportage</h1>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${statusBadge.cls}`}>{statusBadge.label}</span>
            <span className="shrink-0 text-sm text-gray-400" aria-hidden>
              ·
            </span>
            <p className="shrink-0 text-sm text-gray-600">
              Stap {currentStep} van {totalSteps}: {steps[currentStep - 1].title}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goBack} aria-label={backLabel} title={backLabel}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentStep((s) => Math.min(totalSteps, s + 1))}
              disabled={currentStep === totalSteps}
              aria-label="Volgende stap"
              title="Volgende stap"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
            <ExportButton employeeId={employeeId} vgrInstanceId={vgrInstanceId} layoutKey="vgr" variant="icon" />
            <Button
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={persist}
              disabled={saving || !isDirty}
              aria-label={saving ? 'Opslaan…' : isDirty ? 'Opslaan' : 'Opgeslagen'}
              title={saving ? 'Opslaan…' : isDirty ? 'Opslaan' : 'Opgeslagen'}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : isDirty ? <Save className="h-4 w-4" aria-hidden /> : <Check className="h-4 w-4 text-emerald-600" aria-hidden />}
            </Button>
          </div>
        </div>
        <nav className="mt-2 flex flex-wrap gap-1" aria-label="Stappen">
          {steps.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setCurrentStep(i + 1)}
              className={`rounded px-2 py-0.5 text-xs transition ${
                currentStep === i + 1 ? 'bg-[#702A90] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {i + 1}. {s.title}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="relative h-full min-h-0 px-6 pt-6 pb-2">
          {steps.map((step, index) => (
            <div key={step.key} style={{ display: currentStep === index + 1 ? 'block' : 'none' }} className="h-full min-h-0">
              <div className="flex h-full min-h-0 items-stretch gap-10 overflow-hidden">
                <div
                  ref={currentStep === index + 1 ? editorScrollRef : undefined}
                  className="flex max-h-full w-[50%] min-h-0 flex-col space-y-3 overflow-y-auto pr-2"
                >
                  {currentStep === index + 1 ? step.renderEditor() : null}
                </div>
                <TPPreviewWrapper>
                  <div className="space-y-8">{currentStep === index + 1 ? step.renderPreview() : null}</div>
                </TPPreviewWrapper>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VGRBuilder({ employeeId, vgrInstanceId, initialData, initialStatus = 'draft' }: Props) {
  return (
    <VGRInstanceProvider initialData={ensureVGRShape(initialData)}>
      <VGRPageNumberProvider>
        <VGRBuilderInner employeeId={employeeId} vgrInstanceId={vgrInstanceId} initialStatus={initialStatus} />
      </VGRPageNumberProvider>
    </VGRInstanceProvider>
  );
}
