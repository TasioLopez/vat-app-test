"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTP } from "@/context/TPContext";
import { 
  formatEmployeeName,
  formatEmployeeNameWithoutPrefix,
  formatWorkExperience,
  formatEducationLevel,
  formatDriversLicense,
  formatTransportation,
  formatComputerSkills,
  filterOtherEmployers
} from "@/lib/utils";
import Image from "next/image";
import Logo2 from "@/assets/images/logo-2.png";

const page = "bg-white w-[794px] h-[1123px] shadow border p-10 text-[12px] font-sans mx-auto mb-6 print:shadow-none print:border-0";
const heading = "text-lg font-semibold text-center mb-6";
const blockTitle = "font-bold text-[#660066] px-2 py-1";
const paperText = "p-2 whitespace-pre-wrap leading-relaxed bg-[#e7e6e6]";
const subtle = "bg-[#e7e6e6] px-3 py-1 whitespace-pre-wrap leading-relaxed italic";
const tdLabel = "py-1 px-2 border-collapse align-top w-[40%] font-bold";
const tdValue = "py-1 px-2 border-collapse align-top";

type Row = { label: React.ReactNode; value: React.ReactNode };
type Block =
  | { key: string; variant: "subtle"; node: React.ReactNode }
  | { key: string; variant: "block"; title: string; node: React.ReactNode };

function Table({ rows }: { rows: Row[] }) {
  return (
    <table className="w-full border-collapse">
      <tbody className="bg-[#e7e6e6]">
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

function yesNo(val?: boolean) {
  return typeof val === "boolean" ? (val ? "Ja" : "Nee") : "—";
}
function safe<T>(v: T | null | undefined, fallback = "—"): T | string {
  return v ?? fallback;
}
function formatDutchDate(dateStr?: string | null) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch (e) {
    console.warn("Failed to format date:", dateStr, e);
    return "";
  }
}

const LogoBar = React.forwardRef<HTMLDivElement>((_props, ref) => (
  <div ref={ref as any} className="w-full flex justify-end mb-6">
    <Image src={Logo2} alt="Valentinez Logo" width={120} height={60} />
  </div>
));
LogoBar.displayName = "LogoBar";

// Page footer component
function PageFooter({ 
  lastName, 
  firstName, 
  dateOfBirth, 
  pageNumber 
}: { 
  lastName?: string | null; 
  firstName?: string | null; 
  dateOfBirth?: string | null; 
  pageNumber: number;
}) {
  const nameText = lastName && firstName 
    ? `Naam: ${lastName} (${firstName})` 
    : lastName 
    ? `Naam: ${lastName}` 
    : "";
  const birthText = formatDutchDate(dateOfBirth);
  
  return (
    <div 
      className="mt-auto pt-4 border-t border-gray-300 flex justify-between items-center text-[10px] text-gray-700 bg-transparent" 
      style={{ 
        minHeight: '40px', 
        flexShrink: 0
      }}
    >
      <div>{nameText || "(no name)"}</div>
      <div className="text-center flex-1">{pageNumber}</div>
      <div style={{ minWidth: '120px', textAlign: 'right' }}>
        {birthText || "(geen geboortedatum)"}
      </div>
    </div>
  );
}

export default function EmployeeInfoA4Client({ employeeId }: { employeeId: string }) {
  const { tpData, setSectionPageCount, getPageOffset } = useTP();

  const blocks = useMemo<Block[]>(() => {
    const out: Block[] = [];

    // Header for first page
    out.push({
      key: "__header_first",
      variant: "block",
      title: "",
      node: (
        <>
          <LogoBar />
          <h1 className={heading}>Trajectplan re-integratie tweede spoor</h1>
        </>
      ),
    });

    // Gegevens werknemer
    out.push({
      key: "werknemer",
      variant: "block",
      title: "Gegevens werknemer",
      node: (
        <Table
          rows={[
            { label: "Naam", value: formatEmployeeNameWithoutPrefix(tpData.first_name, tpData.last_name, tpData.gender) },
            {
              label: "Geslacht",
              value: (
                <>
                  <span className="mr-4">{(tpData.gender === "Male" || tpData.gender === "Man") ? "☑ Man" : "☐ Man"}</span>
                  <span>{(tpData.gender === "Female" || tpData.gender === "Vrouw") ? "☑ Vrouw" : "☐ Vrouw"}</span>
                </>
              ),
            },
            { label: "Telefoon", value: safe(tpData.phone) },
            { label: "Email", value: safe(tpData.email) },
            { label: "Geboortedatum", value: formatDutchDate(tpData.date_of_birth) || "—" },
          ]}
        />
      ),
    });

    // Gegevens re-integratietraject 2e spoor
    out.push({
      key: "traject",
      variant: "block",
      title: "Gegevens re-integratietraject 2e spoor",
      node: (
        <Table
          rows={[
            { label: "Eerste ziektedag", value: formatDutchDate(tpData.first_sick_day) || "—" },
            { label: "Datum aanmelding", value: formatDutchDate(tpData.registration_date) || "—" },
            { label: "Datum intakegesprek", value: formatDutchDate(tpData.intake_date) || "—" },
            { label: "Datum opmaak trajectplan", value: formatDutchDate(tpData.tp_creation_date) || "—" },
            { label: "Datum AD Rapportage", value: formatDutchDate(tpData.ad_report_date) || "Niet aanwezig" },
            { label: "Arbeidsdeskundige", value: tpData.occupational_doctor_name || "Niet aanwezig" },
            {
              label: "Arbeidsdeskundig rapport aanwezig bij aanmelding",
              value: (
                <>
                  <span className="mr-4">{tpData.has_ad_report === true ? "☑ Ja" : "☐ Ja"}</span>
                  <span>{tpData.has_ad_report === false ? "☑ Nee" : "☐ Nee"}</span>
                </>
              )
            },
            {
              label: "Bedrijfsarts",
              value: [safe(tpData.occupational_doctor_org, "")]
                .filter(Boolean)
                .join(" ") || "—",
            },
            { label: "Datum FML/IZP/LAB", value: formatDutchDate(tpData.fml_izp_lab_date) || "—" },
          ]}
        />
      ),
    });

    // Gegevens opdrachtgever
    out.push({
      key: "opdrachtgever",
      variant: "block",
      title: "Gegevens opdrachtgever",
      node: (
        <Table
          rows={[
            { label: "Werkgever", value: safe(tpData.client_name) },
            { label: "Contactpersoon", value: safe(tpData.client_referent_name) },
            { label: "Telefoon", value: safe(tpData.client_referent_phone) },
            { label: "Email", value: safe(tpData.client_referent_email) },
          ]}
        />
      ),
    });

    // Gegevens re-integratiebedrijf
    out.push({
      key: "reintegratiebedrijf",
      variant: "block",
      title: "Gegevens re-integratiebedrijf",
      node: (
        <Table
          rows={[
            { label: "Opdrachtnemer", value: "ValentineZ" },
            { label: "Loopbaanadviseur", value: safe(tpData.consultant_name) },
            { label: "Telefoon", value: safe(tpData.consultant_phone) },
            { label: "Email", value: safe(tpData.consultant_email) },
          ]}
        />
      ),
    });

    // Basisgegevens
    out.push({
      key: "basis",
      variant: "block",
      title: "Basisgegevens re-integratie werknemer",
      node: (
        <Table
          rows={[
            { label: "Huidige functie", value: safe(tpData.current_job) },
            { label: "Werkervaring", value: formatWorkExperience(tpData.work_experience) },
            { label: "Opleidingsniveau", value: formatEducationLevel(tpData.education_level, tpData.education_name) },
            { label: "Rijbewijs", value: formatDriversLicense(tpData.drivers_license, tpData.drivers_license_type) },
            { label: "Eigen vervoer", value: formatTransportation(null, tpData.transport_type) },
            { label: "Spreekvaardigheid NL-taal", value: tpData.dutch_speaking || "—" },
            { label: "Schrijfvaardigheid NL-taal", value: tpData.dutch_writing || "—" },
            { label: "Leesvaardigheid NL-taal", value: tpData.dutch_reading || "—" },
            { label: "Beschikt over een PC", value: yesNo(tpData.has_computer) },
            { label: "PC-vaardigheden", value: formatComputerSkills(tpData.computer_skills) },
            {
              label: "Aantal contracturen",
              value: tpData.contract_hours ? `${tpData.contract_hours} uur per week` : "—",
            },
            { label: "Andere werkgever(s)", value: filterOtherEmployers(tpData.other_employers, tpData.client_name || tpData.employer_name) },
          ]}
        />
      ),
    });

    // Opdrachtinformatie
    out.push({
      key: "opdrachtinfo",
      variant: "block",
      title: "Opdrachtinformatie",
      node: (
        <Table
          rows={[
            { label: "Trajectsoort", value: "2e Spoor Traject" },
            {
              label: "Doelstelling",
              value:
                "Het doel van dit traject is een bevredigend resultaat. Een structurele werkhervatting die zo dicht mogelijk aansluit bij de resterende functionele mogelijkheden.",
            },
            { label: "Doorlooptijd", value: safe(tpData.tp_lead_time) },
            { label: "Startdatum", value: formatDutchDate(tpData.tp_start_date) || "—" },
            { label: "Einddatum (planning)", value: formatDutchDate(tpData.tp_end_date) || "—" },
          ]}
        />
      ),
    });

    // AVG
    out.push({
      key: "avg",
      variant: "subtle",
      node: (
        <>
          NB: in het kader van de algemene verordening gegevensbescherming (AVG) worden in deze
          rapportage geen medische termen en diagnoses vermeld. Voor meer informatie over ons
          privacyreglement en het klachtenreglement verwijzen wij u naar onze website.
        </>
      ),
    });

    // Header for subsequent pages
    out.push({
      key: "__header_rest",
      variant: "block",
      title: "",
      node: (
        <>
          <LogoBar />
        </>
      ),
    });

    // Legenda
    out.push({
      key: "legenda",
      variant: "block",
      title: "Legenda",
      node: (
        <div className="text-[10px]">
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
      ),
    });

    return out;
  }, [
    tpData.first_name,
    tpData.last_name,
    tpData.gender,
    tpData.phone,
    tpData.email,
    tpData.date_of_birth,
    tpData.first_sick_day,
    tpData.registration_date,
    tpData.intake_date,
    tpData.tp_creation_date,
    tpData.ad_report_date,
    tpData.occupational_doctor_name,
    tpData.occupational_doctor_org,
    tpData.fml_izp_lab_date,
    tpData.client_name,
    tpData.client_referent_name,
    tpData.client_referent_phone,
    tpData.client_referent_email,
    tpData.current_job,
    tpData.work_experience,
    tpData.education_level,
    tpData.drivers_license,
    tpData.transport_type,
    tpData.dutch_speaking,
    tpData.dutch_writing,
    tpData.dutch_reading,
    tpData.has_computer,
    tpData.computer_skills,
    tpData.contract_hours,
    tpData.other_employers,
    tpData.tp_lead_time,
    tpData.tp_start_date,
    tpData.tp_end_date,
  ]);

  return <PaginatedA4 blocks={blocks} tpData={tpData} />;
}

/* ---------- measurement-based pagination ---------- */

function PaginatedA4({ blocks, tpData }: { blocks: Block[]; tpData: any }) {
  const { setSectionPageCount, getPageOffset } = useTP();
  const PAGE_W = 794;
  const PAGE_H = 1123;
  const PAD = 40;
  const CONTENT_H = PAGE_H - PAD * 2;
  const BLOCK_SPACING = 12;

  const headerFirstRef = useRef<HTMLDivElement | null>(null);
  const headerRestRef = useRef<HTMLDivElement | null>(null);
  const blockRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [pages, setPages] = useState<number[][]>([]);


  const MeasureTree = () => (
    <div style={{ position: "absolute", left: -99999, top: 0, width: PAGE_W }} className="invisible">
      {/* first page header */}
      <div className={page} style={{ width: PAGE_W, height: PAGE_H, display: 'flex', flexDirection: 'column' }}>
        <div ref={headerFirstRef}>
          <LogoBar />
          <h1 className={heading}>Trajectplan re-integratie tweede spoor</h1>
        </div>
        <div style={{ flex: 1, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
          {blocks
            .filter((b) => !b.key.startsWith("__header"))
            .map((b, i) => (
              <div
                key={`m-${b.key}`}
                ref={(el) => {
                  blockRefs.current[i] = el;
                }}
                className="mb-3"
              >
                {b.variant === "subtle" ? (
                  <div className={subtle}>{(b as any).node}</div>
                ) : (
                  <>
                    {("title" in b && b.title) ? <div className={blockTitle}>{(b as any).title}</div> : null}
                    <div className={paperText}>{(b as any).node}</div>
                  </>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* rest header */}
      <div className={page} style={{ width: PAGE_W, height: PAGE_H, display: 'flex', flexDirection: 'column' }}>
        <div ref={headerRestRef}>
          <LogoBar />
        </div>
      </div>
    </div>
  );

  useLayoutEffect(() => {
    // Wait for all images to load before measuring
    const measureAndPaginate = () => {
      // Check if all images are loaded
      const images = document.querySelectorAll('img');
      const imagePromises = Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Continue even if image fails
        });
      });

      Promise.all(imagePromises).then(() => {
        // Small delay to ensure layout is stable
        requestAnimationFrame(() => {
          const firstH = headerFirstRef.current?.offsetHeight ?? 0;
          const restH = headerRestRef.current?.offsetHeight ?? 0;

          // measure all blocks (excluding the special header markers)
          const measurables = blocks.filter((b) => !b.key.startsWith("__header"));
          const heights = measurables.map((_, i) => blockRefs.current[i]?.offsetHeight ?? 0);

          const FOOTER_HEIGHT = 50; // Account for footer on non-first pages
          const limitFirst = CONTENT_H - firstH;
          const limitRest = CONTENT_H - restH - FOOTER_HEIGHT; // Subtract footer height for non-first pages
          const SAFETY_MARGIN = 50; // Increased even more to prevent overflow
          const maxLimitFirst = limitFirst - SAFETY_MARGIN;
          const maxLimitRest = limitRest - SAFETY_MARGIN;

          const out: number[][] = [];
          let cur: number[] = [];
          let used = 0;
          let limit = maxLimitFirst;

          heights.forEach((h, idx) => {
            // If a single block is taller than the current limit, it needs its own page
            const currentMaxLimit = limit === maxLimitFirst ? maxLimitFirst : maxLimitRest;
            if (h > currentMaxLimit) {
              // Finalize current page if it has content
              if (cur.length) {
                out.push(cur);
                cur = [];
                used = 0;
              }
              // Place oversized block on its own page
              out.push([idx]);
              used = 0;
              limit = maxLimitRest; // Next pages use rest header
            } else {
              const add = (cur.length ? BLOCK_SPACING : 0) + h;
              // Be very conservative - if adding would get close to limit, start new page
              if (used + add >= limit) {
                if (cur.length) out.push(cur);
                cur = [idx];
                used = h;
                limit = maxLimitRest;
              } else {
                used += add;
                cur.push(idx);
              }
            }
          });
          if (cur.length) out.push(cur);
          setPages(out);
          // Report page count to context
          setSectionPageCount('empinfo', out.length);
        });
      });
    };

    // Increased delay to ensure everything is rendered
    const timeoutId = setTimeout(measureAndPaginate, 100);
    return () => clearTimeout(timeoutId);
  }, [JSON.stringify(blocks.map((b) => [b.key, "title" in b ? b.title : "", b.variant]))]);

  return (
    <>
      <MeasureTree />
      {pages.map((idxs, p) => {
        const pageOffset = getPageOffset('empinfo');
        const pageNumber = pageOffset + p;
        
        return (
          <section key={`p-${p}`} className="print-page">
            <div className={page} style={{ width: PAGE_W, height: PAGE_H, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'visible' }}>
              {p === 0 ? (
                <>
                  <LogoBar />
                  <h1 className={heading}>Trajectplan re-integratie tweede spoor</h1>
                </>
              ) : (
                <>
                  <LogoBar />
                </>
              )}
              <div style={{ flex: 1, overflow: 'visible', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {idxs.map((i) => {
                const b = blocks.filter((x) => !x.key.startsWith("__header"))[i];
                return (
                  <div key={b.key} className="mb-3">
                    {b.variant === "subtle" ? (
                      <div className={subtle}>{(b as any).node}</div>
                    ) : (
                      <>
                        {("title" in b && b.title) ? <div className={blockTitle}>{(b as any).title}</div> : null}
                        <div className={paperText}>{(b as any).node}</div>
                      </>
                    )}
                  </div>
                );
              })}
              </div>
              <PageFooter
                lastName={tpData?.last_name}
                firstName={tpData?.first_name}
                dateOfBirth={tpData?.date_of_birth}
                pageNumber={pageNumber}
              />
            </div>
          </section>
        );
      })}
    </>
  );
}
