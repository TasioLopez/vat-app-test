'use client';

import React, { useEffect } from 'react';
import { useTP2026PageNumber } from '@/context/TP2026PageNumberContext';
import { GEGEVENS_PAGE_COUNT } from '@/lib/tp2026/page-numbering';
import { boolToJaNee, formatNLDate } from '@/lib/tp2026/schema';
import { GEGEVENS_EDITOR_SECTIONS } from '@/lib/tp2026/gegevens-editor-layout';
import {
  A4LogoHeader,
  A4Page,
  DataRow,
  FooterIdentity,
  SectionBand,
  TP2026_A4_PAGE_CLASS,
  TP2026FieldTable,
} from '@/components/tp2026/primitives';
import { GegevensEditorSection } from '@/components/tp2026/GegevensEditorSection';
import { GegevensEditorRow } from '@/components/tp2026/GegevensEditorRow';
import {
  formatComputerSkills,
  formatDriversLicense,
  formatTP2026CoverVoorName,
  formatTransportation,
} from '@/lib/utils';
import { Mail, Phone, User } from 'lucide-react';
import { PrintGenderChecks, PrintJaNeeChecks } from '@/components/tp2026/PrintCheckbox';

function GegevensNaamBlock({ data }: { data: Record<string, any> }) {
  const naam =
    data.first_name && data.last_name
      ? formatTP2026CoverVoorName(data.first_name, data.last_name)
      : [data.last_name, data.first_name].filter(Boolean).join(' ').trim() || '—';
  return (
    <div className="space-y-1">
      <div>{naam}</div>
      <PrintGenderChecks gender={data.gender} className="text-[11px]" />
    </div>
  );
}

function GegevensContextCard({ data }: { data: Record<string, any> }) {
  const naam =
    data.first_name && data.last_name
      ? formatTP2026CoverVoorName(data.first_name, data.last_name)
      : [data.last_name, data.first_name].filter(Boolean).join(' ').trim() || '—';
  const werkgever = data.employer_name || data.client_name || '—';
  const adviseur = data.consultant_name || '—';

  const items: { label: string; value: React.ReactNode }[] = [
    { label: 'Naam', value: naam },
    { label: 'Werkgever', value: werkgever },
    { label: 'Opdrachtnemer', value: 'ValentineZ' },
    {
      label: 'Loopbaanadviseur',
      value: (
        <span className="space-y-1">
          <span className="block">{adviseur}</span>
          {data.consultant_phone ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" aria-hidden />
              {data.consultant_phone}
            </span>
          ) : null}
          {data.consultant_email ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3 w-3 shrink-0" aria-hidden />
              {data.consultant_email}
            </span>
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <GegevensEditorSection title="Samenvatting" icon={User}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map(({ label, value }) => (
          <div key={label}>
            <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
            <div className="text-sm text-foreground">{value}</div>
          </div>
        ))}
      </div>
    </GegevensEditorSection>
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
    <div className="space-y-6">
      <GegevensContextCard data={data} />
      {GEGEVENS_EDITOR_SECTIONS.map((section) => (
        <GegevensEditorSection key={section.id} title={section.title} icon={section.icon}>
          <div className="space-y-4">
            {section.rows.map((row, i) => (
              <GegevensEditorRow key={`${section.id}-${i}`} row={row} data={data} updateField={updateField} />
            ))}
          </div>
        </GegevensEditorSection>
      ))}
    </div>
  );
}

function GegevensPage1({ data, pageNumber }: { data: Record<string, any>; pageNumber: number }) {
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
            <DataRow label="Arbeidsdeskundig rapport aanwezig bij aanmelding" value={<PrintJaNeeChecks value={data.has_ad_report} className="text-[12px]" />} />
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
        pageNumber={pageNumber}
      />
    </A4Page>
  );
}

function GegevensPage2({ data, pageNumber }: { data: Record<string, any>; pageNumber: number }) {
  const vervoertekst = formatTransportation(null, data.transport_type);
  const rijbewijs = formatDriversLicense(data.drivers_license, data.drivers_license_type);
  const pcVaardigheden = formatComputerSkills(data.computer_skills);
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
            <DataRow label="PC-vaardigheden" value={pcVaardigheden} />
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
        pageNumber={pageNumber}
      />
    </A4Page>
  );
}

function GegevensPage3({ data, pageNumber }: { data: Record<string, any>; pageNumber: number }) {
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
  const { getPageNumber, setSectionPageCount } = useTP2026PageNumber();

  useEffect(() => {
    setSectionPageCount('gegevens', GEGEVENS_PAGE_COUNT);
  }, [setSectionPageCount]);

  const wrap = (node: React.ReactNode, key: string) =>
    printMode ? <section className="print-page" key={key}>{node}</section> : <div key={key}>{node}</div>;
  return (
    <>
      {wrap(<GegevensPage1 data={data} pageNumber={getPageNumber('gegevens', 0)} />, 'g1')}
      {wrap(<GegevensPage2 data={data} pageNumber={getPageNumber('gegevens', 1)} />, 'g2')}
      {wrap(<GegevensPage3 data={data} pageNumber={getPageNumber('gegevens', 2)} />, 'g3')}
    </>
  );
}
