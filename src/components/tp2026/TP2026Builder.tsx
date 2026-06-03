'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase/client';
import { TPInstanceProvider, useTPInstance } from '@/context/TPInstanceContext';
import { ExportButton } from '@/components/tp/ExportButton';
import TPPreviewWrapper from '@/components/tp/TPPreviewWrapper';
import { ensureTP2026Shape, mergeAutofillIntoTP2026 } from '@/lib/tp2026/mapping';
import { TP2026_BASIS_AUTOFILL_ENDPOINTS } from '@/lib/tp2026/basis-autofill-endpoints';
import {
  buildAutofillSteps,
  canAutofillCurrentStep,
  runAutofillSteps,
  type AutofillScope,
} from '@/lib/tp2026/autofill-runner';
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
  Bijlage2A4Pages,
  Bijlage2Editor,
  Bijlage3A4Pages,
  Bijlage3Editor,
} from '@/components/tp2026/sections/Bijlage2026Sections';
import { referentToClientReferentFields, resolveReferentForEmployee } from '@/lib/referents';
import { getTrajectoryDateUpdates } from '@/lib/tp2026/trajectory-dates';

type Props = {
  employeeId: string;
  tpInstanceId: string;
  initialData: Record<string, any>;
};

function TP2026BuilderInner({ employeeId, tpInstanceId }: { employeeId: string; tpInstanceId: string }) {
  const { tpData, setTPData, updateField, saveAll, isDirty, markSaved } = useTPInstance();
  const { showSuccess, showError } = useToastHelpers();
  const employeeHydrateKeyRef = useRef<string | null>(null);
  const autofillCancelRef = useRef(false);
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
  const [autofillProgress, setAutofillProgress] = useState<AutofillProgressState | null>(null);

  const autofillBasisField = useCallback(
    async (fieldKey: string) => {
      if (autofilling) return;
      const endpoint = TP2026_BASIS_AUTOFILL_ENDPOINTS[fieldKey];
      if (!endpoint) return;
      try {
        const res = await fetch(`${endpoint}?employeeId=${employeeId}`);
        const json = await res.json();
        if (!res.ok) return;
        setTPData((prev) => {
          let next: Record<string, any> = { ...prev };
          if (json?.details && typeof json.details === 'object') {
            next = mergeAutofillIntoTP2026(next, json.details);
          }
          if (json?.data?.pow_meter) next.pow_meter = json.data.pow_meter;
          return ensureTP2026Shape(next);
        });
      } catch (e) {
        console.error('Basis field autofill failed', fieldKey, e);
      }
    },
    [employeeId, setTPData, autofilling]
  );

  const sections = [
    {
      id: 1,
      title: '01 Voorblad',
      renderEditor: () => <Cover2026Editor data={tpData} updateField={updateField} />,
      renderPreview: () => <Cover2026A4 data={tpData} />,
    },
    {
      id: 2,
      title: '02 Gegevens',
      renderEditor: () => <Gegevens2026Editor data={tpData} updateField={updateField} />,
      renderPreview: () => <Gegevens2026A4Pages data={tpData} />,
    },
    {
      id: 3,
      title: '03 Basisdocument',
      renderEditor: () => (
        <Basis2026Editor data={tpData} updateField={updateField} onAutofillField={autofillBasisField} />
      ),
      renderPreview: () => <Basis2026A4Pages data={tpData} />,
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
      renderPreview: () => <Bijlage1A4Pages data={tpData} phases={tpData.bijlage1_phases || []} />,
    },
    {
      id: 5,
      title: 'Bijlage 2',
      renderEditor: () => (
        <Bijlage2Editor model={tpData.bijlage2_model} setModel={(next) => updateField('bijlage2_model', next)} />
      ),
      renderPreview: () => <Bijlage2A4Pages data={tpData} model={tpData.bijlage2_model} />,
    },
    {
      id: 6,
      title: 'Bijlage 3',
      renderEditor: () => (
        <Bijlage3Editor
          decisions={tpData.bijlage3_decisions || []}
          setDecisions={(next) => updateField('bijlage3_decisions', next)}
          page2={tpData.bijlage3_page2 || {}}
          setPage2={(next) => updateField('bijlage3_page2', next)}
        />
      ),
      renderPreview: () => (
        <Bijlage3A4Pages
          data={tpData}
          decisions={tpData.bijlage3_decisions || []}
          page2={tpData.bijlage3_page2 || {}}
        />
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

      let clientCompanyName: string | null = null;
      if (employee.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('name')
          .eq('id', employee.client_id)
          .maybeSingle();
        clientCompanyName = client?.name ?? null;
      }

      const referent = await resolveReferentForEmployee(supabase, {
        referent_id: employee.referent_id,
        client_id: employee.client_id,
      });
      const refFields = referentToClientReferentFields(referent);

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
          appUserPhone = (appUser.phone || '').trim();
          appUserEmail = (appUser.email || '').trim();
        }
      }

      if (cancelled) return;

      setTPData((prev) => {
        const meta = { ...(metaRes.data || {}) };
        delete (meta as { tp_creation_date?: unknown }).tp_creation_date;

        const next = ensureTP2026Shape({
          ...prev,
          ...employee,
          ...(detailsRes.data || {}),
          ...meta,
        });

        if (clientCompanyName) {
          next.employer_name = clientCompanyName;
          next.client_name = clientCompanyName;
        }
        if (!String(next.consultant_name || '').trim() && appUserDisplayName) {
          next.consultant_name = appUserDisplayName;
        }
        if (!String(next.consultant_phone || '').trim() && appUserPhone) {
          next.consultant_phone = appUserPhone;
        }
        if (!String(next.consultant_email || '').trim() && appUserEmail) {
          next.consultant_email = appUserEmail;
        }

        if (!String(next.client_referent_name || '').trim() && refFields.client_referent_name) {
          next.client_referent_name = refFields.client_referent_name;
        }
        if (!String(next.client_referent_phone || '').trim() && refFields.client_referent_phone) {
          next.client_referent_phone = refFields.client_referent_phone;
        }
        if (!String(next.client_referent_email || '').trim() && refFields.client_referent_email) {
          next.client_referent_email = refFields.client_referent_email;
        }
        if (!String(next.client_referent_function || '').trim() && refFields.client_referent_function) {
          next.client_referent_function = refFields.client_referent_function;
        }

        return next;
      });

      if (!cancelled) {
        employeeHydrateKeyRef.current = hydrateKey;
        markSaved();
      }
    }

    void hydrateEmployeeDefaults();

    return () => {
      cancelled = true;
    };
  }, [employeeId, tpInstanceId, markSaved, setTPData, supabase]);

  // Opdrachtinformatie: derive end/start/lead time from traject dates (legacy EmployeeInfo behavior)
  useEffect(() => {
    const updates = getTrajectoryDateUpdates(tpData);
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) updateField(key, value);
    }
  }, [tpData.first_sick_day, tpData.registration_date, tpData.intake_date, tpData.tp_end_date, tpData.tp_start_date, updateField]);

  const persist = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from('tp_instances')
        .update({
          data_json: ensureTP2026Shape(tpData),
          updated_by: user?.id ?? null,
        })
        .eq('id', tpInstanceId);
      if (error) throw error;
      await saveAll();
      markSaved();
    } catch (error) {
      console.error('Failed to save TP 2026 instance', error);
      alert('Opslaan mislukt');
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

      autofillCancelRef.current = false;
      setAutofilling(true);
      setAutofillProgress({ currentIndex: 1, total: steps.length, currentLabel: 'Voorbereiden…' });

      try {
        const result = await runAutofillSteps(
          steps,
          { employeeId, supabase },
          { ...tpData, employee_id: tpData.employee_id ?? employeeId },
          {
            onProgress: setAutofillProgress,
            shouldCancel: () => autofillCancelRef.current,
          }
        );

        setTPData(result.data);

        if (result.cancelled) {
          showError(
            'Autofill gestopt',
            `${result.completed}/${steps.length} stappen voltooid voordat u stopte.`
          );
          return;
        }

        if (result.failed.length === 0) {
          showSuccess(`Autofill voltooid (${result.completed}/${steps.length} stappen).`);
          return;
        }

        if (result.completed > 0) {
          showError(
            'Autofill gedeeltelijk voltooid',
            `${result.completed}/${steps.length} stappen gelukt. Mislukt: ${result.failed
              .map((f) => f.label)
              .join('; ')}`
          );
          return;
        }

        showError(
          'Autofill mislukt',
          result.failed.map((f) => `${f.label}: ${f.error}`).join('; ')
        );
      } catch (error) {
        console.error('TP 2026 autofill failed', error);
        showError('Autofill mislukt', error instanceof Error ? error.message : 'Onbekende fout');
      } finally {
        setAutofilling(false);
        setAutofillProgress(null);
      }
    },
    [currentStep, employeeId, showError, showSuccess, supabase, tpData, setTPData]
  );

  const cancelAutofill = useCallback(() => {
    autofillCancelRef.current = true;
  }, []);

  const currentStepHasAutofill = canAutofillCurrentStep(currentStep);
  const currentStepAutofillAvailable =
    currentStepHasAutofill && buildAutofillSteps('current_step', currentStep, tpData).length > 0;

  const totalSteps = sections.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-indigo-50/20">
      <div className="flex-shrink-0 px-6 pt-3 pb-3 border-b border-indigo-200/50 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">Trajectplan Bouwer 2026</h1>
            <span className="text-sm text-gray-500">•</span>
            <p className="text-sm text-gray-600">
              Stap {currentStep} van {totalSteps}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton employeeId={employeeId} tpInstanceId={tpInstanceId} layoutKey="tp_2026" />
            <AutofillScopeDropdown
              loading={autofilling}
              currentStepDisabled={!currentStepAutofillAvailable}
              onRunAll={() => void runAutofill('all')}
              onRunCurrentStep={() => void runAutofill('current_step')}
            />
            <Button onClick={persist} disabled={saving || !isDirty}>
              {saving ? 'Opslaan…' : isDirty ? 'Opslaan' : 'Opgeslagen'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <div className="relative h-full min-h-0 p-6">
          {autofilling && autofillProgress ? (
            <AutofillProgressOverlay
              progress={autofillProgress}
              onCancel={cancelAutofill}
            />
          ) : null}
          {sections.map((section, index) => (
            <div key={section.id} style={{ display: currentStep === index + 1 ? 'block' : 'none' }} className="h-full min-h-0">
              <div className="flex min-h-0 h-full gap-10 items-stretch">
                <div className="flex w-[50%] min-h-0 flex-col space-y-3 overflow-y-auto pr-2">
                  {section.renderEditor()}
                </div>
                <TPPreviewWrapper>
                  <div className="space-y-8">{section.renderPreview()}</div>
                </TPPreviewWrapper>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 px-6 py-3 border-t border-indigo-200/50 bg-white/90 backdrop-blur-sm flex justify-between items-center">
        <Button variant="outline" onClick={() => setCurrentStep((s) => Math.max(1, s - 1))} disabled={currentStep === 1}>
          Terug
        </Button>
        <Button onClick={() => setCurrentStep((s) => Math.min(totalSteps, s + 1))} disabled={currentStep === totalSteps}>
          Volgende
        </Button>
      </div>
    </div>
  );
}

export default function TP2026Builder({ employeeId, tpInstanceId, initialData }: Props) {
  return (
    <TPInstanceProvider initialData={ensureTP2026Shape(initialData)}>
      <TP2026BuilderInner employeeId={employeeId} tpInstanceId={tpInstanceId} />
    </TPInstanceProvider>
  );
}
