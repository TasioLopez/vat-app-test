'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase/client';
import { TPInstanceProvider, useTPInstance } from '@/context/TPInstanceContext';
import { ExportButton } from '@/components/tp/ExportButton';
import TPPreviewWrapper from '@/components/tp/TPPreviewWrapper';
import { ensureTP2026Shape, mergeAutofillIntoTP2026 } from '@/lib/tp2026/mapping';
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

type Props = {
  employeeId: string;
  tpInstanceId: string;
  initialData: Record<string, any>;
};

function TP2026BuilderInner({ employeeId, tpInstanceId }: { employeeId: string; tpInstanceId: string }) {
  const { tpData, setTPData, updateField, saveAll, isDirty, markSaved } = useTPInstance();
  const employeeHydrateKeyRef = useRef<string | null>(null);
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
      renderEditor: () => <Basis2026Editor data={tpData} updateField={updateField} />,
      renderPreview: () => <Basis2026A4Pages data={tpData} />,
    },
    {
      id: 4,
      title: 'Bijlage 1',
      renderEditor: () => (
        <Bijlage1Editor
          phases={tpData.bijlage1_phases || []}
          setPhases={(next) => updateField('bijlage1_phases', next)}
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
        />
      ),
      renderPreview: () => <Bijlage3A4Pages data={tpData} decisions={tpData.bijlage3_decisions || []} />,
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

      const {
        data: { user },
      } = await supabase.auth.getUser();
      let appUserDisplayName = '';
      if (user?.id) {
        const { data: appUser } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', user.id)
          .maybeSingle();
        if (appUser) {
          appUserDisplayName = [appUser.first_name, appUser.last_name].filter(Boolean).join(' ').trim();
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

        if (appUserDisplayName) next.client_name = appUserDisplayName;

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

  const runAutofill = async () => {
    setAutofilling(true);
    try {
      let next: Record<string, any> = { ...tpData };

      const tp2Res = await fetch(`/api/autofill-tp-2?employeeId=${employeeId}`);
      const tp2Json = await tp2Res.json();
      if (tp2Res.ok && tp2Json?.details) {
        next = mergeAutofillIntoTP2026(next, tp2Json.details);
      }

      const tp3Endpoints = [
        '/api/autofill-tp-3/inleiding',
        '/api/autofill-tp-3/sociale-achtergrond',
        '/api/autofill-tp-3/visie-werknemer',
        '/api/autofill-tp-3/visie-adviseur',
        '/api/autofill-tp-3/prognose-bedrijfsarts',
        '/api/autofill-tp-3/persoonlijk-profiel',
        '/api/autofill-tp-3/zoekprofiel',
        '/api/autofill-tp-3/ad-advies-passende-arbeid',
        '/api/autofill-tp-3/visie-plaatsbaarheid',
        '/api/autofill-tp-3/pow-meter',
      ];

      for (const endpoint of tp3Endpoints) {
        try {
          const res = await fetch(`${endpoint}?employeeId=${employeeId}`);
          const json = await res.json();
          if (!res.ok) continue;
          if (json?.details && typeof json.details === 'object') {
            next = mergeAutofillIntoTP2026(next, json.details);
          }
          if (json?.data?.pow_meter) next.pow_meter = json.data.pow_meter;
        } catch {
          // continue to next endpoint
        }
      }

      setTPData(ensureTP2026Shape(next));
    } catch (error) {
      console.error('TP 2026 autofill failed', error);
      alert('Autofill mislukt');
    } finally {
      setAutofilling(false);
    }
  };

  const totalSteps = sections.length;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-indigo-50/20">
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
            <Button variant="outline" onClick={runAutofill} disabled={autofilling}>
              {autofilling ? 'Autofill…' : 'Autofill met bestaande TP AI'}
            </Button>
            <Button onClick={persist} disabled={saving || !isDirty}>
              {saving ? 'Opslaan…' : isDirty ? 'Opslaan' : 'Opgeslagen'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <div className="h-full p-6 relative">
          {sections.map((section, index) => (
            <div key={section.id} style={{ display: currentStep === index + 1 ? 'block' : 'none' }} className="h-full">
              <div className="flex gap-10 h-full items-start overflow-hidden">
                <div className="w-[50%] space-y-3 overflow-y-auto max-h-full pr-2">
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
