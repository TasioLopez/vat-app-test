// SERVER/DATA-DRIVEN — Section3.A4.tsx
// Pure render from { data }. No hooks, no context, no "use client".

import React from "react";
import Image from "next/image";
import Logo2 from "@/assets/images/logo-2.png";
import { loadTP, TPData } from "@/lib/tp/load";
import { WETTELIJKE_KADERS, VISIE_LOOPBAANADVISEUR_BASIS } from "@/lib/tp/static";
import ACTIVITIES, { type TPActivity } from "@/lib/tp/tp_activities";
import { ActivityBody } from "./ActivityBody";

const page =
  "bg-white w-[794px] h-[1123px] shadow border p-10 text-[12px] font-sans mx-auto mb-6 print:shadow-none print:border-0";
const blockTitle = "font-bold text-[#660066] px-2 py-1";
const paperText = "p-2 whitespace-pre-wrap leading-relaxed bg-[#e7e6e6]";
const subtle = "bg-[#e7e6e6] px-3 py-1 whitespace-pre-wrap leading-relaxed italic";
// keep blocks together across page breaks
const avoidBreak = "mb-3 [break-inside:avoid] print:[break-inside:avoid]";

/* ------------ helpers ------------ */
const safe = (v: string | null | undefined, fallback = "—") => v ?? fallback;
const toStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const fullName = (full?: string | null, first?: string | null, last?: string | null, fallback = "") =>
  (full && full.trim())
    || `${first ?? ""} ${last ?? ""}`.trim()
    || fallback;

// Helper to format markdown (bold and italic)
function formatInlineText(text: string): React.ReactNode {
  if (!text) return text;
  
  const parts: React.ReactNode[] = [];
  let currentIdx = 0;
  
  // Regex to match **bold** or *italic*
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIdx) {
      parts.push(text.slice(currentIdx, match.index));
    }
    
    const matched = match[0];
    if (matched.startsWith('**') && matched.endsWith('**')) {
      // Bold
      parts.push(<strong key={match.index}>{matched.slice(2, -2)}</strong>);
    } else if (matched.startsWith('*') && matched.endsWith('*')) {
      // Italic - wrap in quotes
      parts.push(<span key={match.index}>"<em>{matched.slice(1, -1)}</em>"</span>);
    }
    
    currentIdx = match.index + match[0].length;
  }
  
  // Add remaining text
  if (currentIdx < text.length) {
    parts.push(text.slice(currentIdx));
  }
  
  return parts.length > 0 ? parts : text;
}

// Render text with markdown support for paragraphs
function formatTextWithParagraphs(text: string): React.ReactNode {
  if (!text) return text;
  
  const paragraphs = text.split(/\n\n+/);
  
  return paragraphs.map((para, idx) => {
    const lines = para.trim().split('\n');
    return (
      <p key={idx} className={idx > 0 ? "mt-4" : ""}>
        {lines.map((line, lineIdx) => (
          <React.Fragment key={lineIdx}>
            {lineIdx > 0 && <br/>}
            {formatInlineText(line)}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

// Render text with Z-logo bullets for list items
function renderTextWithLogoBullets(text: string, isPlaatsbaarheid: boolean = false): React.ReactNode {
  if (!text) return text;
  
  const paragraphs = text.split(/\n\n+/);
  
  return paragraphs.map((para, paraIdx) => {
    const trimmedPara = para.trim();
    
    // Check for disclaimer text in plaatsbaarheid (should be purple)
    if (isPlaatsbaarheid && trimmedPara.startsWith('Dit is geen limitatieve opsomming')) {
      return (
        <p key={paraIdx} className="mt-4 text-purple-600 italic">
          {formatInlineText(trimmedPara)}
        </p>
      );
    }
    
    const lines = trimmedPara.split('\n');
    
    // Check if ANY line is a bullet point (not requiring ALL lines to be bullets)
    const hasBullets = lines.some(l => {
      const t = l.trim();
      return t.startsWith('•') || t.startsWith('☑') || t.startsWith('✓') || t.startsWith('- ');
    });
    
    if (hasBullets) {
      // Render mixed content: intro text + bullet list with Z logos
      return (
        <div key={paraIdx} className="mb-4">
          {lines.map((line, idx) => {
            const t = line.trim();
            const isBullet = t.startsWith('•') || t.startsWith('☑') || t.startsWith('✓') || t.startsWith('- ');
            
            if (isBullet) {
              const content = t.replace(/^[•☑✓\-]\s*/, '');
              
              // For plaatsbaarheid sections, format job titles as bold
              if (isPlaatsbaarheid) {
                  const colonIndex = content.indexOf(':');
                  if (colonIndex > 0) {
                      const jobTitle = content.substring(0, colonIndex).trim();
                      const description = content.substring(colonIndex + 1).trim();
                      return (
                          <div key={idx} className="flex items-start gap-2 ml-4 mt-1">
                              <Image 
                                  src="/val-logo.jpg" 
                                  alt="" 
                                  width={14} 
                                  height={14}
                                  style={{ marginTop: '3px', flexShrink: 0 }}
                              />
                              <span>
                                  <strong>{jobTitle}:</strong> {formatInlineText(description)}
                              </span>
                          </div>
                      );
                  }
              }
              
              return (
                <div key={idx} className="flex items-start gap-2 ml-4 mt-1">
                  <Image 
                    src="/val-logo.jpg" 
                    alt="" 
                    width={14} 
                    height={14}
                    style={{ marginTop: '3px', flexShrink: 0 }}
                  />
                  <span>{formatInlineText(content)}</span>
                </div>
              );
            } else {
              // Non-bullet line (intro text)
              return (
                <p key={idx} className={idx > 0 ? "mt-2" : ""}>
                  {formatInlineText(t)}
                </p>
              );
            }
          })}
        </div>
      );
    }
    
    // Regular paragraph with markdown support
    return (
      <p key={paraIdx} className={paraIdx > 0 ? "mt-4" : ""}>
        {lines.map((line, lineIdx) => (
          <React.Fragment key={lineIdx}>
            {lineIdx > 0 && <br/>}
            {formatInlineText(line)}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

// Alias for backward compatibility
function renderVisieLoopbaanadviseurText(text: string): React.ReactNode {
  return renderTextWithLogoBullets(text, false);
}

/* ------------ static text ------------ */
const TP_ACTIVITIES_INTRO =
  "Het doel van dit traject is een bevredigend resultaat. Dit houdt in een structurele werkhervatting die zo dicht mogelijk aansluit bij de resterende functionele mogelijkheden. Onderstaande aanbodversterkende activiteiten zullen ingezet worden om het doel van betaald werk te realiseren.";

const AGREEMENT_INTRO =
  "Door het trajectplan te ondertekenen, gaat u met onderstaande akkoord;";

const AGREEMENT_POINTS: string[] = [
  "ValentineZ vraagt eventuele benodigde informatie op bij uw werkgever, zoals een Arbeidsdeskundig Rapport en/of een Inzetbaarheidsprofiel/Functie Mogelijkheden Lijst. ValentineZ heeft deze informatie nodig om u zo goed mogelijk te kunnen begeleiden. De informatie zal zorgvuldig verwerkt en opgeslagen worden en is uitsluitend bedoeld voor intern gebruik.",
  "Uw loopbaan adviseur kan de verstrekte informatie gebruiken om een rapportage te schrijven over de voortgang van uw begeleiding, deze is uitsluitend bestemd voor uw werkgever en het UWV. De rapportage beperkt zich tot het in kaart brengen van vorderingen in uw re-integratietraject. Er zullen geen medische termen en diagnoses worden vermeld.",
  "Uw CV kan worden gebruikt worden om u voor te stellen bij andere werkgevers.",
  "ValentineZ werkt met een multidisciplinair team. Het kan voorkomen dat er, ten behoeve van uw begeleiding, input en/of kennis van derden nodig is. Daarom zijn uw gegevens ook inzichtelijk voor andere medewerkers van ValentineZ.",
  "U kunt benaderd worden door een extern bureau met het verzoek of u wilt meewerken aan een klanttevredenheidsonderzoek.",
  "U bent zelf eindverantwoordelijk voor het slagen van uw 2e spoortraject. Het volgen van dit traject vraagt om een investering van tijd en energie van beide partijen. Wij verwachten van u dat u de onderling gemaakte afspraken nakomt en dat u zelf actief meewerkt aan uw eigen re-integratie, met als doel deze zo succesvol mogelijk te laten verlopen.",
];

const AGREEMENT_FOOTER_1 =
  "Met ondertekening van dit trajectplan gaat u akkoord met de inhoud van dit trajectplan en de wijze waarop ValentineZ uw gegevens opvraagt, verwerkt, deelt en opslaat.";

const AGREEMENT_FOOTER_2 = {
  text: "Voor alle volledige informatie verwijzen wij u graag naar ons privacyreglement en ons klachtenreglement op onze website ",
  link1: "www.valentinez.nl",
  middle: ". Een papieren versie kunt u opvragen via 085 - 800 2010 of ",
  link2: "info@ValentineZ.nl",
  end: "."
};

/* ------------ presentational blocks ------------ */
function LogoBar() {
  return (
    <div className="w-full flex justify-end mb-6">
      <Image src={Logo2} alt="Valentinez Logo" width={120} height={60} />
    </div>
  );
}

function AgreementBlock() {
  return (
    <div className={avoidBreak}>
      <div className={blockTitle}>Akkoordverklaring</div>
      <div className={paperText}>
        <p className="mb-2">{AGREEMENT_INTRO}</p>
        <div className="ml-4 space-y-2">
          {AGREEMENT_POINTS.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <Image 
                src="/val-logo.jpg" 
                alt="" 
                width={14} 
                height={14} 
                style={{ marginTop: '3px', flexShrink: 0 }}
              />
              <span>{t}</span>
            </div>
          ))}
        </div>
        <p className="mt-3">{AGREEMENT_FOOTER_1}</p>
        <p className="mt-2">
          {AGREEMENT_FOOTER_2.text}
          <span className="underline">{AGREEMENT_FOOTER_2.link1}</span>
          {AGREEMENT_FOOTER_2.middle}
          <span className="underline">{AGREEMENT_FOOTER_2.link2}</span>
          {AGREEMENT_FOOTER_2.end}
        </p>
      </div>
    </div>
  );
}

function SignatureBlock({
  employeeName,
  advisorName,
  employerContact,
}: {
  employeeName: string;
  advisorName: string;
  employerContact: string;
}) {
  const row = "grid grid-cols-3 gap-6 mt-3";
  const cell = "border rounded p-3";
  const line = "border-b border-black inline-block min-w-[140px]";
  const label = "text-xs text-muted-foreground font-bold";

  return (
    <div className={avoidBreak}>
      <div className={blockTitle}>Ondertekening</div>
      <div className={`${paperText} ${row}`}>
        {/* Werknemer */}
        <div className={cell}>
          <div className="font-semibold mb-2">Werknemer</div>
          <div className="mb-1">
            <span className={label}>Naam: </span>
            <span className={line}>{employeeName}</span>
          </div>
          <div className="mb-1">
            <span className={label}>Datum: </span>
            <span className={line}></span>
          </div>
          <div>
            <span className={label}>Handtekening: </span>
            <span className={line}></span>
          </div>
        </div>

        {/* Loopbaanadviseur */}
        <div className={cell}>
          <div className="font-semibold mb-2">Loopbaanadviseur</div>
          <div className="mb-1">
            <span className={label}>Naam: </span>
            <span className={line}>{advisorName}</span>
          </div>
          <div className="mb-1">
            <span className={label}>Datum: </span>
            <span className={line}></span>
          </div>
          <div>
            <span className={label}>Handtekening: </span>
            <span className={line}></span>
          </div>
        </div>

        {/* Opdrachtgever */}
        <div className={cell}>
          <div className="font-semibold mb-2">Opdrachtgever</div>
          <div className="mb-1">
            <span className={label}>Naam: </span>
            <span className={line}>{employerContact}</span>
          </div>
          <div className="mb-1">
            <span className={label}>Datum: </span>
            <span className={line}></span>
          </div>
          <div>
            <span className={label}>Handtekening: </span>
            <span className={line}></span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------ main render ------------ */
export default function Section3A4({ data }: { data: TPData }) {
  // inleiding + NB rule
  const inleiding = safe(data.inleiding);
  const inleidingSub =
    data.inleiding_sub ??
    (!data.has_ad_report
      ? "NB: in het kader van de AVG worden in deze rapportage geen medische termen en diagnoses vermeld."
      : "");

  // selected activities (from tp_meta.tp3_activities)
  const selectedIds = toStringArray((data as any).tp3_activities);
  const selectedActivities: TPActivity[] = ACTIVITIES.filter((a) =>
    selectedIds.includes(a.id)
  );

  // names for signature - use simple firstName lastName format
  const employeeName = 
    `${((data as any).first_name ?? "").trim()} ${((data as any).last_name ?? "").trim()}`.trim()
    || "Naam werknemer";
  const advisorName = ((data as any).consultant_name as string) || "Loopbaanadviseur";
  const employerContact = ((data as any).client_referent_name as string) || "Naam opdrachtgever";

  type Block =
    | { key: string; title?: string; text: string; variant: "block" | "subtle" }
    | { key: string; custom: "agreement" | "signature" };

  const blocks: Block[] = [
    { key: "inl", title: "Inleiding", text: inleiding, variant: "block" },
    ...(inleidingSub
      ? [{ key: "inl_sub", text: inleidingSub, variant: "subtle" as const }]
      : []),

    {
      key: "wk",
      title: "Wettelijke kaders en terminologie",
      text: data.wettelijke_kaders || WETTELIJKE_KADERS,
      variant: "block",
    },
    {
      key: "soc",
      title: "Sociale achtergrond & maatschappelijke context",
      text: safe(data.sociale_achtergrond),
      variant: "block",
    },
    {
      key: "visw",
      title: "Visie van werknemer",
      text: safe(data.visie_werknemer),
      variant: "block",
    },
    {
      key: "vlb",
      title: "Visie van loopbaanadviseur",
      text: data.visie_loopbaanadviseur || VISIE_LOOPBAANADVISEUR_BASIS,
      variant: "block",
    },
    {
      key: "prog",
      title: "Prognose van de bedrijfsarts",
      text: safe(data.prognose_bedrijfsarts),
      variant: "block",
    },
    {
      key: "prof",
      title: "Persoonlijk profiel",
      text: safe(data.persoonlijk_profiel),
      variant: "block",
    },
    {
      key: "zp",
      title: "Zoekprofiel",
      text: safe(data.zoekprofiel),
      variant: "block",
    },
    {
      key: "blem",
      title: "Praktische belemmeringen",
      text: safe(data.praktische_belemmeringen, "Voor zover bekend zijn er geen praktische belemmeringen die van invloed kunnen zijn op het verloop van het tweede spoortraject."),
      variant: "block",
    },
    {
      key: "ad",
      title:
        "In het arbeidsdeskundigrapport staat het volgende advies over passende arbeid",
      text: safe(data.advies_ad_passende_arbeid, data.has_ad_report === false ? "N.B.: Tijdens het opstellen van dit trajectplan is er nog geen AD-rapport opgesteld." : "—"),
      variant: "block",
    },
    {
      key: "pow",
      title: "Perspectief op Werk (PoW-meter)",
      text: safe(data.pow_meter),
      variant: "block",
    },
    {
      key: "plaats",
      title: "Visie op plaatsbaarheid",
      text: safe(data.visie_plaatsbaarheid),
      variant: "block",
    },

    // Activities (only when any are selected)
    ...(selectedActivities.length
      ? ([
          {
            key: "tp-acts-intro",
            title: "Trajectdoel en in te zetten activiteiten",
            text: TP_ACTIVITIES_INTRO,
            variant: "block" as const,
          },
          ...selectedActivities.map((a) => ({
            key: `act-${a.id}`,
            title: a.title,
            text: a.body,
            variant: "block" as const,
          })),
        ] as Block[])
      : []),

    // Agreement + signatures
    { key: "agree", custom: "agreement" },
    { key: "sign", custom: "signature" },
  ];

  // CSS page-breaks handle splitting; avoidBreak keeps each title with its text.
  return (
    <section className="print-page">
      <div className={page}>
        <LogoBar />
        {blocks.map((b) => {
          if ("custom" in b) {
            return b.custom === "agreement" ? (
              <AgreementBlock key={b.key} />
            ) : (
              <SignatureBlock
                key={b.key}
                employeeName={employeeName}
                advisorName={advisorName}
                employerContact={employerContact}
              />
            );
          }
          return (
            <div key={b.key} className={avoidBreak}>
              {b.variant === "subtle" ? (
                <div className={subtle}>{b.text}</div>
              ) : (
                <>
                  <div className={blockTitle}>{b.title}</div>
                  {b.key.startsWith('act-') ? (
                    <ActivityBody 
                      activityId={b.key.replace('act-', '')} 
                      bodyText={b.text} 
                      className={paperText}
                    />
                  ) : b.key === 'vlb' || b.key === 'wk' ? (
                    <div className={paperText}>{renderTextWithLogoBullets(b.text, false)}</div>
                  ) : b.key === 'plaats' ? (
                    <div className={paperText}>{renderTextWithLogoBullets(b.text, true)}</div>
                  ) : b.key === 'ad' && b.text.startsWith('N.B.') ? (
                    <div className={`${paperText} text-purple-600 italic`}>{b.text}</div>
                  ) : b.key === 'pow' ? (
                    <div className={paperText}>
                      {b.text && b.text !== '—' && <p className="mb-4">{formatTextWithParagraphs(b.text)}</p>}
                      <div className="my-4">
                        <Image src="/pow-meter.png" alt="PoW-meter" width={700} height={200} className="mx-auto" />
                      </div>
                      <p className="text-purple-600 italic text-[10px] mt-4">
                        * De Perspectief op Werk meter (PoW-meter) zegt niets over het opleidingsniveau of de werkervaring van de werknemer. Het is een momentopname, welke de huidige afstand tot de arbeidsmarkt grafisch weergeeft.
                      </p>
                    </div>
                  ) : (
                    <div className={paperText}>{formatTextWithParagraphs(b.text)}</div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
