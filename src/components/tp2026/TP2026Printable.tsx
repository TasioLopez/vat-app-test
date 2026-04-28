import React from 'react';

type Props = {
  data: Record<string, any>;
};

function PrintPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print-page">
      <div className="bg-white w-[794px] h-[1123px] mx-auto border border-border p-10 print:border-0 print:shadow-none">
        <h1 className="text-xl font-semibold text-[#660066] mb-6">{title}</h1>
        <div className="text-[12px] leading-relaxed">{children}</div>
      </div>
    </section>
  );
}

function KV({ label, value }: { label: string; value: any }) {
  return (
    <div className="grid grid-cols-[280px_1fr] gap-4 py-1 border-b border-gray-200">
      <div className="font-semibold">{label}</div>
      <div>{value || '—'}</div>
    </div>
  );
}

export default function TP2026Printable({ data }: Props) {
  return (
    <div id="tp-print-root" className="tp-print-root" data-ready="1">
      <PrintPage title="01 Voorblad">
        <KV label="Werknemer" value={data.employee_name || `${data.first_name || ''} ${data.last_name || ''}`.trim()} />
        <KV label="Datum rapportage" value={data.tp_creation_date} />
        <KV label="Opdrachtgever" value={data.client_name} />
      </PrintPage>

      <PrintPage title="02 Gegevens">
        <KV label="Naam" value={`${data.last_name || '—'} (${data.first_name || '—'})`} />
        <KV label="Telefoon" value={data.phone} />
        <KV label="E-mail" value={data.email} />
        <KV label="Geboortedatum" value={data.date_of_birth} />
        <KV label="Eerste ziektedag" value={data.first_sick_day} />
        <KV label="Datum aanmelding" value={data.registration_date} />
        <KV label="Datum intakegesprek" value={data.intake_date} />
        <KV label="Datum opmaak trajectplan" value={data.tp_creation_date} />
        <KV label="Arbeidsdeskundig rapport aanwezig" value={data.has_ad_report ? 'Ja' : 'Nee'} />
        <KV label="Datum AD rapportage" value={data.ad_report_date} />
        <KV label="Arbeidsdeskundige" value={data.occupational_doctor_name} />
        <KV label="Bedrijfsarts" value={data.occupational_doctor_org} />
        <KV label="Datum FML/IZP/LAB" value={data.fml_izp_lab_date} />
        <KV label="Werkgever" value={data.client_name} />
        <KV label="Contactpersoon" value={data.client_referent_name} />
        <KV label="Contactpersoon telefoon" value={data.client_referent_phone} />
        <KV label="Contactpersoon email" value={data.client_referent_email} />
      </PrintPage>

      <PrintPage title="03 Basisdocument">
        {[
          ['Inleiding', data.inleiding],
          ['Sociale achtergrond & maatschappelijke context', data.sociale_achtergrond],
          ['Visie van werknemer', data.visie_werknemer],
          ['Persoonlijk profiel', data.persoonlijk_profiel],
          ['Belastbaarheidsprofiel / Prognose', data.prognose_bedrijfsarts],
          ['Praktische belemmeringen', data.praktische_belemmeringen],
          ['Advies passende arbeid', data.advies_ad_passende_arbeid],
          ['Perspectief op werk / POW-meter', data.pow_meter],
          ['Visie op plaatsbaarheid', data.visie_plaatsbaarheid],
          ['Visie loopbaanadviseur', data.visie_loopbaanadviseur],
          ['Zoekprofiel', data.zoekprofiel],
        ].map(([label, value]) => (
          <div key={label} className="mb-4">
            <h3 className="font-semibold text-[#660066] mb-1">{label}</h3>
            <p className="whitespace-pre-wrap">{(value as string) || '— nog niet ingevuld —'}</p>
          </div>
        ))}
      </PrintPage>

      <PrintPage title="Bijlage 1 - Voortgang en planning">
        <p className="whitespace-pre-wrap">{data.bijlage1_content || '— nog niet ingevuld —'}</p>
      </PrintPage>

      <PrintPage title="Bijlage 2 - Leernavigator">
        <p className="whitespace-pre-wrap">{data.bijlage2_content || '— nog niet ingevuld —'}</p>
      </PrintPage>

      <PrintPage title="Bijlage 3 - Stroomschema POW-meter">
        <p className="whitespace-pre-wrap">{data.bijlage3_content || '— nog niet ingevuld —'}</p>
      </PrintPage>
    </div>
  );
}
