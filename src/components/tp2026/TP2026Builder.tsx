'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createBrowserClient } from '@/lib/supabase/client';
import { TPInstanceProvider, useTPInstance } from '@/context/TPInstanceContext';
import { ExportButton } from '@/components/tp/ExportButton';

type Props = {
  employeeId: string;
  tpInstanceId: string;
  initialData: Record<string, any>;
};

type SectionProps = {
  employeeId: string;
};

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      {multiline ? (
        <Textarea value={value || ''} onChange={(e) => onChange(e.target.value)} className="min-h-[90px]" />
      ) : (
        <Input value={value || ''} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function Cover2026Section({ employeeId }: SectionProps) {
  const { tpData, updateField } = useTPInstance();
  void employeeId;

  return (
    <div className="grid grid-cols-2 gap-8 h-full">
      <div className="space-y-4">
        <Field label="Werknemer naam" value={tpData.employee_name} onChange={(v) => updateField('employee_name', v)} />
        <Field label="Voornaam" value={tpData.first_name} onChange={(v) => updateField('first_name', v)} />
        <Field label="Achternaam" value={tpData.last_name} onChange={(v) => updateField('last_name', v)} />
        <Field label="Datum rapportage" value={tpData.tp_creation_date} onChange={(v) => updateField('tp_creation_date', v)} />
        <Field label="Opdrachtgever" value={tpData.client_name} onChange={(v) => updateField('client_name', v)} />
      </div>
      <div className="bg-white border shadow-sm p-10 min-h-[700px]">
        <h2 className="text-xl font-semibold mb-6">Trajectplan Spoor 2 begeleiding</h2>
        <p className="mb-2">Voor {tpData.employee_name || '—'}</p>
        <p className="mb-2">Datum rapportage {tpData.tp_creation_date || '—'}</p>
        <p>Opdrachtgever {tpData.client_name || '—'}</p>
      </div>
    </div>
  );
}

function Gegevens2026Section({ employeeId }: SectionProps) {
  const { tpData, updateField } = useTPInstance();
  void employeeId;

  return (
    <div className="grid grid-cols-2 gap-8 h-full">
      <div className="space-y-3 overflow-y-auto pr-2">
        <Field label="Telefoon werknemer" value={tpData.phone} onChange={(v) => updateField('phone', v)} />
        <Field label="Email werknemer" value={tpData.email} onChange={(v) => updateField('email', v)} />
        <Field label="Geboortedatum" value={tpData.date_of_birth} onChange={(v) => updateField('date_of_birth', v)} />
        <Field label="Eerste ziektedag" value={tpData.first_sick_day} onChange={(v) => updateField('first_sick_day', v)} />
        <Field label="Datum aanmelding" value={tpData.registration_date} onChange={(v) => updateField('registration_date', v)} />
        <Field label="Datum intakegesprek" value={tpData.intake_date} onChange={(v) => updateField('intake_date', v)} />
        <Field label="Datum opmaak TP" value={tpData.tp_creation_date} onChange={(v) => updateField('tp_creation_date', v)} />
        <Field label="AD rapport aanwezig (ja/nee)" value={tpData.has_ad_report ? 'ja' : 'nee'} onChange={(v) => updateField('has_ad_report', v.toLowerCase() === 'ja')} />
        <Field label="Datum AD rapportage" value={tpData.ad_report_date} onChange={(v) => updateField('ad_report_date', v)} />
        <Field label="Arbeidsdeskundige" value={tpData.occupational_doctor_name} onChange={(v) => updateField('occupational_doctor_name', v)} />
        <Field label="Bedrijfsarts" value={tpData.occupational_doctor_org} onChange={(v) => updateField('occupational_doctor_org', v)} />
        <Field label="Datum FML/IZP/LAB" value={tpData.fml_izp_lab_date} onChange={(v) => updateField('fml_izp_lab_date', v)} />
        <Field label="Contactpersoon opdrachtgever" value={tpData.client_referent_name} onChange={(v) => updateField('client_referent_name', v)} />
        <Field label="Telefoon opdrachtgever" value={tpData.client_referent_phone} onChange={(v) => updateField('client_referent_phone', v)} />
        <Field label="Email opdrachtgever" value={tpData.client_referent_email} onChange={(v) => updateField('client_referent_email', v)} />
      </div>
      <div className="bg-white border shadow-sm p-8 min-h-[700px] overflow-y-auto">
        <h3 className="font-semibold text-lg mb-4">Gegevens werknemer</h3>
        <p>Naam: {tpData.last_name || '—'} ({tpData.first_name || '—'})</p>
        <p>Telefoon: {tpData.phone || '—'}</p>
        <p>Email: {tpData.email || '—'}</p>
        <p>Geboortedatum: {tpData.date_of_birth || '—'}</p>
        <h3 className="font-semibold text-lg mt-6 mb-4">Opdrachtinformatie</h3>
        <p>Doorlooptijd: {tpData.tp_lead_time || '—'} weken</p>
        <p>Startdatum: {tpData.tp_start_date || '—'}</p>
        <p>Einddatum: {tpData.tp_end_date || '—'}</p>
      </div>
    </div>
  );
}

function Basis2026Section({ employeeId }: SectionProps) {
  const { tpData, updateField } = useTPInstance();
  void employeeId;

  const longFields: Array<[string, string]> = [
    ['inleiding', 'Inleiding'],
    ['sociale_achtergrond', 'Sociale achtergrond & maatschappelijke context'],
    ['visie_werknemer', 'Visie van werknemer'],
    ['persoonlijk_profiel', 'Persoonlijk profiel'],
    ['prognose_bedrijfsarts', 'Belastbaarheidsprofiel: Prognose'],
    ['advies_ad_passende_arbeid', 'Advies passende arbeid'],
    ['pow_meter', 'POW-meter en inschaling'],
    ['visie_plaatsbaarheid', 'Visie op plaatsbaarheid'],
    ['visie_loopbaanadviseur', 'Visie loopbaanadviseur'],
    ['zoekprofiel', 'Zoekprofiel'],
  ];

  return (
    <div className="grid grid-cols-2 gap-8 h-full">
      <div className="space-y-3 overflow-y-auto pr-2">
        {longFields.map(([key, label]) => (
          <Field key={key} label={label} value={tpData[key]} onChange={(v) => updateField(key, v)} multiline />
        ))}
      </div>
      <div className="bg-white border shadow-sm p-8 min-h-[700px] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">TP 2026 basisdocument (preview)</h3>
        {longFields.map(([key, label]) => (
          <div key={key} className="mb-4">
            <h4 className="font-semibold text-[#660066]">{label}</h4>
            <p className="whitespace-pre-wrap text-sm">{tpData[key] || '— nog niet ingevuld —'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bijlage2026Section({
  title,
  field,
}: {
  title: string;
  field: string;
}) {
  const { tpData, updateField } = useTPInstance();
  return (
    <div className="grid grid-cols-2 gap-8 h-full">
      <div className="space-y-3">
        <Field label={`${title} (inhoud)`} value={tpData[field]} onChange={(v) => updateField(field, v)} multiline />
      </div>
      <div className="bg-white border shadow-sm p-8 min-h-[700px] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="whitespace-pre-wrap text-sm">{tpData[field] || '— nog niet ingevuld —'}</p>
      </div>
    </div>
  );
}

function TP2026BuilderInner({ employeeId, tpInstanceId }: { employeeId: string; tpInstanceId: string }) {
  const { tpData, setTPData, saveAll, isDirty, markSaved } = useTPInstance();
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

  const sections: Array<{ id: number; title: string; component: React.ComponentType<SectionProps> }> = [
    { id: 1, title: '01 Voorblad', component: Cover2026Section },
    { id: 2, title: '02 Gegevens', component: Gegevens2026Section },
    { id: 3, title: '03 Basisdocument', component: Basis2026Section },
    { id: 4, title: 'Bijlage 1', component: () => <Bijlage2026Section title="Bijlage 1: Voortgang en planning" field="bijlage1_content" /> as any },
    { id: 5, title: 'Bijlage 2', component: () => <Bijlage2026Section title="Bijlage 2: Leernavigator" field="bijlage2_content" /> as any },
    { id: 6, title: 'Bijlage 3', component: () => <Bijlage2026Section title="Bijlage 3: Stroomschema POW-meter" field="bijlage3_content" /> as any },
  ];

  useEffect(() => {
    async function hydrateDefaults() {
      if (Object.keys(tpData || {}).length > 0) return;

      const [employeeRes, detailsRes, metaRes] = await Promise.all([
        (supabase as any).from('employees').select('first_name,last_name,email,client_id,referent_id').eq('id', employeeId).maybeSingle(),
        supabase.from('employee_details').select('*').eq('employee_id', employeeId).maybeSingle(),
        supabase.from('tp_meta').select('*').eq('employee_id', employeeId).maybeSingle(),
      ]);

      const merged: Record<string, any> = {
        ...(employeeRes.data || {}),
        ...(detailsRes.data || {}),
        ...(metaRes.data || {}),
      };

      if (employeeRes.data?.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('name')
          .eq('id', employeeRes.data.client_id)
          .maybeSingle();
        if (client?.name) merged.client_name = client.name;
      }
      merged.employee_name = [merged.first_name, merged.last_name].filter(Boolean).join(' ').trim();

      setTPData(merged);
      markSaved();
    }

    hydrateDefaults();
  }, [employeeId, markSaved, setTPData, supabase, tpData]);

  const persist = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from('tp_instances')
        .update({
          data_json: tpData,
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
      const next: Record<string, any> = { ...tpData };

      const tp2Res = await fetch(`/api/autofill-tp-2?employeeId=${employeeId}`);
      const tp2Json = await tp2Res.json();
      if (tp2Res.ok && tp2Json?.details) {
        Object.assign(next, tp2Json.details);
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
            Object.assign(next, json.details);
          }
          if (json?.data?.pow_meter) {
            next.pow_meter = json.data.pow_meter;
          }
        } catch {
          // Continue with other endpoints; partial autofill is acceptable.
        }
      }

      setTPData(next);
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
        <div className="h-full overflow-y-auto p-6 relative">
          {sections.map((section, index) => (
            <div key={section.id} style={{ display: currentStep === index + 1 ? 'block' : 'none' }} className="h-full">
              <section.component employeeId={employeeId} />
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
    <TPInstanceProvider initialData={initialData}>
      <TP2026BuilderInner employeeId={employeeId} tpInstanceId={tpInstanceId} />
    </TPInstanceProvider>
  );
}
