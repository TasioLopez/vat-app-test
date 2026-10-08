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
import {
  IntakeField,
  IntakeSelectField,
  IntakeToggleChip,
} from '@/components/intake/IntakeFormControls';

type Props = {
  data: IntakeData;
  onChange: (next: IntakeData, opts?: { debounce?: boolean }) => void;
};

export function IntakeSectionEditor({ data, onChange }: Props) {
  const setS = <K extends keyof IntakeData>(
    key: K,
    value: IntakeData[K],
    opts?: { debounce?: boolean }
  ) => {
    onChange({ ...data, [key]: value }, opts);
  };

  const patch = <K extends keyof IntakeData>(
    key: K,
    patchObj: Partial<IntakeData[K]>,
    opts?: { debounce?: boolean }
  ) => {
    setS(key, { ...(data[key] as object), ...patchObj } as IntakeData[K], opts);
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
          <div className="grid gap-4 sm:grid-cols-2">
            <IntakeField
              label="Naam werknemer"
              value={data.s1.employee_name}
              onChange={(v) => patch('s1', { employee_name: v }, { debounce: true })}
            />
            <IntakeField
              label="Datum gesprek"
              type="date"
              value={data.s1.intake_date}
              onChange={(v) => patch('s1', { intake_date: v })}
            />
          </div>
        );
      case 's2':
        return (
          <div className="grid gap-4 sm:grid-cols-2">
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
              <IntakeField
                key={k}
                label={label}
                value={data.s2[k]}
                onChange={(v) => patch('s2', { [k]: v }, { debounce: true })}
              />
            ))}
          </div>
        );
      case 's3':
        return (
          <IntakeField
            label="Korte beschrijving van de werkzaamheden"
            value={data.s3.korte_beschrijving_werkzaamheden}
            onChange={(v) =>
              patch('s3', { korte_beschrijving_werkzaamheden: v }, { debounce: true })
            }
            multiline
            rows={6}
          />
        );
      case 's4':
        return (
          <div className="grid gap-4 sm:grid-cols-2">
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
              <IntakeField
                key={k}
                label={label}
                value={data.s4[k]}
                onChange={(v) => patch('s4', { [k]: v }, { debounce: true })}
              />
            ))}
          </div>
        );
      case 's5':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <IntakeField
                label="Datum eerste ziekte dag"
                type="date"
                value={data.s5.first_sick_day}
                onChange={(v) => patch('s5', { first_sick_day: v })}
              />
              <IntakeField
                label="Reden ziekmelding"
                value={data.s5.reden_ziekmelding}
                onChange={(v) => patch('s5', { reden_ziekmelding: v }, { debounce: true })}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-600">FML/IZP-beperkingen</p>
              <div className="flex flex-wrap gap-2">
                {fmlKeys.map(({ key, label }) => (
                  <IntakeToggleChip
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
            <IntakeField
              label="Quote prognose en quote advies belastbaarheid (bedrijfsarts)"
              value={data.s5.quote_prognose_advies_belastbaarheid}
              onChange={(v) =>
                patch('s5', { quote_prognose_advies_belastbaarheid: v }, { debounce: true })
              }
              multiline
              rows={5}
            />
            <IntakeField
              label="Behandeling (frequentie en type)"
              value={data.s5.behandeling}
              onChange={(v) => patch('s5', { behandeling: v }, { debounce: true })}
              multiline
            />
          </div>
        );
      case 's6':
        return (
          <div className="grid gap-4">
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
              <IntakeField
                key={k}
                label={label}
                value={data.s6[k]}
                onChange={(v) => patch('s6', { [k]: v }, { debounce: true })}
                multiline={k === 'wat_lukt_wel_niet' || k === 'ervaart_belastbaarheid'}
              />
            ))}
          </div>
        );
      case 's7':
        return (
          <div className="space-y-4">
            <IntakeField
              label="Naam arbeidsdeskundige"
              value={data.s7.ad_auteur}
              onChange={(v) => patch('s7', { ad_auteur: v }, { debounce: true })}
            />
            <IntakeField
              label="Quote advies spoor 2 (inleiding)"
              value={data.s7.quote_advies_spoor2}
              onChange={(v) => patch('s7', { quote_advies_spoor2: v }, { debounce: true })}
              multiline
              rows={5}
            />
            <IntakeField
              label="Quote passende functies"
              value={data.s7.quote_passende_functies}
              onChange={(v) => patch('s7', { quote_passende_functies: v }, { debounce: true })}
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
          <div className="grid gap-4">
            {Object.keys(section).map((k) => (
              <IntakeField
                key={k}
                label={labels[k] || k.replace(/_/g, ' ')}
                value={section[k] || ''}
                onChange={(v) => patch(sectionKey, { [k]: v }, { debounce: true })}
                multiline
              />
            ))}
          </div>
        );
      }
      case 's17':
        return (
          <div className="space-y-4">
            <IntakeField
              label="Bijzonderheden waar rekening mee gehouden moet worden"
              value={data.s17.bijzonderheden}
              onChange={(v) => patch('s17', { bijzonderheden: v }, { debounce: true })}
              multiline
            />
            <IntakeField
              label="Praktische belemmeringen"
              value={data.s17.praktische_belemmeringen}
              onChange={(v) => patch('s17', { praktische_belemmeringen: v }, { debounce: true })}
              multiline
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <IntakeSelectField
                label="Opleidingsniveau"
                value={data.s17.education_level}
                onChange={(v) => patch('s17', { education_level: v })}
                options={EDUCATION_LEVEL_OPTIONS}
              />
              <IntakeField
                label="Opleidingsrichting"
                value={data.s17.education_name}
                onChange={(v) => patch('s17', { education_name: v }, { debounce: true })}
              />
              <IntakeField
                label="Werkervaring (functies)"
                value={data.s17.work_experience}
                onChange={(v) => patch('s17', { work_experience: v }, { debounce: true })}
              />
              <IntakeField
                label="Computervaardigheden"
                value={data.s17.computer_skills}
                onChange={(v) => patch('s17', { computer_skills: v }, { debounce: true })}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-600">Apparatuur</p>
              <div className="flex flex-wrap gap-2">
                <IntakeToggleChip
                  label="PC/laptop"
                  checked={data.s17.has_pc}
                  onChange={(v) => patch('s17', { has_pc: v })}
                />
                <IntakeToggleChip
                  label="Smartphone"
                  checked={data.s17.has_smartphone}
                  onChange={(v) => patch('s17', { has_smartphone: v })}
                />
                <IntakeToggleChip
                  label="Tablet"
                  checked={data.s17.has_tablet}
                  onChange={(v) => patch('s17', { has_tablet: v })}
                />
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-600">Hoe verplaatst werknemer zich</p>
              <div className="flex flex-wrap gap-2">
                {TRANSPORT_TYPE_OPTIONS.map((value) => (
                  <IntakeToggleChip
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
              <p className="mb-2 text-sm font-medium text-gray-600">Rijbewijs</p>
              <div className="flex flex-wrap gap-2">
                {DRIVERS_LICENSE_TYPE_OPTIONS.filter((o) => o.value !== 'E').map((o) => (
                  <IntakeToggleChip
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
            <div className="grid gap-4 sm:grid-cols-2">
              <IntakeSelectField
                label="Nederlands spreken"
                value={data.s17.dutch_speaking}
                onChange={(v) => patch('s17', { dutch_speaking: v })}
                options={DUTCH_LANGUAGE_OPTIONS}
              />
              <IntakeSelectField
                label="Nederlands schrijven"
                value={data.s17.dutch_writing}
                onChange={(v) => patch('s17', { dutch_writing: v })}
                options={DUTCH_LANGUAGE_OPTIONS}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6 pb-16">
      <IntakeDossierHeader
        data={data}
        onPatchS6={(p, opts) => patch('s6', p, opts)}
      />
      {INTAKE_SECTION_DEFS.map((def) => (
        <section
          key={def.key}
          id={`intake-sec-${def.key}`}
          className="scroll-mt-4 space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900">{def.title}</h2>
          {renderSectionBody(def.key)}
        </section>
      ))}
    </div>
  );
}
