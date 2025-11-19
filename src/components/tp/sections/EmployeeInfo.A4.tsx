// SERVER/DATA-DRIVEN: EmployeeInfo.A4.tsx
// Renders the Employee Info section over as many A4 pages as needed.
// No hooks, no context, no "use client".

import Image from "next/image";
import Logo2 from "@/assets/images/logo-2.png";
import { TPData } from "@/lib/tp/load";
import { 
  formatEmployeeName,
  formatWorkExperience,
  formatEducationLevel,
  formatDriversLicense,
  formatTransportation,
  formatComputerSkills,
  filterOtherEmployers
} from "@/lib/utils";

const page = "bg-white w-[794px] h-[1123px] shadow border p-10 text-[12px] font-sans mx-auto mb-6 print:shadow-none print:border-0";
const heading = "text-lg font-semibold text-center mb-6";
const blockTitle = "font-bold bg-gray-100 px-2 py-1";
const paperText = "p-2 whitespace-pre-wrap leading-relaxed";
const subtle = "bg-gray-50 px-3 py-1 whitespace-pre-wrap leading-relaxed italic";
const tdLabel = "py-1 px-2 border-collapse align-top w-[40%]";
const tdValue = "py-1 px-2 border-collapse align-top";

// Simple utility for "break-inside: avoid" to keep each block intact over page breaks.
const avoidBreak = "mb-3 [break-inside:avoid] print:[break-inside:avoid]";

type Row = { label: React.ReactNode; value: React.ReactNode };
function Table({ rows }: { rows: Row[] }) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td className={tdLabel}>{r.label}</td>
            <td className={tdValue}>{r.value || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LogoBar() {
  return (
    <div className="w-full flex justify-end mb-6">
      <Image src={Logo2} alt="Valentinez Logo" width={120} height={60} />
    </div>
  );
}


// Replace your helpers with this:

function toBool(val: any): boolean | undefined {
  if (val === true || val === false) return val;
  if (val == null) return undefined;
  const s = String(val).trim().toLowerCase();

  // accept wide variety of inputs
  if (["ja", "yes", "true", "1", "y", "on"].includes(s)) return true;
  if (["nee", "no", "false", "0", "n", "off"].includes(s)) return false;

  // also accept integers 0/1
  if (val === 1) return true;
  if (val === 0) return false;

  return undefined;
}

function yesNo(val: any) {
  const b = toBool(val);
  return typeof b === "boolean" ? (b ? "Ja" : "Nee") : "—";
}

function safe<T>(v: T | null | undefined, fallback = "—"): T | string {
  return v ?? fallback;
}

function formatDutchDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Helper to handle boolean fields that might be stored as strings
function getBooleanValue(val: any): boolean | undefined {
  if (typeof val === "boolean") return val;
  if (val === "true" || val === "Ja") return true;
  if (val === "false" || val === "Nee") return false;
  return undefined;
}

export default function EmployeeInfoA4({ data }: { data: TPData }) {
  // --- Build the blocks (pure render) ---
  const blocks: React.ReactNode[] = [
    // Page 1 heading/title
    <div key="__header" className="[break-inside:avoid]">
      <LogoBar />
      <h1 className={heading}>Trajectplan re-integratie tweede spoor</h1>
    </div>,

    // Gegevens werknemer
    <div key="werknemer" className={avoidBreak}>
      <div className={blockTitle}>Gegevens werknemer</div>
      <div className={paperText}>
        <Table
          rows={[
            {
              label: "Naam",
              value: formatEmployeeName(data.first_name, data.last_name, data.gender)
            },
            {
              label: "Geslacht",
              value: (
                <>
                  <span className="mr-4">{data.gender === "Male" ? "☑ Man" : "☐ Man"}</span>
                  <span>{data.gender === "Female" ? "☑ Vrouw" : "☐ Vrouw"}</span>
                </>
              ),
            },
            { label: "Telefoon", value: data.phone || "—" },
            { label: "Email", value: data.email || "—" },
            { label: "Geboortedatum", value: formatDutchDate(data.date_of_birth) || "—" },
          ]}
        />
      </div>
    </div>,

    // Gegevens re-integratietraject 2e spoor
    <div key="traject" className={avoidBreak}>
      <div className={blockTitle}>Gegevens re-integratietraject 2e spoor</div>
      <div className={paperText}>
        <Table
          rows={[
            { label: "Eerste ziektedag", value: formatDutchDate(data.first_sick_day) || "—" },
            { label: "Datum aanmelding", value: formatDutchDate(data.registration_date) || "—" },
            { label: "Datum intakegesprek", value: formatDutchDate(data.intake_date) || "—" },
            { label: "Datum opmaak trajectplan", value: formatDutchDate(data.tp_creation_date) || "—" },
            { label: "Datum AD Rapportage", value: formatDutchDate(data.ad_report_date) || "—" },
            { label: "Arbeidsdeskundige", value: data.occupational_doctor_name || "—" },
            {
              label: "Arbeidsdeskundig rapport aanwezig bij aanmelding",
              value: (
                <>
                  <span className="mr-4">{data.has_ad_report === true ? "☑ Ja" : "☐ Ja"}</span>
                  <span>{data.has_ad_report === false ? "☑ Nee" : "☐ Nee"}</span>
                </>
              )
            },
            {
              label: "Bedrijfsarts",
              value: data.occupational_doctor_org
                ? ` ${data.occupational_doctor_org}`
                : "—",
            },
            { label: "Datum FML/IZP/LAB", value: formatDutchDate(data.fml_izp_lab_date) || "—" },
          ]}
        />
      </div>
    </div>,

    // Gegevens opdrachtgever
    <div key="opdrachtgever" className={avoidBreak}>
      <div className={blockTitle}>Gegevens opdrachtgever</div>
      <div className={paperText}>
        <Table
          rows={[
            { label: "Werkgever", value: data.client_name || "—" },
            { label: "Contactpersoon", value: data.client_referent_name || "—" },
            { label: "Telefoon", value: data.client_referent_phone || "—" },
            { label: "Email", value: data.client_referent_email || "—" },
          ]}
        />
      </div>
    </div>,

    // Gegevens re-integratiebedrijf
    <div key="reintegratiebedrijf" className={avoidBreak}>
      <div className={blockTitle}>Gegevens re-integratiebedrijf</div>
      <div className={paperText}>
        <Table
          rows={[
            { label: "Opdrachtnemer", value: "ValentineZ" },
            { label: "Loopbaanadviseur", value: data.consultant_name || "—" },
            { label: "Telefoon", value: data.consultant_phone || "—" },
            { label: "Email", value: data.consultant_email || "—" },
          ]}
        />
      </div>
    </div>,

    // Basisgegevens
    <div key="basis" className={avoidBreak}>
      <div className={blockTitle}>Basisgegevens re-integratie werknemer</div>
      <div className={paperText}>
        <Table
          rows={[
            { label: "Huidige functie", value: data.current_job || "—" },
            { label: "Werkervaring", value: formatWorkExperience(data.work_experience) },
            { label: "Opleidingsniveau", value: formatEducationLevel(data.education_level, data.education_name) },
            { label: "Rijbewijs", value: formatDriversLicense(getBooleanValue(data.drivers_license), data.drivers_license_type) },
            { label: "Eigen vervoer", value: formatTransportation(getBooleanValue(data.has_transport), data.transport_type) },
            { label: "Spreekvaardigheid NL-taal", value: yesNo(getBooleanValue(data.dutch_speaking))},
            { label: "Schrijfvaardigheid NL-taal", value: yesNo(getBooleanValue(data.dutch_writing))},
            { label: "Leesvaardigheid NL-taal", value: yesNo(getBooleanValue(data.dutch_reading)) },
            { label: "Beschikt over een PC", value: yesNo(getBooleanValue(data.has_computer)) },
            { label: "PC-vaardigheden", value: formatComputerSkills(data.computer_skills) },
            {
              label: "Aantal contracturen",
              value: data.contract_hours ? `${data.contract_hours} uur per week` : "—",
            },
            { label: "Andere werkgever(s)", value: filterOtherEmployers(data.other_employers, data.client_name || data.employer_name) },
          ]}
        />
      </div>
    </div>,

    // Opdrachtinformatie
    <div key="opdrachtinfo" className={avoidBreak}>
      <div className={blockTitle}>Opdrachtinformatie</div>
      <div className={paperText}>
        <Table
          rows={[
            { label: "Trajectsoort", value: "2e Spoor Traject" },
            {
              label: "Doelstelling",
              value:
                "Het doel van dit traject is een bevredigend resultaat. Een structurele werkhervatting die zo dicht mogelijk aansluit bij de resterende functionele mogelijkheden.",
            },
            { label: "Doorlooptijd", value: data.tp_lead_time || "—" },
            { label: "Startdatum", value: formatDutchDate(data.tp_start_date) || "—" },
            { label: "Einddatum (planning)", value: formatDutchDate(data.tp_end_date) || "—" },
          ]}
        />
      </div>
    </div>,

    // AVG toelichting
    <div key="avg" className={`${avoidBreak} ${subtle}`}>
      NB: in het kader van de algemene verordening gegevensbescherming (AVG) worden in deze
      rapportage geen medische termen en diagnoses vermeld. Voor meer informatie over ons
      privacyreglement en het klachtenreglement verwijzen wij u naar onze website.
    </div>,

    // Legenda
    <div key="legenda" className={avoidBreak}>
      <div className={blockTitle}>Legenda</div>
      <div className={`${paperText} text-[10px]`}>
        <Table
          rows={[
            { label: "EZD", value: "Eerste ziektedag" },
            { label: "AO", value: "Arbeidsdeskundigonderzoek" },
            { label: "AD", value: "Arbeidsdeskundig" },
            { label: "BA", value: "Bedrijfsarts" },
            { label: "IZP", value: "Inzetbaarheidsprofiel" },
            { label: "FML", value: "Functiemogelijkhedenlijst" },
            { label: "LAB", value: "Lijst arbeidsmogelijkheden en beperkingen" },
            { label: "GBM", value: "Geen benutbare mogelijkheden" },
            { label: "TP", value: "Trajectplan" },
            { label: "VGR", value: "Voortgangsrapportage" },
          ]}
        />
      </div>
    </div>,
  ];

  // We let CSS handle the page breaking. Each block is marked with break-inside: avoid,
  // so the browser moves whole blocks to the next page where needed.
  return (
    <>
      {/* We render a continuous flow across pages. DO NOT wrap this component
          with an extra .print-page in the registry. */}
      <section className="print-page">
        <div className={page}>
          {blocks}
        </div>
      </section>
    </>
  );
}

