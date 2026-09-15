'use client';

import type { IntakeData, IntakeFmlBeperkingen, IntakeSectionKey } from '@/lib/intake/schema';
import { INTAKE_SECTION_DEFS } from '@/lib/intake/schema';
import {
  DRIVERS_LICENSE_TYPE_OPTIONS,
  TRANSPORT_TYPE_OPTIONS,
  DUTCH_LANGUAGE_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
} from '@/lib/tp2026/gegevens-field-options';
import { IntakeDossierHeader } from '@/components/intake/IntakeDossierHeader';

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
};

export function IntakeSectionEditor({ data, onChange }: Props) {
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

  const narrativeLabels: Partial<Record<IntakeSectionKey, Record<string, string>>> = {
    s8: {
      woonplaats: 'Woonplaats',
      woonsituatie: 'Woonsituatie werknemer',
      uitwonende_kinderen: 'Zijn er uitwonende kinderen',
    },
    s9: {
      contact_familie: 'Hoe is het contact met familieleden',
      hoe_vaak_contact: 'Hoe vaak is er contact',
      ondersteuning_familie: 'Ondersteuning van familie/vrienden',
      mantelzorg: 'Mantelzorg of wederzijdse hulp',
    },
    s10: {
      zelfstandig_huishouden: 'Zelfstandig zorg voor het huishouden',
      hulp_huishouden: 'Hulp van partner, familie en/of vrienden',
      taken_verdeeld: 'Hoe worden de taken verdeeld',
    },
    s11: {
      gemiddelde_dag: 'Hoe ziet een gemiddelde dag eruit',
      activiteiten_buitenshuis: 'Activiteiten buitenshuis',
      energie_belastbaarheid: 'Energie of belastbaarheid',
    },
    s12: {
      hobbies: "Hobby's / ontspanningsvormen",
      leest_of_muziek: 'Leest of luistert naar muziek',
      kan_uitvoeren: 'Kan werknemer deze nu uitvoeren',
      graag_oppakken: 'Activiteiten graag (weer) oppakken',
    },
    s13: {
      hoe_lang_werkzaam: 'Hoe lang werkzaam bij werkgever',
      verbonden_organisatie: 'Verbonden met de organisatie',
      wens_terugkeer: 'Wens terug te keren in eigen functie',
    },
    s14: {
      houding_spoor2: 'Houding t.o.v. deelname aan spoor 2',
    },
    s16: {
      interesses_voorkeuren: 'Interesses of voorkeuren',
      ideeen_passend_werk: 'Ideeën voor passend werk',
      bereid_scholing: 'Bereid tot scholing of omscholing',
      graag_ontdekken: 'Graag ontdekken of leren in het traject',
    },
  };

  function renderSectionBody(sectionKey: IntakeSectionKey) {
    switch (sectionKey) {
      case 's1':
        return (
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
      case 's2':
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['age', 'Leeftijd werknemer'],
                ['gender', 'Geslacht werknemer'],
                ['current_job', 'Functietitel'],
                ['employer', 'Werkgever/organisatie'],
                ['contract_hours', 'Urenomvang functie (per week)'],
                ['city', 'Woonplaats'],
                ['phone', 'Telefoonnummer werknemer'],
                ['email', 'Email werknemer'],
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
      case 's3':
        return (
          <Field
            label="Korte beschrijving van de werkzaamheden"
            value={data.s3.korte_beschrijving_werkzaamheden}
            onChange={(v) => patch('s3', { korte_beschrijving_werkzaamheden: v })}
            multiline
            rows={6}
          />
        );
      case 's4':
        return (
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
      case 's5':
        return (
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
              label="Quote prognose en quote advies belastbaarheid (bedrijfsarts)"
              value={data.s5.quote_prognose_advies_belastbaarheid}
              onChange={(v) => patch('s5', { quote_prognose_advies_belastbaarheid: v })}
              multiline
              rows={5}
            />
            <Field
              label="Behandeling (frequentie en type)"
              value={data.s5.behandeling}
              onChange={(v) => patch('s5', { behandeling: v })}
              multiline
            />
          </div>
        );
      case 's6':
        return (
          <div className="grid gap-3">
            {(
              [
                ['actief_spoor1', 'Is werknemer momenteel actief binnen Spoor 1'],
                ['eigen_of_aangepast_werk', 'In eigen of aangepast werk'],
                ['uren_werkzaam', 'Hoeveel uur per week is werknemer in werkzaam'],
                ['opbouwschema_aanwezig', 'Opbouwschema aanwezig'],
                ['wat_lukt_wel_niet', 'Wat lukt momenteel wel en wat niet qua werkbelasting'],
                ['ervaart_belastbaarheid', 'Hoe ervaart werknemer zijn/haar belastbaarheid'],
                ['andere_werkgever', 'Heeft werknemer nog een andere werkgever'],
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
        );
      case 's7':
        return (
          <div className="space-y-3">
            <Field
              label="Naam arbeidsdeskundige"
              value={data.s7.ad_auteur}
              onChange={(v) => patch('s7', { ad_auteur: v })}
            />
            <Field
              label="Quote advies spoor 2 (inleiding)"
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
      case 's8':
      case 's9':
      case 's10':
      case 's11':
      case 's12':
      case 's13':
      case 's14':
      case 's16': {
        const section = data[sectionKey] as Record<string, string>;
        const labels = narrativeLabels[sectionKey] || {};
        return (
          <div className="grid gap-3">
            {Object.keys(section).map((k) => (
              <Field
                key={k}
                label={labels[k] || k.replace(/_/g, ' ')}
                value={section[k] || ''}
                onChange={(v) => patch(sectionKey, { [k]: v })}
                multiline
              />
            ))}
          </div>
        );
      }
      case 's17':
        return (
          <div className="space-y-4">
            <Field
              label="Bijzonderheden waar rekening mee gehouden moet worden"
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
              <p className="mb-2 text-sm font-medium text-gray-700">Hoe verplaatst werknemer zich</p>
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
      default:
        return null;
    }
  }

  return (
    <div className="space-y-10 pb-16">
      <IntakeDossierHeader data={data} onPatchS6={(p) => patch('s6', p)} />
      {INTAKE_SECTION_DEFS.map((def) => (
        <section
          key={def.key}
          id={`intake-sec-${def.key}`}
          className="scroll-mt-4 space-y-4 border-b border-gray-100 pb-8 last:border-b-0"
        >
          <h2 className="text-lg font-semibold text-gray-900">{def.title}</h2>
          {renderSectionBody(def.key)}
        </section>
      ))}
    </div>
  );
}
