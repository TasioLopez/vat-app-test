'use client';

import React from 'react';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import { TP2026GegevensFields, boolToJaNee, formatNLDate } from '@/lib/tp2026/schema';
import {
  A4LogoHeader,
  A4Page,
  DataRow,
  FooterIdentity,
  SectionBand,
  TP2026_A4_PAGE_CLASS,
  TP2026FieldTable,
} from '@/components/tp2026/primitives';
import FieldControl from '@/components/tp2026/FieldControl';
import { formatTP2026CoverVoorName } from '@/lib/utils';

/** Ja/nee checkboxes for print layout (matches Word template). */
function JaNeeReportChecks({ value }: { value: boolean | null | undefined }) {
  const ja = value === true;
  const nee = value === false;
  return (
    <span className="inline-flex flex-wrap items-center gap-5 text-[12px] text-neutral-900">
      <span className="inline-flex items-center gap-1">
        <span className="select-none font-sans leading-none" aria-hidden>
          {ja ? '☑' : '☐'}
        </span>
        ja
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="select-none font-sans leading-none" aria-hidden>
          {nee ? '☑' : '☐'}
        </span>
        nee
      </span>
    </span>
  );
}

function GegevensNaamBlock({ data }: { data: Record<string, any> }) {
  const naam =
    data.first_name && data.last_name
      ? formatTP2026CoverVoorName(data.first_name, data.last_name)
      : [data.last_name, data.first_name].filter(Boolean).join(' ').trim() || '—';
  const g = (data.gender || '').toString().toLowerCase();
  const man = g === 'man' || g === 'male';
  const vrouw = g === 'vrouw' || g === 'female';
  return (
    <div className="space-y-1">
      <div>{naam}</div>
      <div className="flex flex-wrap items-center gap-5 text-[11px] text-neutral-900">
        <span className="inline-flex items-center gap-1">
          <span className="select-none font-sans leading-none" aria-hidden>
            {man ? '☑' : '☐'}
          </span>
          man
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="select-none font-sans leading-none" aria-hidden>
            {vrouw ? '☑' : '☐'}
          </span>
          vrouw
        </span>
      </div>
    </div>
  );
}

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
    <A4Page className={TP2026_A4_PAGE_CLASS}>
      <A4LogoHeader />
      <div className="flex flex-col flex-1 min-h-0">
        <div>
          <SectionBand title="Gegevens werknemer" />
          <TP2026FieldTable>
            <DataRow label="Naam" value={<GegevensNaamBlock data={data} />} />
            <DataRow label="Telefoon" value={data.phone || '—'} />
            <DataRow label="E-mail" value={data.email || '—'} />
            <DataRow label="Geboortedatum" value={formatNLDate(data.date_of_birth)} />
          </TP2026FieldTable>
        </div>

        <div className="mt-7">
          <SectionBand title="Gegevens re-integratietraject 2e spoor" />
          <TP2026FieldTable>
            <DataRow label="Eerste ziektedag" value={formatNLDate(data.first_sick_day)} />
            <DataRow label="Datum aanmelding" value={formatNLDate(data.registration_date)} />
            <DataRow label="Datum intakegesprek" value={formatNLDate(data.intake_date)} />
            <DataRow label="Datum opmaak trajectplan" value={formatNLDate(data.tp_creation_date)} />
            <DataRow label="Arbeidsdeskundig rapport aanwezig bij aanmelding" value={<JaNeeReportChecks value={data.has_ad_report} />} />
            <DataRow label="Datum AD rapportage" value={formatNLDate(data.ad_report_date)} />
            <DataRow label="Arbeidsdeskundige" value={data.occupational_doctor_name || '—'} />
            <DataRow label="Bedrijfsarts" value={data.occupational_doctor_org || '—'} />
            <DataRow label="Datum FML/IZP/LAB" value={formatNLDate(data.fml_izp_lab_date)} />
          </TP2026FieldTable>
        </div>

        <div className="mt-7">
          <SectionBand title="Gegevens opdrachtgever" />
          <TP2026FieldTable>
            <DataRow label="Werkgever" value={data.employer_name || '—'} />
            <DataRow label="Contactpersoon" value={data.client_referent_name || '—'} />
            <DataRow label="Telefoon" value={data.client_referent_phone || '—'} />
            <DataRow label="E-mail" value={data.client_referent_email || '—'} />
          </TP2026FieldTable>
        </div>

        <div className="mt-7">
          <SectionBand title="Basisgegevens re-integratie werknemer" />
          <TP2026FieldTable>
            <DataRow label="Opdrachtnemer" value="ValentineZ" />
            <DataRow label="Loopbaanadviseur" value={data.consultant_name || '—'} />
            <DataRow label="Telefoon" value={data.consultant_phone || '—'} />
            <DataRow label="E-mail" value={data.consultant_email || '—'} />
          </TP2026FieldTable>
        </div>
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
    <A4Page className={TP2026_A4_PAGE_CLASS}>
      <A4LogoHeader />

      <div className="flex flex-col flex-1 min-h-0">
        <div>
          <SectionBand title="Gegevens re-integratietraject 2e spoor" />
          <TP2026FieldTable>
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
          </TP2026FieldTable>
        </div>

        <div className="mt-7">
          <SectionBand title="Opdrachtinformatie" />
          <TP2026FieldTable>
            <DataRow label="Trajectsoort" value="Spoor 2 begeleiding" />
            <DataRow
              label="Doelstelling"
              value="Het doel van dit traject is een bevredigend resultaat. Een structurele werkhervatting die zo dicht mogelijk aansluit bij de resterende functionele mogelijkheden."
            />
            <DataRow label="Doorlooptijd" value={data.tp_lead_time ? `${data.tp_lead_time} weken` : '—'} />
            <DataRow label="Startdatum" value={formatNLDate(data.tp_start_date)} />
            <DataRow label="Einddatum (planning)" value={formatNLDate(data.tp_end_date)} />
          </TP2026FieldTable>
        </div>
      </div>

      <p className="text-[11px] italic text-[#6d2a96]/90 mt-3 leading-snug">
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
    <A4Page className={TP2026_A4_PAGE_CLASS}>
      <A4LogoHeader />
      <div className="flex-1 min-h-0">
        <SectionBand title="Legenda" />
        <TP2026FieldTable>
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
        </TP2026FieldTable>
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
