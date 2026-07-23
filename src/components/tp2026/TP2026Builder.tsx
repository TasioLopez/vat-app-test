'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue } from 'react';
import { useGuardedRouter } from '@/hooks/useGuardedRouter';
import UnsavedChangesSyncGuard from '@/components/unsaved/UnsavedChangesSyncGuard';
import { Check, ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase/client';
import { TPInstanceProvider, useTPInstance } from '@/context/TPInstanceContext';
import { ExportButton } from '@/components/tp/ExportButton';
import TPPreviewWrapper from '@/components/tp/TPPreviewWrapper';
import { ensureTP2026Shape } from '@/lib/tp2026/mapping';
import { normalizePhoneForStorage } from '@/lib/phone/format-dutch-display';
import {
  buildAutofillSteps,
  buildSingleTp3AutofillStep,
  canAutofillCurrentStep,
  runAutofillSteps,
  type AutofillScope,
  type AutofillRunStep,
  type RunAutofillStepsResult,
} from '@/lib/tp2026/autofill-runner';
import { applyEmployeeAutofillDetails } from '@/lib/employee/autofill-persist';
import { AutofillScopeDropdown } from '@/components/ui/dropdown-menu';
import {
  AutofillProgressOverlay,
  type AutofillProgressState,
} from '@/components/ui/AutofillProgressOverlay';
import { useToastHelpers } from '@/components/ui/Toast';
import { Cover2026A4, Cover2026Editor } from '@/components/tp2026/sections/Cover2026Section';
import { Gegevens2026A4Pages, Gegevens2026Editor } from '@/components/tp2026/sections/Gegevens2026Section';
import { Basis2026A4Pages, Basis2026Editor } from '@/components/tp2026/sections/Basis2026Section';
import {
  Bijlage1A4Pages,
  Bijlage1Editor,
} from '@/components/tp2026/sections/Bijlage1Section';
import { applyTPProfileContext, resolveTPProfileContext } from '@/lib/tp/resolve-profile-context';
import { getTrajectoryDateUpdates, isLowTpLeadTime, parseTpLeadTimeWeeks } from '@/lib/tp2026/trajectory-dates';
import { mergeRecordFillBlanks } from '@/lib/tp2026/gegevens-autofill';
import { persistTp2026Draft } from '@/lib/tp2026/persist-draft';
import { TP2026PageNumberProvider, useTP2026PageNumber } from '@/context/TP2026PageNumberContext';
import { isBasisEditorSectionField } from '@/lib/tp2026/basis-editor-sections';
import {
  applyAutofillReviewMarks,
  markBasisSectionReview,
} from '@/lib/tp2026/basis-section-review';
import { TP2026_TP3_FIELD_ORDER } from '@/lib/autofill-progress';

type Props = {
  employeeId: string;
  tpInstanceId: string;
  initialData: Record<string, any>;
};

function TP2026BuilderInner({ employeeId, tpInstanceId }: { employeeId: string; tpInstanceId: string }) {
  const guardedRouter = useGuardedRouter();
  const { tpData, setTPData, updateField, saveAll, isDirty, markDirty, markSaved } = useTPInstance();
  const { showSuccess, showError, showInfo, showWarning } = useToastHelpers();
  const employeeHydrateKeyRef = useRef<string | null>(null);
  const lowLeadTimeWarnedRef = useRef<string | null>(null);
  const autofillCancelRef = useRef(false);
  const autofillAbortRef = useRef<AbortController | null>(null);
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [autofillCancelling, setAutofillCancelling] = useState(false);
  const [autofillProgress, setAutofillProgress] = useState<AutofillProgressState | null>(null);

  const persistDraftFromData = useCallback(
    async (data: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const result = await persistTp2026Draft(supabase, {
        tpInstanceId,
        employeeId,
        tpData: data,
        userId: user?.id ?? null,
      });
      if (result.error) return { ok: false, error: result.error };
      await saveAll();
      markSaved();
      return { ok: true };
    },
    [employeeId, markSaved, saveAll, supabase, tpInstanceId]
  );

  const cancelAutofill = useCallback(() => {
    autofillCancelRef.current = true;
    autofillAbortRef.current?.abort();
    setAutofillCancelling(true);
  }, []);

  const finalizeAutofillResult = useCallback(
    async (
      result: RunAutofillStepsResult,
      tpSnapshot: Record<string, any>,
      employeeSnapshot: Record<string, unknown> | null,
      stepCount: number,
      singleFieldSuccessMessage?: string,
      autofillReviewSectionIds?: string[]
    ) => {
      if (result.cancelled) {
        setTPData(tpSnapshot);
        showInfo('Autofill geannuleerd', 'Geen wijzigingen opgeslagen.');
        return;
      }

      let nextData = result.data as Record<string, any>;
      if (autofillReviewSectionIds && autofillReviewSectionIds.length > 0 && result.completed > 0) {
        nextData = applyAutofillReviewMarks(nextData, autofillReviewSectionIds);
      }
      setTPData(nextData);

      if (result.employeePersist) {
        const persistResult = await applyEmployeeAutofillDetails(
          supabase,
          employeeId,
          employeeSnapshot,
          result.employeePersist.rawDetails,
          result.employeePersist.meta
        );
        if (persistResult.error) {
          markDirty();
          showError(
            'Autofill deels mislukt',
            `Werknemersprofiel niet opgeslagen: ${persistResult.error}`
          );
        }
      }

      let savedSuffix = '';
      if (result.completed > 0) {
        const { ok, error } = await persistDraftFromData(nextData);
        if (ok) {
          savedSuffix = ' Opgeslagen.';
        } else {
          markDirty();
          savedSuffix = error ? ` Niet opgeslagen: ${error}` : ' Niet opgeslagen.';
        }
      }

      if (singleFieldSuccessMessage && result.failed.length === 0 && result.completed > 0) {
        showSuccess(savedSuffix ? `${singleFieldSuccessMessage}${savedSuffix}` : singleFieldSuccessMessage);
        return;
      }

      if (result.failed.length === 0) {
        showSuccess(`Autofill voltooid (${result.completed}/${stepCount} stappen).${savedSuffix}`);
        return;
      }

      if (result.completed > 0) {
        showError(
          'Autofill gedeeltelijk voltooid',
          `${result.completed}/${stepCount} stappen gelukt. Mislukt: ${result.failed
            .map((f) => f.label)
            .join('; ')}${savedSuffix}`
        );
        return;
      }

      showError(
        'Autofill mislukt',
        result.failed.map((f) => `${f.label}: ${f.error}`).join('; ')
      );
    },
    [employeeId, markDirty, persistDraftFromData, setTPData, showError, showInfo, showSuccess, supabase]
  );

  const runAutofillSession = useCallback(
    async (steps: { id: string; label: string; run: AutofillRunStep['run'] }[]) => {
      const tpSnapshot = JSON.parse(JSON.stringify(tpData)) as Record<string, any>;
      const initialData = { ...tpSnapshot, employee_id: tpSnapshot.employee_id ?? employeeId };

      const { data: employeeDetailsRow } = await supabase
        .from('employee_details')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();
      const employeeSnapshot = (employeeDetailsRow as Record<string, unknown> | null) ?? null;

      autofillCancelRef.current = false;
      setAutofillCancelling(false);
      const abortController = new AbortController();
      autofillAbortRef.current = abortController;

      setAutofilling(true);
      setAutofillProgress({ currentIndex: 1, total: steps.length, currentLabel: 'Voorbereiden…' });

      try {
        const result = await runAutofillSteps(
          steps,
          { employeeId, supabase, signal: abortController.signal },
          initialData,
          {
            onProgress: setAutofillProgress,
            shouldCancel: () => autofillCancelRef.current,
          }
        );

        return { result, tpSnapshot, employeeSnapshot, stepCount: steps.length };
      } finally {
        autofillAbortRef.current = null;
        setAutofillCancelling(false);
        setAutofilling(false);
        setAutofillProgress(null);
      }
    },
    [employeeId, supabase, tpData]
  );

  const autofillBasisField = useCallback(
    async (fieldKey: string) => {
      if (autofilling) return;
      const step = buildSingleTp3AutofillStep(fieldKey);
      if (!step) return;

      try {
        const session = await runAutofillSession([step]);
        if (!session) return;
        await finalizeAutofillResult(
          session.result,
          session.tpSnapshot,
          session.employeeSnapshot,
          session.stepCount,
          'Basisveld ingevuld en opgeslagen.',
          [fieldKey]
        );
      } catch (error) {
        console.error('Basis field autofill failed', fieldKey, error);
        showError('Autofill mislukt', error instanceof Error ? error.message : 'Onbekende fout');
      }
    },
    [autofilling, finalizeAutofillResult, runAutofillSession, showError]
  );

  const updateBasisField = useCallback(
    (field: string, value: unknown) => {
      updateField(field, value);
      if (isBasisEditorSectionField(field)) {
        markBasisSectionReview(field, 'review', tpData, updateField);
      }
    },
    [tpData, updateField]
  );

  const previewData = useDeferredValue(tpData);

  const sections = [
    {
      id: 1,
      title: '01 Voorblad',
      renderEditor: () => <Cover2026Editor data={tpData} updateField={updateField} />,
      renderPreview: () => <Cover2026A4 data={previewData} />,
    },
    {
      id: 2,
      title: '02 Gegevens',
      renderEditor: () => <Gegevens2026Editor data={tpData} updateField={updateField} />,
      renderPreview: () => <Gegevens2026A4Pages data={previewData} />,
    },
    {
      id: 3,
      title: '03 Basisdocument',
      renderEditor: () => (
        <Basis2026Editor data={tpData} updateField={updateBasisField} onAutofillField={autofillBasisField} />
      ),
      renderPreview: () => (
        <Basis2026A4Pages data={previewData} paginationEnabled={currentStep === 3} />
      ),
    },
    {
      id: 4,
      title: 'Bijlage 1',
      renderEditor: () => (
        <Bijlage1Editor
          phases={tpData.bijlage1_phases || []}
          setPhases={(next) => updateField('bijlage1_phases', next)}
          planStartDate={tpData.tp_start_date || tpData.intake_date}
          planEndDate={tpData.tp_end_date}
        />
      ),
      renderPreview: () => (
        <Bijlage1A4Pages data={previewData} phases={previewData.bijlage1_phases || []} />
      ),
    },
  ];

  useEffect(() => {
    const hydrateKey = `${employeeId}:${tpInstanceId}`;
    if (employeeHydrateKeyRef.current === hydrateKey) return;

    let cancelled = false;

    async function hydrateEmployeeDefaults() {
      const [employeeRes, detailsRes, metaRes] = await Promise.all([
        (supabase as any)
          .from('employees')
          .select('first_name,last_name,email,client_id,referent_id')
          .eq('id', employeeId)
          .maybeSingle(),
        supabase.from('employee_details').select('*').eq('employee_id', employeeId).maybeSingle(),
        supabase.from('tp_meta').select('*').eq('employee_id', employeeId).maybeSingle(),
      ]);

      if (cancelled) return;

      const employee = employeeRes.data || {};
      const profileContext = await resolveTPProfileContext(supabase, employeeId);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      let appUserDisplayName = '';
      let appUserPhone = '';
      let appUserEmail = '';
      if (user?.id) {
        const { data: appUser } = await supabase
          .from('users')
          .select('first_name, last_name, phone, email')
          .eq('id', user.id)
          .maybeSingle();
        if (appUser) {
          appUserDisplayName = [appUser.first_name, appUser.last_name].filter(Boolean).join(' ').trim();
          appUserPhone = normalizePhoneForStorage(appUser.phone) ?? '';
          appUserEmail = (appUser.email || '').trim();
        }
      }

      if (cancelled) return;

      setTPData((prev) => {
        const meta = { ...(metaRes.data || {}) };
        delete (meta as { tp_creation_date?: unknown }).tp_creation_date;

        // data_json (prev) wins; only fill empty fields from employee profile / tp_meta
        let merged = mergeRecordFillBlanks(
          { ...prev } as Record<string, unknown>,
          employee as Record<string, unknown>
        );
        merged = mergeRecordFillBlanks(merged, (detailsRes.data || {}) as Record<string, unknown>);
        merged = mergeRecordFillBlanks(merged, meta as Record<string, unknown>);

        const shaped = ensureTP2026Shape(merged as Record<string, any>);
        const next = applyTPProfileContext(shaped, profileContext) as Record<string, any>;

        if (!String(next.consultant_name || '').trim() && appUserDisplayName) {
          next.consultant_name = appUserDisplayName;
          if (user?.id) next.consultant_user_id = user.id;
        }
        if (!String(next.consultant_phone || '').trim() && appUserPhone) {
          next.consultant_phone = appUserPhone;
        }
        if (!String(next.consultant_email || '').trim() && appUserEmail) {
          next.consultant_email = appUserEmail;
        }

        return next;
      });

      if (!cancelled) {
        employeeHydrateKeyRef.current = hydrateKey;
      }
    }

    void hydrateEmployeeDefaults();

    return () => {
      cancelled = true;
    };
  }, [employeeId, tpInstanceId, setTPData, supabase]);

  // Opdrachtinformatie: derive end/start/lead time from traject dates (legacy EmployeeInfo behavior)
  useEffect(() => {
    const updates = getTrajectoryDateUpdates(tpData);
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) updateField(key, value);
    }
  }, [tpData.first_sick_day, tpData.registration_date, tpData.intake_date, tpData.tp_end_date, tpData.tp_start_date, updateField]);

  useEffect(() => {
    const updates = getTrajectoryDateUpdates(tpData);
    const effectiveLeadTime = updates.tp_lead_time ?? tpData.tp_lead_time;
    if (!isLowTpLeadTime(effectiveLeadTime)) return;

    const weeks = parseTpLeadTimeWeeks(effectiveLeadTime);
    if (weeks == null) return;

    const warnKey = `${tpInstanceId}:${weeks}`;
    if (lowLeadTimeWarnedRef.current === warnKey) return;
    lowLeadTimeWarnedRef.current = warnKey;

    showWarning(
      'Lage doorlooptijd',
      `Doorlooptijd is ${weeks} weken. Controleer of de trajectdata kloppen.`
    );
  }, [
    tpData.tp_lead_time,
    tpData.tp_start_date,
    tpData.tp_end_date,
    tpData.first_sick_day,
    tpData.registration_date,
    tpData.intake_date,
    tpInstanceId,
    showWarning,
  ]);

  // Bijlage 1: merge legacy dates and auto-fill periods when trajectory dates become available
  useEffect(() => {
    setTPData((prev) => {
      const shaped = ensureTP2026Shape(prev);
      if (JSON.stringify(shaped.bijlage1_phases) === JSON.stringify(prev.bijlage1_phases)) {
        return prev;
      }
      return { ...prev, bijlage1_phases: shaped.bijlage1_phases };
    });
  }, [tpData.tp_start_date, tpData.tp_end_date, tpData.intake_date, tpData.bijlage_fases, setTPData]);

  const persistForGuard = useCallback(async () => {
    const { ok, error } = await persistDraftFromData(tpData);
    if (!ok) throw new Error(error || 'Opslaan mislukt');
  }, [persistDraftFromData, tpData]);

  const persist = async () => {
    setSaving(true);
    try {
      await persistForGuard();
    } catch (error) {
      console.error('Failed to save TP 2026 instance', error);
      showError('Fout', error instanceof Error ? error.message : 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const runAutofill = useCallback(
    async (scope: AutofillScope) => {
      if (scope === 'current_step' && !canAutofillCurrentStep(currentStep)) {
        showError('Geen autofill', 'Geen autofill beschikbaar voor deze stap.');
        return;
      }

      const steps = buildAutofillSteps(scope, currentStep, tpData);
      if (steps.length === 0) {
        showError('Geen lege velden', 'Alle velden voor autofill zijn al ingevuld.');
        return;
      }

      try {
        const session = await runAutofillSession(steps);
        if (!session) return;
        const failedIds = new Set(session.result.failed.map((f) => f.id));
        const reviewSectionIds =
          scope === 'current_step' && currentStep === 3
            ? steps.filter((step) => !failedIds.has(step.id)).map((step) => step.id)
            : steps
                .filter((step) => !failedIds.has(step.id) && (TP2026_TP3_FIELD_ORDER as readonly string[]).includes(step.id))
                .map((step) => step.id);
        await finalizeAutofillResult(
          session.result,
          session.tpSnapshot,
          session.employeeSnapshot,
          session.stepCount,
          undefined,
          reviewSectionIds
        );
      } catch (error) {
        console.error('TP 2026 autofill failed', error);
        showError('Autofill mislukt', error instanceof Error ? error.message : 'Onbekende fout');
      }
    },
    [
      currentStep,
      finalizeAutofillResult,
      runAutofillSession,
      showError,
      tpData,
    ]
  );

  const currentStepHasAutofill = canAutofillCurrentStep(currentStep);
  const currentStepAutofillAvailable =
    currentStepHasAutofill && buildAutofillSteps('current_step', currentStep, tpData).length > 0;

  const totalSteps = sections.length;
  const backLabel = currentStep === 1 ? 'Terug naar werknemer' : 'Vorige stap';

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      return;
    }
    guardedRouter.push(`/dashboard/employees/${employeeId}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-indigo-50/20">
      <UnsavedChangesSyncGuard isDirty={isDirty} onSave={persistForGuard} autosave />
      <div className="flex-shrink-0 px-6 pt-3 pb-3 border-b border-indigo-200/50 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-xl font-bold text-gray-900">Trajectplan Bouwer 2026</h1>
            <span className="shrink-0 text-sm text-gray-400" aria-hidden>
              ·
            </span>
            <p className="shrink-0 text-sm text-gray-600">
              Stap {currentStep} van {totalSteps}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goBack}
              aria-label={backLabel}
              title={backLabel}
            >
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
            <ExportButton
              employeeId={employeeId}
              tpInstanceId={tpInstanceId}
              layoutKey="tp_2026"
              variant="icon"
            />
            <AutofillScopeDropdown
              variant="icon"
              loading={autofilling}
              currentStepDisabled={!currentStepAutofillAvailable}
              onRunAll={() => void runAutofill('all')}
              onRunCurrentStep={() => void runAutofill('current_step')}
            />
            <Button
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={persist}
              disabled={saving || !isDirty}
              aria-label={saving ? 'Opslaan…' : isDirty ? 'Opslaan' : 'Opgeslagen'}
              title={saving ? 'Opslaan…' : isDirty ? 'Opslaan' : 'Opgeslagen'}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : isDirty ? (
                <Save className="h-4 w-4" aria-hidden />
              ) : (
                <Check className="h-4 w-4 text-emerald-600" aria-hidden />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <div className="relative h-full min-h-0 px-6 pt-6 pb-2">
          {autofilling && autofillProgress ? (
            <AutofillProgressOverlay
              progress={autofillProgress}
              onCancel={cancelAutofill}
              cancelling={autofillCancelling}
            />
          ) : null}
          {sections.map((section, index) => (
            <div key={section.id} style={{ display: currentStep === index + 1 ? 'block' : 'none' }} className="h-full min-h-0">
              <div className="flex min-h-0 h-full gap-10 items-stretch overflow-hidden">
                <div className="flex max-h-full w-[50%] min-h-0 flex-col space-y-3 overflow-y-auto py-1 pl-1 pr-2">
                  {section.renderEditor()}
                </div>
                <TPPreviewWrapper>
                  <div className="space-y-8">{section.renderPreview()}</div>
                </TPPreviewWrapper>
              </div>
            </div>
          ))}
          {currentStep >= 4 ? <HiddenBasisPageMeasure data={tpData} /> : null}
        </div>
      </div>
    </div>
  );
}

function HiddenBasisPageMeasure({ data }: { data: Record<string, any> }) {
  const { sectionPageCounts } = useTP2026PageNumber();
  if (sectionPageCounts.basis > 0) return null;
  return (
    <div
      className="sr-only pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden"
      aria-hidden
    >
      <Basis2026A4Pages data={data} paginationEnabled />
    </div>
  );
}

export default function TP2026Builder({ employeeId, tpInstanceId, initialData }: Props) {
  return (
    <TPInstanceProvider initialData={ensureTP2026Shape(initialData)}>
      <TP2026PageNumberProvider>
        <TP2026BuilderInner employeeId={employeeId} tpInstanceId={tpInstanceId} />
      </TP2026PageNumberProvider>
    </TPInstanceProvider>
  );
}
