'use client';

import { useCallback, useMemo, useState } from 'react';
import { useGuardedRouter } from '@/hooks/useGuardedRouter';
import UnsavedChangesSyncGuard from '@/components/unsaved/UnsavedChangesSyncGuard';
import { Check, ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase/client';
import { VGRInstanceProvider, useVGRInstance } from '@/context/VGRInstanceContext';
import { ExportButton } from '@/components/tp/ExportButton';
import TPPreviewWrapper from '@/components/tp/TPPreviewWrapper';
import { ensureVGRShape } from '@/lib/vgr/mapping';
import { persistVgrDraft } from '@/lib/vgr/persist-draft';
import { VGRPageNumberProvider } from '@/context/VGRPageNumberContext';
import { Bijlage2A4Pages, Bijlage2Editor } from '@/components/vgr/sections/Bijlage2Section';
import { Bijlage3A4Pages, Bijlage3Editor } from '@/components/vgr/sections/Bijlage3Section';
import { useToastHelpers } from '@/components/ui/Toast';

type Props = {
  employeeId: string;
  vgrInstanceId: string;
  initialData: Record<string, any>;
};

function VGRBuilderInner({ employeeId, vgrInstanceId }: { employeeId: string; vgrInstanceId: string }) {
  const guardedRouter = useGuardedRouter();
  const { vgrData, updateField, saveAll, isDirty, markSaved } = useVGRInstance();
  const { showSuccess, showError } = useToastHelpers();
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

  const persistDraftFromData = useCallback(
    async (data: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const result = await persistVgrDraft(supabase, {
        vgrInstanceId,
        employeeId,
        vgrData: data,
        userId: user?.id ?? null,
      });
      if (result.error) return { ok: false, error: result.error };
      await saveAll();
      markSaved();
      return { ok: true };
    },
    [employeeId, markSaved, saveAll, supabase, vgrInstanceId]
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

  const sections = [
    {
      id: 1,
      title: 'Bijlage 2',
      renderEditor: () => (
        <Bijlage2Editor
          model={vgrData.bijlage2_model}
          setModel={(next) => updateField('bijlage2_model', next)}
        />
      ),
      renderPreview: () => <Bijlage2A4Pages data={vgrData} model={vgrData.bijlage2_model} />,
    },
    {
      id: 2,
      title: 'Bijlage 3',
      renderEditor: () => (
        <Bijlage3Editor
          decisions={vgrData.bijlage3_decisions || []}
          setDecisions={(next) => updateField('bijlage3_decisions', next)}
          page2={vgrData.bijlage3_page2 || {}}
          setPage2={(next) => updateField('bijlage3_page2', next)}
        />
      ),
      renderPreview: () => (
        <Bijlage3A4Pages
          data={vgrData}
          decisions={vgrData.bijlage3_decisions || []}
          page2={vgrData.bijlage3_page2 || {}}
        />
      ),
    },
  ];

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <UnsavedChangesSyncGuard isDirty={isDirty} onSave={persistForGuard} autosave />
      <div className="shrink-0 border-b border-border bg-white px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-xl font-bold text-gray-900">VGR Bouwer</h1>
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
              vgrInstanceId={vgrInstanceId}
              layoutKey="vgr"
              variant="icon"
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
          {sections.map((section, index) => (
            <div
              key={section.id}
              style={{ display: currentStep === index + 1 ? 'block' : 'none' }}
              className="h-full min-h-0"
            >
              <div className="flex min-h-0 h-full gap-10 items-stretch overflow-hidden">
                <div className="flex max-h-full w-[50%] min-h-0 flex-col space-y-3 overflow-y-auto pr-2">
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
    </div>
  );
}

export default function VGRBuilder({ employeeId, vgrInstanceId, initialData }: Props) {
  return (
    <VGRInstanceProvider initialData={ensureVGRShape(initialData)}>
      <VGRPageNumberProvider>
        <VGRBuilderInner employeeId={employeeId} vgrInstanceId={vgrInstanceId} />
      </VGRPageNumberProvider>
    </VGRInstanceProvider>
  );
}
