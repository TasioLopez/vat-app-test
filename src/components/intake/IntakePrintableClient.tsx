'use client';

import { useEffect } from 'react';
import { ensureIntakeShape, INTAKE_SECTION_DEFS, type IntakeData } from '@/lib/intake/schema';
import { IntakeDossierHeader } from '@/components/intake/IntakeDossierHeader';

function Row({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <div className="mb-1.5">
      <span className="font-medium text-gray-800">{label}: </span>
      <span className="whitespace-pre-wrap text-gray-700">{value}</span>
    </div>
  );
}

function BoolRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="mb-1">
      <span className="mr-1">{value ? '☒' : '☐'}</span>
      <span className="text-gray-700">{label}</span>
    </div>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 break-inside-avoid">
      <h2 className="mb-2 border-b border-gray-300 pb-1 text-base font-semibold text-gray-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function IntakePrintableClient({ data }: { data: unknown }) {
  const intake: IntakeData = ensureIntakeShape(data);

  useEffect(() => {
    const root = document.getElementById('intake-print-root');
    if (root) root.setAttribute('data-ready', '1');
  }, []);

  const titleFor = (key: string) =>
    INTAKE_SECTION_DEFS.find((s) => s.key === key)?.title ?? key;

  return (
    <div
      id="intake-print-root"
      data-ready="0"
      className="intake-print-root mx-auto bg-white text-[11pt] leading-snug text-gray-900"
      style={{ width: '210mm', minHeight: '297mm', padding: '14mm 16mm' }}
    >
      <header className="mb-4">
        <h1 className="text-xl font-bold">Intakeformulier</h1>
        <p className="text-sm text-gray-600">{intake.s1.employee_name || '—'}</p>
      </header>

      <IntakeDossierHeader data={intake} />

      <SectionBlock title={titleFor('s1')}>
        <Row label="Naam werknemer" value={intake.s1.employee_name} />
        <Row label="Datum gesprek" value={intake.s1.intake_date} />
      </SectionBlock>

      <SectionBlock title={titleFor('s2')}>
        <Row label="Leeftijd werknemer" value={intake.s2.age} />
        <Row label="Geslacht werknemer" value={intake.s2.gender} />
        <Row label="Functietitel" value={intake.s2.current_job} />
        <Row label="Werkgever/organisatie" value={intake.s2.employer} />
        <Row label="Urenomvang functie (per week)" value={intake.s2.contract_hours} />
        <Row label="Woonplaats" value={intake.s2.city} />
        <Row label="Telefoonnummer werknemer" value={intake.s2.phone} />
        <Row label="Email werknemer" value={intake.s2.email} />
        <Row label="Andere werkgever" value={intake.s2.other_employers} />
      </SectionBlock>

      <SectionBlock title={titleFor('s3')}>
        <Row
          label="Korte beschrijving"
          value={intake.s3.korte_beschrijving_werkzaamheden}
        />
      </SectionBlock>

      <SectionBlock title={titleFor('s4')}>
        <Row label="Contactpersoon" value={intake.s4.referent_name} />
        <Row label="Functie" value={intake.s4.referent_function} />
        <Row label="Telefoon" value={intake.s4.referent_phone} />
        <Row label="Email" value={intake.s4.referent_email} />
      </SectionBlock>

      <SectionBlock title={titleFor('s5')}>
        <Row label="Eerste ziektedag" value={intake.s5.first_sick_day} />
        <Row label="Reden" value={intake.s5.reden_ziekmelding} />
        <div className="mb-2 grid grid-cols-2 gap-1">
          <BoolRow
            label="Persoonlijk functioneren"
            value={intake.s5.fml_beperkingen.persoonlijk_functioneren}
          />
          <BoolRow
            label="Sociaal functioneren"
            value={intake.s5.fml_beperkingen.sociaal_functioneren}
          />
          <BoolRow
            label="Dynamische handelingen"
            value={intake.s5.fml_beperkingen.dynamische_handelingen}
          />
          <BoolRow
            label="Statische houdingen"
            value={intake.s5.fml_beperkingen.statische_houdingen}
          />
          <BoolRow
            label="Aanpassingen omgeving"
            value={intake.s5.fml_beperkingen.aanpassingen_fysieke_omgevingseisen}
          />
          <BoolRow label="Werktijden" value={intake.s5.fml_beperkingen.werktijden} />
        </div>
        <Row
          label="Quote prognose/advies"
          value={intake.s5.quote_prognose_advies_belastbaarheid}
        />
        <Row label="Behandeling" value={intake.s5.behandeling} />
      </SectionBlock>

      <SectionBlock title={titleFor('s6')}>
        <Row label="Actief spoor 1" value={intake.s6.actief_spoor1} />
        <Row label="Eigen/aangepast werk" value={intake.s6.eigen_of_aangepast_werk} />
        <Row label="Uren werkzaam" value={intake.s6.uren_werkzaam} />
        <Row label="Opbouwschema" value={intake.s6.opbouwschema_aanwezig} />
        <Row label="Wat lukt wel/niet" value={intake.s6.wat_lukt_wel_niet} />
        <Row label="Ervaart belastbaarheid" value={intake.s6.ervaart_belastbaarheid} />
        <Row label="Andere werkgever" value={intake.s6.andere_werkgever} />
      </SectionBlock>

      <SectionBlock title={titleFor('s7')}>
        <Row label="Naam AD" value={intake.s7.ad_auteur} />
        <Row label="Quote advies spoor 2" value={intake.s7.quote_advies_spoor2} />
        <Row label="Quote passende functies" value={intake.s7.quote_passende_functies} />
      </SectionBlock>

      {(
        [
          ['s8', intake.s8],
          ['s9', intake.s9],
          ['s10', intake.s10],
          ['s11', intake.s11],
          ['s12', intake.s12],
          ['s13', intake.s13],
          ['s14', intake.s14],
          ['s16', intake.s16],
        ] as const
      ).map(([key, section]) => (
        <SectionBlock key={key} title={titleFor(key)}>
          {Object.entries(section).map(([field, value]) => (
            <Row key={field} label={field.replace(/_/g, ' ')} value={String(value || '')} />
          ))}
        </SectionBlock>
      ))}

      <SectionBlock title={titleFor('s17')}>
        <Row label="Bijzonderheden" value={intake.s17.bijzonderheden} />
        <Row label="Praktische belemmeringen" value={intake.s17.praktische_belemmeringen} />
        <Row label="Opleiding" value={intake.s17.education_level} />
        <Row label="Richting" value={intake.s17.education_name} />
        <Row label="Werkervaring" value={intake.s17.work_experience} />
        <BoolRow label="PC/laptop" value={intake.s17.has_pc} />
        <BoolRow label="Smartphone" value={intake.s17.has_smartphone} />
        <BoolRow label="Tablet" value={intake.s17.has_tablet} />
        <Row label="Computervaardigheden" value={intake.s17.computer_skills} />
        <Row label="Vervoer" value={intake.s17.transport_types.join(', ')} />
        <Row label="Rijbewijs" value={intake.s17.drivers_license_types.join(', ')} />
        <Row label="NL spreken" value={intake.s17.dutch_speaking} />
        <Row label="NL schrijven" value={intake.s17.dutch_writing} />
      </SectionBlock>
    </div>
  );
}
