'use client';

import React from 'react';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import { TP2026GegevensFields, boolToJaNee, formatNLDate } from '@/lib/tp2026/schema';
import { A4LogoHeader, A4Page, DataRow, FooterIdentity, SectionBand } from '@/components/tp2026/primitives';
import FieldControl from '@/components/tp2026/FieldControl';

export function Gegevens2026Editor({
  data,
  updateField,
}: {
  data: Record<string, any>;
  updateField: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      {TP2026GegevensFields.map((field: TP2026FieldDef) => (
        <FieldControl key={field.key} field={field} value={data[field.key]} onChange={(v) => updateField(field.key, v)} />
      ))}
    </div>
  );
}

function GegevensPage1({ data }: { data: Record<string, any> }) {
  return (
    <A4Page className="p-8 flex flex-col">
      <A4LogoHeader />
      <SectionBand title="Gegevens werknemer" />
      <div className="border-x border-[#d7c8a2]">
        <DataRow label="Naam" value={`${data.last_name || '—'} (${data.first_name || '—'})`} />
        <DataRow label="Geslacht" value={data.gender || '—'} />
        <DataRow label="Telefoon" value={data.phone || '—'} />
        <DataRow label="E-mail" value={data.email || '—'} />
        <DataRow label="Geboortedatum" value={formatNLDate(data.date_of_birth)} />
      </div>

      <SectionBand title="Gegevens re-integratietraject 2e spoor" />
      <div className="border-x border-[#d7c8a2]">
        <DataRow label="Eerste ziektedag" value={formatNLDate(data.first_sick_day)} />
        <DataRow label="Datum aanmelding" value={formatNLDate(data.registration_date)} />
        <DataRow label="Datum intakegesprek" value={formatNLDate(data.intake_date)} />
        <DataRow label="Datum opmaak trajectplan" value={formatNLDate(data.tp_creation_date)} />
        <DataRow label="Arbeidsdeskundig rapport aanwezig bij aanmelding" value={boolToJaNee(data.has_ad_report)} />
        <DataRow label="Datum AD rapportage" value={formatNLDate(data.ad_report_date)} />
        <DataRow label="Arbeidsdeskundige" value={data.occupational_doctor_name || '—'} />
        <DataRow label="Bedrijfsarts" value={data.occupational_doctor_org || '—'} />
        <DataRow label="Datum FML/IZP/LAB" value={formatNLDate(data.fml_izp_lab_date)} />
      </div>

      <SectionBand title="Gegevens opdrachtgever" />
      <div className="border-x border-[#d7c8a2]">
        <DataRow label="Werkgever" value={data.client_name || '—'} />
        <DataRow label="Contactpersoon" value={data.client_referent_name || '—'} />
        <DataRow label="Telefoon" value={data.client_referent_phone || '—'} />
        <DataRow label="E-mail" value={data.client_referent_email || '—'} />
      </div>

      <SectionBand title="Basisgegevens re-integratie werknemer" />
      <div className="border-x border-[#d7c8a2]">
        <DataRow label="Opdrachtnemer" value="ValentineZ" />
        <DataRow label="Loopbaanadviseur" value={data.consultant_name || '—'} />
        <DataRow label="Telefoon" value={data.consultant_phone || '—'} />
        <DataRow label="E-mail" value={data.consultant_email || '—'} />
      </div>

      <FooterIdentity
        lastName={data.last_name}
        firstName={data.first_name}
        dateOfBirth={formatNLDate(data.date_of_birth)}
        pageNumber={1}
      />
    </A4Page>
  );
}

function GegevensPage2({ data }: { data: Record<string, any> }) {
  const vervoertekst = Array.isArray(data.transport_type) ? data.transport_type.join(', ') : data.transport_type || '—';
  const rijbewijs = data.drivers_license ? 'Ja' : 'Nee';
  return (
    <A4Page className="p-8 flex flex-col">
      <A4LogoHeader />

      <SectionBand title="Gegevens re-integratietraject 2e spoor" />
      <div className="border-x border-[#d7c8a2]">
        <DataRow label="Huidige functie" value={data.current_job || '—'} />
        <DataRow label="Werkervaring" value={data.work_experience || '—'} />
        <DataRow label="Opleidingsniveau" value={data.education_level || '—'} />
        <DataRow label="Rijbewijs" value={rijbewijs} />
        <DataRow label="Eigen vervoer" value={vervoertekst} />
        <DataRow label="Spreekvaardigheid NL-taal" value={data.dutch_speaking || '—'} />
        <DataRow label="Schrijfvaardigheid NL-taal" value={data.dutch_writing || '—'} />
        <DataRow label="Leesvaardigheid NL-taal" value={data.dutch_reading || '—'} />
        <DataRow label="Beschikking over een PC" value={boolToJaNee(data.has_computer)} />
        <DataRow label="PC-vaardigheden" value={data.computer_skills || '—'} />
        <DataRow label="Aantal contracturen" value={data.contract_hours ? `${data.contract_hours} uur per week` : '—'} />
        <DataRow label="Andere werkgever(s)" value={data.other_employers || '—'} />
      </div>

      <SectionBand title="Opdrachtinformatie" />
      <div className="border-x border-[#d7c8a2]">
        <DataRow label="Trajectsoort" value="Spoor 2 begeleiding" />
        <DataRow
          label="Doelstelling"
          value="Het doel van dit traject is een bevredigend resultaat. Een structurele werkhervatting die zo dicht mogelijk aansluit bij de resterende functionele mogelijkheden."
        />
        <DataRow label="Doorlooptijd" value={data.tp_lead_time ? `${data.tp_lead_time} weken` : '—'} />
        <DataRow label="Startdatum" value={formatNLDate(data.tp_start_date)} />
        <DataRow label="Einddatum (planning)" value={formatNLDate(data.tp_end_date)} />
      </div>

      <p className="text-[11px] italic text-[#6d2a96] mt-3">
        NB: in het kader van de algemene verordening gegevensbescherming (AVG) worden in deze rapportage geen medische termen en diagnoses vermeld.
      </p>

      <FooterIdentity
        lastName={data.last_name}
        firstName={data.first_name}
        dateOfBirth={formatNLDate(data.date_of_birth)}
        pageNumber={2}
      />
    </A4Page>
  );
}

function GegevensPage3({ data }: { data: Record<string, any> }) {
  return (
    <A4Page className="p-8 flex flex-col">
      <A4LogoHeader />
      <SectionBand title="Legenda" />
      <div className="border-x border-[#d7c8a2]">
        {[
          ['AO', 'Arbeidsdeskundig onderzoek'],
          ['AD', 'Arbeidsdeskundig'],
          ['BA', 'Bedrijfsarts'],
          ['EZD', 'Eerste ziekte dag'],
          ['FML', 'Functiemogelijkhedenlijst'],
          ['GBM', 'Geen benutbare mogelijkheden'],
          ['IZP', 'Inzetbaarheidsprofiel'],
          ['LAB', 'Lijst arbeidsmogelijkheden en beperkingen'],
          ['TP', 'Trajectplan'],
          ['VGR', 'Voortgangsrapportage'],
          ['WAZO', 'Wet arbeid en zorg'],
        ].map(([abbr, desc]) => (
          <DataRow key={abbr} label={abbr} value={desc} compact />
        ))}
      </div>

      <FooterIdentity
        lastName={data.last_name}
        firstName={data.first_name}
        dateOfBirth={formatNLDate(data.date_of_birth)}
        pageNumber={3}
      />
    </A4Page>
  );
}

export function Gegevens2026A4Pages({
  data,
  printMode = false,
}: {
  data: Record<string, any>;
  printMode?: boolean;
}) {
  const wrap = (node: React.ReactNode, key: string) =>
    printMode ? <section className="print-page" key={key}>{node}</section> : <div key={key}>{node}</div>;
  return (
    <>
      {wrap(<GegevensPage1 data={data} />, 'g1')}
      {wrap(<GegevensPage2 data={data} />, 'g2')}
      {wrap(<GegevensPage3 data={data} />, 'g3')}
    </>
  );
}
