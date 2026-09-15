'use client';

import type { ReactNode } from 'react';
import type { IntakeData, IntakeFmlBeperkingen } from '@/lib/intake/schema';
import { INTAKE_SECTION_DEFS } from '@/lib/intake/schema';
import {
  DRIVERS_LICENSE_TYPE_OPTIONS,
  TRANSPORT_TYPE_OPTIONS,
  DUTCH_LANGUAGE_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
} from '@/lib/tp2026/gegevens-field-options';

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
};

function Field({ label, value, onChange, multiline, rows = 3 }: FieldProps) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {multiline ? (
        <textarea
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300"
      />
      {label}
    </label>
  );
}

type Props = {
  data: IntakeData;
  onChange: (next: IntakeData) => void;
  activeSection: string;
};

export function IntakeSectionEditor({ data, onChange, activeSection }: Props) {
  const setS = <K extends keyof IntakeData>(key: K, value: IntakeData[K]) => {
    onChange({ ...data, [key]: value });
  };

  const patch = <K extends keyof IntakeData>(key: K, patchObj: Partial<IntakeData[K]>) => {
    setS(key, { ...(data[key] as object), ...patchObj } as IntakeData[K]);
  };

  const fmlKeys: { key: keyof IntakeFmlBeperkingen; label: string }[] = [
    { key: 'persoonlijk_functioneren', label: 'Persoonlijk functioneren' },
    { key: 'sociaal_functioneren', label: 'Sociaal functioneren' },
    { key: 'dynamische_handelingen', label: 'Dynamische handelingen' },
    { key: 'statische_houdingen', label: 'Statische houdingen' },
    { key: 'aanpassingen_fysieke_omgevingseisen', label: 'Aanpassingen fysieke omgevingseisen' },
    { key: 'werktijden', label: 'Werktijden' },
  ];

  let body: ReactNode = null;

  switch (activeSection) {
    case 's1':
      body = (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Naam werknemer"
            value={data.s1.employee_name}
            onChange={(v) => patch('s1', { employee_name: v })}
          />
          <Field
            label="Datum gesprek"
            value={data.s1.intake_date}
            onChange={(v) => patch('s1', { intake_date: v })}
          />
        </div>
      );
      break;
    case 's2':
      body = (
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['age', 'Leeftijd'],
              ['gender', 'Geslacht'],
              ['current_job', 'Functietitel'],
              ['employer', 'Werkgever/organisatie'],
              ['contract_hours', 'Urenomvang per week'],
              ['city', 'Woonplaats'],
              ['phone', 'Telefoonnummer'],
              ['email', 'Email'],
              ['other_employers', 'Andere werkgever'],
            ] as const
          ).map(([k, label]) => (
            <Field
              key={k}
              label={label}
              value={data.s2[k]}
              onChange={(v) => patch('s2', { [k]: v })}
            />
          ))}
        </div>
      );
      break;
    case 's3':
      body = (
        <Field
          label="Korte beschrijving van de werkzaamheden"
          value={data.s3.korte_beschrijving_werkzaamheden}
          onChange={(v) => patch('s3', { korte_beschrijving_werkzaamheden: v })}
          multiline
          rows={6}
        />
      );
      break;
    case 's4':
      body = (
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['referent_name', 'Naam contactpersoon'],
              ['referent_function', 'Functietitel contactpersoon'],
              ['referent_phone', 'Telefoonnummer contactpersoon'],
              ['referent_email', 'Email contactpersoon'],
              ['extra_referent_name', 'Naam extra contactpersoon'],
              ['extra_referent_function', 'Functie extra contactpersoon'],
            ] as const
          ).map(([k, label]) => (
            <Field
              key={k}
              label={label}
              value={data.s4[k]}
              onChange={(v) => patch('s4', { [k]: v })}
            />
          ))}
        </div>
      );
      break;
    case 's5':
      body = (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Datum eerste ziekte dag"
              value={data.s5.first_sick_day}
              onChange={(v) => patch('s5', { first_sick_day: v })}
            />
            <Field
              label="Reden ziekmelding"
              value={data.s5.reden_ziekmelding}
              onChange={(v) => patch('s5', { reden_ziekmelding: v })}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">FML/IZP-beperkingen</p>
            <div className="flex flex-wrap gap-3">
              {fmlKeys.map(({ key, label }) => (
                <Checkbox
                  key={key}
                  label={label}
                  checked={data.s5.fml_beperkingen[key]}
                  onChange={(v) =>
                    patch('s5', {
                      fml_beperkingen: { ...data.s5.fml_beperkingen, [key]: v },
                    })
                  }
                />
              ))}
            </div>
          </div>
          <Field
            label="Quote prognose en quote advies belastbaarheid"
            value={data.s5.quote_prognose_advies_belastbaarheid}
            onChange={(v) => patch('s5', { quote_prognose_advies_belastbaarheid: v })}
            multiline
            rows={5}
          />
          <Field
            label="Behandeling"
            value={data.s5.behandeling}
            onChange={(v) => patch('s5', { behandeling: v })}
            multiline
          />
        </div>
      );
      break;
    case 's6':
      body = (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['date_of_birth', 'Geboortedatum'],
                ['weken', 'Weken'],
                ['registration_date', 'Aanmelddatum'],
                ['tp_start_date', 'Startdatum'],
                ['fml_izp_lab_date', 'Datum FML/IZP'],
                ['tp_end_date', 'Einddatum'],
                ['doctor_role', 'Arts-type (Arts/Anios/Aios/BA/VA)'],
                ['occupational_doctor_name', 'Naam arts'],
                ['ad_report_date', 'Datum AD-rapport'],
                ['osv_doctor_role', 'OSV type'],
                ['osv_doctor_name', 'OSV naam'],
                ['occupational_doctor_ad_name', 'Naam AD'],
              ] as const
            ).map(([k, label]) => (
              <Field
                key={k}
                label={label}
                value={String(data.s6[k] ?? '')}
                onChange={(v) => patch('s6', { [k]: v })}
              />
            ))}
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">FML of IZP</span>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={data.s6.fml_izp_lab_kind}
                onChange={(e) =>
                  patch('s6', {
                    fml_izp_lab_kind: e.target.value as '' | 'fml' | 'izp',
                  })
                }
              >
                <option value="">—</option>
                <option value="fml">FML</option>
                <option value="izp">IZP</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-4">
            <Checkbox
              label="Concept AD-rapport"
              checked={data.s6.ad_report_concept}
              onChange={(v) => patch('s6', { ad_report_concept: v })}
            />
            <Checkbox
              label="Ex-werknemer"
              checked={data.s6.is_ex_werknemer}
              onChange={(v) => patch('s6', { is_ex_werknemer: v })}
            />
          </div>
          <div className="grid gap-3">
            {(
              [
                ['actief_spoor1', 'Actief binnen Spoor 1'],
                ['eigen_of_aangepast_werk', 'In eigen of aangepast werk'],
                ['uren_werkzaam', 'Uren per week werkzaam'],
                ['opbouwschema_aanwezig', 'Opbouwschema aanwezig'],
                ['wat_lukt_wel_niet', 'Wat lukt wel/niet'],
                ['ervaart_belastbaarheid', 'Ervaart belastbaarheid'],
                ['andere_werkgever', 'Andere werkgever'],
              ] as const
            ).map(([k, label]) => (
              <Field
                key={k}
                label={label}
                value={data.s6[k]}
                onChange={(v) => patch('s6', { [k]: v })}
                multiline={k === 'wat_lukt_wel_niet' || k === 'ervaart_belastbaarheid'}
              />
            ))}
          </div>
        </div>
      );
      break;
    case 's7':
      body = (
        <div className="space-y-3">
          <Field
            label="Naam arbeidsdeskundige"
            value={data.s7.ad_auteur}
            onChange={(v) => patch('s7', { ad_auteur: v })}
          />
          <Field
            label="Quote advies spoor 2"
            value={data.s7.quote_advies_spoor2}
            onChange={(v) => patch('s7', { quote_advies_spoor2: v })}
            multiline
            rows={5}
          />
          <Field
            label="Quote passende functies"
            value={data.s7.quote_passende_functies}
            onChange={(v) => patch('s7', { quote_passende_functies: v })}
            multiline
            rows={5}
          />
        </div>
      );
      break;
    case 's8':
    case 's9':
    case 's10':
    case 's11':
    case 's12':
    case 's13':
    case 's14':
    case 's16': {
      const section = data[activeSection] as Record<string, string>;
      body = (
        <div className="grid gap-3">
          {Object.keys(section).map((k) => (
            <Field
              key={k}
              label={k.replace(/_/g, ' ')}
              value={section[k] || ''}
              onChange={(v) => patch(activeSection, { [k]: v })}
              multiline
            />
          ))}
        </div>
      );
      break;
    }
    case 's17':
      body = (
        <div className="space-y-4">
          <Field
            label="Bijzonderheden"
            value={data.s17.bijzonderheden}
            onChange={(v) => patch('s17', { bijzonderheden: v })}
            multiline
          />
          <Field
            label="Praktische belemmeringen"
            value={data.s17.praktische_belemmeringen}
            onChange={(v) => patch('s17', { praktische_belemmeringen: v })}
            multiline
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">Opleidingsniveau</span>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={data.s17.education_level}
                onChange={(e) => patch('s17', { education_level: e.target.value })}
              >
                <option value="">—</option>
                {EDUCATION_LEVEL_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Opleidingsrichting"
              value={data.s17.education_name}
              onChange={(v) => patch('s17', { education_name: v })}
            />
            <Field
              label="Werkervaring (functies)"
              value={data.s17.work_experience}
              onChange={(v) => patch('s17', { work_experience: v })}
            />
            <Field
              label="Computervaardigheden"
              value={data.s17.computer_skills}
              onChange={(v) => patch('s17', { computer_skills: v })}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Checkbox
              label="PC/laptop"
              checked={data.s17.has_pc}
              onChange={(v) => patch('s17', { has_pc: v })}
            />
            <Checkbox
              label="Smartphone"
              checked={data.s17.has_smartphone}
              onChange={(v) => patch('s17', { has_smartphone: v })}
            />
            <Checkbox
              label="Tablet"
              checked={data.s17.has_tablet}
              onChange={(v) => patch('s17', { has_tablet: v })}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Vervoer</p>
            <div className="flex flex-wrap gap-3">
              {TRANSPORT_TYPE_OPTIONS.map((value) => (
                <Checkbox
                  key={value}
                  label={value}
                  checked={data.s17.transport_types.includes(value)}
                  onChange={(checked) => {
                    const next = checked
                      ? [...data.s17.transport_types, value]
                      : data.s17.transport_types.filter((t) => t !== value);
                    patch('s17', { transport_types: next });
                  }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Rijbewijs</p>
            <div className="flex flex-wrap gap-3">
              {DRIVERS_LICENSE_TYPE_OPTIONS.filter((o) => o.value !== 'E').map((o) => (
                <Checkbox
                  key={o.value}
                  label={o.label}
                  checked={data.s17.drivers_license_types.includes(o.value)}
                  onChange={(checked) => {
                    const next = checked
                      ? [...data.s17.drivers_license_types, o.value]
                      : data.s17.drivers_license_types.filter((t) => t !== o.value);
                    patch('s17', { drivers_license_types: next });
                  }}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">Nederlands spreken</span>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={data.s17.dutch_speaking}
                onChange={(e) => patch('s17', { dutch_speaking: e.target.value })}
              >
                <option value="">—</option>
                {DUTCH_LANGUAGE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">Nederlands schrijven</span>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={data.s17.dutch_writing}
                onChange={(e) => patch('s17', { dutch_writing: e.target.value })}
              >
                <option value="">—</option>
                {DUTCH_LANGUAGE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      );
      break;
    default:
      body = <p className="text-sm text-gray-500">Selecteer een sectie.</p>;
  }

  const title = INTAKE_SECTION_DEFS.find((s) => s.key === activeSection)?.title ?? activeSection;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {body}
    </div>
  );
}
