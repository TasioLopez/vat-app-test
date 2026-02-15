// CLIENT WRAPPER — Section3.A4Client.tsx
// Final review/print: includes trajectdoelen, akkoordverklaring (“Door het…”) and signature.

"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTP } from "@/context/TPContext";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import Logo2 from "@/assets/images/logo-2.png";
import { WETTELIJKE_KADERS, VISIE_LOOPBAANADVISEUR_BASIS } from "@/lib/tp/static";
import ACTIVITIES, { type TPActivity } from "@/lib/tp/tp_activities";
import { ActivityBody } from "./ActivityBody";

const page =
    "bg-white w-[794px] h-[1123px] shadow border p-10 text-[12px] font-sans mx-auto mb-6 print:shadow-none";
const blockTitle = "font-bold text-[#660066] px-2 py-1";
const paperText = "p-2 whitespace-pre-wrap leading-relaxed bg-[#e7e6e6]";
const subtle = "bg-[#e7e6e6] px-3 py-1 whitespace-pre-wrap leading-relaxed italic";

// Helper to format Dutch date
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
  
  // Use the same approach as EmployeeInfo table - format with fallback
  const birthText = formatDutchDate(dateOfBirth) || "";
  
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

// Helper to format markdown (bold and italic) and quoted text
function formatInlineText(text: string): React.ReactNode {
    if (!text) return text;
    
    const parts: React.ReactNode[] = [];
    let currentIdx = 0;
    
    // First, process quoted text (text between double quotes)
    // Regex to match "quoted text" but not markdown *italic* or **bold**
    const quoteRegex = /"([^"]+)"/g;
    const markdownRegex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    
    // Collect all matches (quotes and markdown)
    const allMatches: Array<{index: number; length: number; type: 'quote' | 'markdown'; content: string}> = [];
    
    let match;
    while ((match = quoteRegex.exec(text)) !== null) {
        allMatches.push({
            index: match.index,
            length: match[0].length,
            type: 'quote',
            content: match[1]
        });
    }
    
    while ((match = markdownRegex.exec(text)) !== null) {
        allMatches.push({
            index: match.index,
            length: match[0].length,
            type: 'markdown',
            content: match[0]
        });
    }
    
    // Sort by index
    allMatches.sort((a, b) => a.index - b.index);
    
    // Process matches in order
    for (const match of allMatches) {
        // Add text before the match
        if (match.index > currentIdx) {
            parts.push(text.slice(currentIdx, match.index));
        }
        
        if (match.type === 'quote') {
            // Quoted text - make italic
            parts.push(<span key={match.index}><em>"{match.content}"</em></span>);
        } else if (match.type === 'markdown') {
            // Markdown formatting
            const matched = match.content;
            if (matched.startsWith('**') && matched.endsWith('**')) {
                // Bold
                parts.push(<strong key={match.index}>{matched.slice(2, -2)}</strong>);
            } else if (matched.startsWith('*') && matched.endsWith('*')) {
                // Italic - wrap in quotes
                parts.push(<span key={match.index}>"<em>{matched.slice(1, -1)}</em>"</span>);
            }
        }
        
        currentIdx = match.index + match.length;
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
function renderTextWithLogoBullets(text: string, isPlaatsbaarheid: boolean = false, eagerLoading: boolean = false): React.ReactNode {
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
                                            <img 
                                                src="/val-logo.jpg" 
                                                alt="" 
                                                width={14} 
                                                height={14}
                                                style={{ marginTop: '3px', flexShrink: 0 }}
                                                loading={eagerLoading ? "eager" : undefined}
                                            />
                                            <span>
                                                <strong>{jobTitle}:</strong> {formatInlineText(description)}
                                            </span>
                                        </div>
                                    );
                                } else {
                                    // No colon - make entire content bold (e.g., "En soortgelijk")
                                    return (
                                        <div key={idx} className="flex items-start gap-2 ml-4 mt-1">
                                            <img 
                                                src="/val-logo.jpg" 
                                                alt="" 
                                                width={14} 
                                                height={14}
                                                style={{ marginTop: '3px', flexShrink: 0 }}
                                                loading={eagerLoading ? "eager" : undefined}
                                            />
                                            <span>
                                                <strong>{formatInlineText(content)}</strong>
                                            </span>
                                        </div>
                                    );
                                }
                            }
                            
                            return (
                                <div key={idx} className="flex items-start gap-2 ml-4 mt-1">
                                    <img 
                                        src="/val-logo.jpg" 
                                        alt="" 
                                        width={14} 
                                        height={14}
                                        style={{ marginTop: '3px', flexShrink: 0 }}
                                        loading={eagerLoading ? "eager" : undefined}
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

const TP_ACTIVITIES_INTRO =
    "Het doel van dit traject is een bevredigend resultaat. Dit houdt in een structurele werkhervatting die zo dicht mogelijk aansluit bij de resterende functionele mogelijkheden. Onderstaande aanbodversterkende activiteiten zullen ingezet worden om het doel van betaald werk te realiseren.";

// Agreement (Door het …)
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

type PreviewItem = {
    key: string;
    title?: string;
    text?: string;
    variant: "block" | "subtle" | "custom";
    node?: React.ReactNode;
};

const LogoBar = React.forwardRef<HTMLDivElement>((_props, ref) => (
    <div ref={ref as any} className="w-full flex justify-end mb-6">
        <Image src={Logo2} alt="Valentinez Logo" width={120} height={60} />
    </div>
));
LogoBar.displayName = "LogoBar";

// Reusable blocks for custom rendering
function AgreementBlock() {
    return (
        <div>
            <div className={blockTitle}>Akkoordverklaring</div>
            <div className={paperText}>
                <p className="mb-2">{AGREEMENT_INTRO}</p>
                <div className="ml-4 space-y-2">
                    {AGREEMENT_POINTS.map((t, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <img 
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
    employerFunctionCompany,
}: {
    employeeName: string;
    advisorName: string;
    employerContact: string;
    employerFunctionCompany?: string;
}) {
    const row = "grid grid-cols-2 gap-6 mt-3";
    const cell = "border rounded p-3 bg-[#e7e6e6]";
    const line = "border-b border-black inline-block min-w-[140px]";
    const label = "text-xs text-gray-600 font-bold";
    return (
        <div>
            <div className={blockTitle}>Ondertekening</div>
            <div className="p-2 whitespace-pre-wrap leading-relaxed">
                {/* First row: Werknemer and Loopbaanadviseur */}
                <div className={row}>
                    <div className={cell}>
                        <div className="font-semibold mb-1">Werknemer</div>
                        <div className="mb-1">
                            <span className={label}>Naam: </span>
                            <span className={line}>{employeeName}</span>
                        </div>
                        <div className="mb-1">
                            <span className={label}>Datum: </span>
                            <span className={line}></span>
                        </div>
                        <div className="min-h-[56px] pt-1">
                            <span className={label}>Handtekening: </span>
                            <span className={line}></span>
                        </div>
                    </div>
                    <div className={cell}>
                        <div className="font-semibold mb-1">Loopbaanadviseur</div>
                        <div className="mb-1">
                            <span className={label}>Naam: </span>
                            <span className={line}>{advisorName}</span>
                        </div>
                        <div className="mb-1">
                            <span className={label}>Datum: </span>
                            <span className={line}></span>
                        </div>
                        <div className="min-h-[56px] pt-1">
                            <span className={label}>Handtekening: </span>
                            <span className={line}></span>
                        </div>
                    </div>
                </div>

                {/* Second row: Opdrachtgever - using same grid to ensure exact same width */}
                <div className={row}>
                    <div className={cell}>
                        <div className="font-semibold mb-1">Opdrachtgever</div>
                        <div className="mb-1">
                            <span className={label}>Naam: </span>
                            <span className={line}>{employerContact}</span>
                        </div>
                        {employerFunctionCompany ? (
                            <div className="mb-1">
                                <span className={label}>Functie, bedrijf: </span>
                                <span className={line}>{employerFunctionCompany}</span>
                            </div>
                        ) : null}
                        <div className="mb-1">
                            <span className={label}>Datum: </span>
                            <span className={line}></span>
                        </div>
                        <div className="min-h-[56px] pt-1">
                            <span className={label}>Handtekening: </span>
                            <span className={line}></span>
                        </div>
                    </div>
                    <div></div>
                </div>
            </div>
        </div>
    );
}

export default function Section3A4Client({ employeeId }: { employeeId: string }) {
    const { tpData } = useTP();
    
    console.log('🔄 Section3A4Client: Rendering', {
      hasTpData: !!tpData,
      hasInleiding: !!tpData?.inleiding,
      keys: tpData ? Object.keys(tpData).length : 0
    });

    // Check if tpData is ready (has essential fields)
    const isDataReady = useMemo(() => {
        // Check if we have at least some essential data
        // If tpData is empty or only has a few keys, it's likely not loaded yet
        const hasEssentialData = tpData && Object.keys(tpData).length > 5;
        const hasContent = tpData?.inleiding !== undefined || tpData?.wettelijke_kaders !== undefined;
        return hasEssentialData || hasContent;
    }, [tpData]);

    // pull selected activities for this employee (saved by the builder)
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedIdsLoaded, setSelectedIdsLoaded] = useState(false);

    useEffect(() => {
        (async () => {
            setSelectedIdsLoaded(false);
            const { data, error } = await supabase
                .from("tp_meta")
                .select("tp3_activities")
                .eq("employee_id", employeeId)
                .maybeSingle();

            // ensure we end up with string[]
            const toStringArray = (v: unknown): string[] =>
                Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

            const loadedIds = !error ? toStringArray((data as any)?.tp3_activities) : [];
            console.log("🔍 Review page loaded activities:", loadedIds);
            setSelectedIds(loadedIds);
            setSelectedIdsLoaded(true);
        })();
    }, [employeeId]);


    const selectedActivities: TPActivity[] = useMemo(
        () => ACTIVITIES.filter(a => selectedIds.includes(a.id)),
        [selectedIds]
    );

    // Wait for BOTH tpData AND selectedIds to be ready before creating sections
    const isEverythingReady = isDataReady && selectedIdsLoaded;

    const sections = useMemo<PreviewItem[]>(() => {
        // Don't create sections if data isn't ready OR selectedIds aren't loaded yet
        if (!isEverythingReady) {
            console.log('⏳ Section3A4Client: Data not ready', { 
                isDataReady, 
                selectedIdsLoaded,
                selectedIdsCount: selectedIds.length 
            });
            return [];
        }
        
        console.log('📦 Section3A4Client: Creating sections', { selectedIdsCount: selectedIds.length });
        const list: PreviewItem[] = [
            { key: "inl", title: "Inleiding", text: tpData.inleiding || "—", variant: "block" },
        ];

        if (tpData.inleiding_sub) {
            list.push({ key: "inl_sub", text: tpData.inleiding_sub, variant: "block" });
        } else if (!tpData.has_ad_report) {
            list.push({
                key: "inl_nb",
                text:
                    "NB: in het kader van de AVG worden in deze rapportage geen medische termen en diagnoses vermeld.",
                variant: "subtle",
            });
        }

        list.push(
            {
                key: "wk",
                title: "Wettelijke kaders en terminologie",
                text: tpData.wettelijke_kaders || WETTELIJKE_KADERS,
                variant: "block",
            },
            {
                key: "soc",
                title: "Sociale achtergrond & maatschappelijke context",
                text: tpData.sociale_achtergrond || "—",
                variant: "block",
            },
            {
                key: "visw",
                title: "Visie van werknemer",
                text: tpData.visie_werknemer || "—",
                variant: "block",
            },
            {
                key: "vlb",
                title: "Visie van loopbaanadviseur",
                text: tpData.visie_loopbaanadviseur || VISIE_LOOPBAANADVISEUR_BASIS,
                variant: "block",
            },
            {
                key: "prog",
                title: "Prognose van de bedrijfsarts",
                text: tpData.prognose_bedrijfsarts || "—",
                variant: "block",
            },
            {
                key: "prof",
                title: "Persoonlijk profiel",
                text: tpData.persoonlijk_profiel || "—",
                variant: "block",
            },
            {
                key: "zp",
                title: "Zoekprofiel",
                text: tpData.zoekprofiel || "—",
                variant: "block",
            },
            {
                key: "blem",
                title: "Praktische belemmeringen",
                text: tpData.praktische_belemmeringen || "Voor zover bekend zijn er geen praktische belemmeringen die van invloed kunnen zijn op het verloop van het tweede spoortraject.",
                variant: "block",
            },
            {
                key: "ad",
                title:
                    "In het arbeidsdeskundigrapport staat het volgende advies over passende arbeid",
                text: tpData.advies_ad_passende_arbeid || (tpData.has_ad_report === false ? "N.B.: Tijdens het opstellen van dit trajectplan is er nog geen AD-rapport opgesteld." : "—"),
                variant: "block",
            },
            {
                key: "pow",
                title: "Perspectief op Werk (PoW-meter)",
                text: tpData.pow_meter || "—",
                variant: "block",
            },
            {
                key: "plaats",
                title: "Visie op plaatsbaarheid",
                text: tpData.visie_plaatsbaarheid || "—",
                variant: "block",
            }
        );

        // Trajectdoel + activities (each activity as its own block for clean pagination)
        if (selectedActivities.length) {
            list.push({
                key: "acts-intro",
                title: "Trajectdoel en in te zetten activiteiten",
                text: TP_ACTIVITIES_INTRO,
                variant: "block",
            });
            selectedActivities.forEach(a => {
                list.push({
                    key: `act-${a.id}`,
                    title: a.title,
                    text: a.body,
                    variant: "block",
                });
            });
        }

        // Agreement and signatures as custom nodes
        list.push({ key: "agree", variant: "custom", node: <AgreementBlock /> });
        list.push({
            key: "sign",
            variant: "custom",
            node: (
                <SignatureBlock
                    employeeName={
                        `${tpData.first_name ?? ""} ${tpData.last_name ?? ""}`.trim() ||
                        "Naam werknemer"
                    }
                    advisorName={tpData.consultant_name || "Loopbaanadviseur"}
                    employerContact={tpData.client_referent_name || "Naam opdrachtgever"}
                    employerFunctionCompany={[tpData.client_referent_function, tpData.client_name].filter(Boolean).join(', ') || undefined}
                />
            ),
        });

        return list;
    }, [
        isEverythingReady,
        tpData.inleiding,
        tpData.inleiding_sub,
        tpData.has_ad_report,
        tpData.wettelijke_kaders,
        tpData.sociale_achtergrond,
        tpData.visie_werknemer,
        tpData.visie_loopbaanadviseur,
        tpData.prognose_bedrijfsarts,
        tpData.persoonlijk_profiel,
        tpData.zoekprofiel,
        tpData.praktische_belemmeringen,
        tpData.advies_ad_passende_arbeid,
        tpData.pow_meter,
        tpData.visie_plaatsbaarheid,
        selectedActivities,
    ]);

    // Don't render if data isn't ready or sections are empty
    if (!isEverythingReady || !sections || sections.length === 0) {
        console.log('⏳ Section3A4Client: Waiting for data...', { 
            isDataReady, 
            selectedIdsLoaded,
            sectionsCount: sections?.length 
        });
        return (
            <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">Laden...</p>
            </div>
        );
    }

    try {
        return <PaginatedA4 sections={sections} tpData={tpData} />;
    } catch (error) {
        console.error('❌ Section3A4Client: Error rendering:', error);
        return null;
    }
}

/* ---------- Pagination for on-screen preview ---------- */

function PaginatedA4({ sections, tpData }: { sections: PreviewItem[]; tpData: any }) {
    const { setSectionPageCount, getPageOffset } = useTP();
    const PAGE_W = 794;
    const PAGE_H = 1123;
    const PAD = 40;
    const CONTENT_H = PAGE_H - PAD * 2;
    const BLOCK_SPACING = 12;

    const headerRef = useRef<HTMLDivElement | null>(null);
    const blockRefs = useRef<Array<HTMLDivElement | null>>([]);
    const measureTreeRef = useRef<HTMLDivElement | null>(null);
    const [pages, setPages] = useState<number[][]>([]);
    const [isMeasuring, setIsMeasuring] = useState(false);

    // Hidden measurement tree (must mirror real rendering exactly)
    const MeasureTree = () => (
        <div 
            ref={measureTreeRef}
            style={{ position: "absolute", left: -99999, top: 0, width: PAGE_W }} 
            className="invisible"
        >
            <div className={page} style={{ width: PAGE_W, height: PAGE_H, display: 'flex', flexDirection: 'column' }}>
                <LogoBar ref={headerRef} />
                <div style={{ flex: 1, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
                    {sections.map((s, i) => (
                        <div
                            key={`m-${s.key}`}
                            ref={(el) => {
                                blockRefs.current[i] = el;
                            }}
                            className="mb-3"
                        >
                            {s.variant === "subtle" && s.text ? (
                                <div className={subtle}>{s.text}</div>
                            ) : s.variant === "block" && s.text ? (
                                <>
                                    <div className={blockTitle}>{s.title}</div>
                                    {s.key === 'inl_sub' ? (
                                        <div className={paperText}>{formatTextWithParagraphs(s.text)}</div>
                                    ) : s.key.startsWith('act-') ? (
                                        <ActivityBody 
                                            activityId={s.key.replace('act-', '')} 
                                            bodyText={s.text} 
                                            className={paperText}
                                        />
                                    ) : s.key === 'vlb' || s.key === 'wk' ? (
                                        <div className={paperText}>{renderTextWithLogoBullets(s.text, false, true)}</div>
                                    ) : s.key === 'plaats' ? (
                                        <div className={paperText}>{renderTextWithLogoBullets(s.text, true, true)}</div>
                                    ) : s.key === 'ad' && s.text?.startsWith('N.B.') ? (
                                        <div className={`${paperText} font-bold text-black`}>{s.text}</div>
                                    ) : s.key === 'ad' ? (
                                        <div className={paperText}>{renderTextWithLogoBullets(s.text, false, true)}</div>
                                    ) : s.key === 'pow' ? (
                                        <div className={paperText}>
                                          {s.text && s.text !== '—' && <p className="mb-4">{formatTextWithParagraphs(s.text)}</p>}
                                          <div className="my-4">
                                            <img src="/pow-meter.png" alt="PoW-meter" width={700} height={200} className="mx-auto" loading="eager" />
                                          </div>
                                          <p className="text-purple-600 italic text-[10px] mt-4">
                                            * De Perspectief op Werk meter (PoW-meter) zegt niets over het opleidingsniveau of de werkervaring van de werknemer. Het is een momentopname, welke de huidige afstand tot de arbeidsmarkt grafisch weergeeft.
                                          </p>
                                        </div>
                                    ) : s.key === 'inl' ? (
                                        <div className={paperText}>
                                            {formatTextWithParagraphs(s.text)}
                                            {tpData.has_ad_report === false && (
                                                <p className="mt-4 font-bold text-black">
                                                    N.B.: Tijdens het opstellen van dit trajectplan is er nog geen AD-rapport opgesteld.
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={paperText}>{formatTextWithParagraphs(s.text)}</div>
                                    )}
                                </>
                            ) : (
                                <div>{s.node}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    useLayoutEffect(() => {
        // Don't measure if sections are empty
        if (!sections || sections.length === 0) {
            console.log('⏳ PaginatedA4: No sections to measure');
            setPages([]);
            setIsMeasuring(false);
            return;
        }

        // Reset refs array when sections change
        blockRefs.current = new Array(sections.length).fill(null);
        setIsMeasuring(true);
        
        function calculatePages(heights: number[], headerH: number) {
            const FOOTER_HEIGHT = 50;
            const SAFETY_MARGIN = 20; // Further reduced to allow better space utilization
            const TOLERANCE = 50; // Increased to allow more aggressive fitting
            const maxUsableFirst = CONTENT_H - headerH - SAFETY_MARGIN;
            const maxUsableRest = CONTENT_H - headerH - FOOTER_HEIGHT - SAFETY_MARGIN;
            
            const out: number[][] = [];
            let cur: number[] = [];
            let used = 0;
            let isFirstPage = true;

            heights.forEach((h, idx) => {
                const maxUsable = isFirstPage ? maxUsableFirst : maxUsableRest;
                
                // If section is too large for a single page, it gets its own page
                if (h > maxUsable) {
                    if (cur.length) {
                        out.push(cur);
                        cur = [];
                        used = 0;
                        isFirstPage = false;
                    }
                    out.push([idx]);
                    used = 0;
                    isFirstPage = false;
                } else {
                    const spacing = cur.length ? BLOCK_SPACING : 0;
                    const add = spacing + h;
                    const wouldExceed = used + add;
                    
                    // Check if next section exists and would fit on current page
                    const nextIdx = idx + 1;
                    const nextH = nextIdx < heights.length ? heights[nextIdx] : 0;
                    const nextWouldFit = nextH > 0 && nextH <= maxUsable;
                    const bothWouldFit = nextWouldFit && (wouldExceed + BLOCK_SPACING + nextH) <= maxUsable + TOLERANCE;
                    
                    // Try to fit if:
                    // 1. Current section fits within tolerance, OR
                    // 2. Both current and next sections would fit together
                    // Only break if it would significantly exceed AND next won't fit
                    const fitsWithinTolerance = wouldExceed <= maxUsable + TOLERANCE;
                    
                    if (fitsWithinTolerance || bothWouldFit) {
                        // Fit current section
                        used += add;
                        cur.push(idx);
                    } else {
                        // Break to new page
                        if (cur.length) {
                            out.push(cur);
                            isFirstPage = false;
                        }
                        cur = [idx];
                        used = h;
                    }
                }
            });

            if (cur.length) out.push(cur);
            console.log('📄 Section3A4Client: Pages calculated', { 
              pageCount: out.length,
              pages: out,
              sectionsCount: sections.length,
              heights: heights,
              maxUsableFirst,
              maxUsableRest,
              headerH
            });
            setPages(out);
            setSectionPageCount('part3', out.length);
        }
        
        // Preload images before measuring
        const preloadImages = (): Promise<void> => {
            const imageUrls = ['/val-logo.jpg', '/pow-meter.png'];
            const preloadPromises = imageUrls.map((url) => {
                return new Promise<void>((resolve) => {
                    const img = document.createElement('img');
                    img.onload = () => resolve();
                    img.onerror = () => resolve(); // Resolve even on error to not block
                    img.src = url;
                    // Timeout after 3 seconds
                    setTimeout(() => resolve(), 3000);
                });
            });
            return Promise.all(preloadPromises).then(() => {});
        };
        
        // Wait for all images to load before measuring
        const measureAndPaginate = () => {
            // First preload images
            preloadImages().then(() => {
                // Wait for measurement tree to be in DOM AND all refs to be populated
                const checkReady = () => {
                    if (!measureTreeRef.current) {
                        console.warn('⚠️ Section3A4Client: Measurement tree not in DOM yet');
                        setTimeout(checkReady, 50);
                        return;
                    }
                    
                    // Check if all block refs are populated
                    const allRefsReady = blockRefs.current.every((ref, idx) => {
                        if (ref === null) {
                            console.warn(`⚠️ Section3A4Client: Block ref ${idx} not ready`);
                            return false;
                        }
                        return true;
                    });
                    
                    if (!allRefsReady) {
                        console.warn('⚠️ Section3A4Client: Not all block refs are ready');
                        setTimeout(checkReady, 50);
                        return;
                    }
                    
                    // All refs ready, proceed with image checking
                    const measureTree = measureTreeRef.current;
                    const images = measureTree.querySelectorAll('img');
                    
                    if (images.length === 0) {
                        // No images, proceed immediately
                        performMeasurement();
                        return;
                    }
                    
                    const imagePromises = Array.from(images).map((img) => {
                        if (img.complete && img.naturalHeight > 0) {
                            return Promise.resolve();
                        }
                        return new Promise<void>((resolve) => {
                            const timeout = setTimeout(() => {
                                console.warn('⚠️ Image load timeout:', img.src);
                                resolve();
                            }, 3000);
                            
                            img.onload = () => {
                                clearTimeout(timeout);
                                resolve();
                            };
                            img.onerror = () => {
                                clearTimeout(timeout);
                                resolve(); // Resolve even on error
                            };
                        });
                    });

                    Promise.all(imagePromises).then(() => {
                        // Additional delay to ensure layout is settled after images load
                        setTimeout(() => {
                            performMeasurement();
                        }, 150);
                    });
                };
                
                // Start checking after a small delay to let DOM settle
                setTimeout(checkReady, 100);
            });
        };
        
        const performMeasurement = () => {
            // Use triple requestAnimationFrame to ensure layout is complete
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const headerH = headerRef.current?.offsetHeight ?? 0;
                        const heights = sections.map((_, i) => {
                            const el = blockRefs.current[i];
                            if (!el) {
                                console.warn(`⚠️ Section3A4Client: Section ${i} ref is null`);
                                return 0;
                            }
                            const height = el.offsetHeight;
                            if (height === 0) {
                                console.warn(`⚠️ Section3A4Client: Section ${i} has height 0`, {
                                    element: el,
                                    computedStyle: window.getComputedStyle(el),
                                    innerHTML: el.innerHTML.substring(0, 100)
                                });
                            }
                            return height;
                        });

                        // If all heights are 0, wait a bit more and retry once
                        if (heights.every(h => h === 0) && sections.length > 0) {
                            console.warn('⚠️ Section3A4Client: All heights are 0, retrying...');
                            setTimeout(() => {
                                const retryHeights = sections.map((_, i) => {
                                    const el = blockRefs.current[i];
                                    return el?.offsetHeight ?? 0;
                                });
                                if (retryHeights.some(h => h > 0)) {
                                    calculatePages(retryHeights, headerH);
                                    setIsMeasuring(false);
                                } else {
                                    console.error('❌ Section3A4Client: Still all heights 0 after retry');
                                    setPages([]);
                                    setIsMeasuring(false);
                                }
                            }, 500);
                            return;
                        }

                        calculatePages(heights, headerH);
                        setIsMeasuring(false);
                    });
                });
            });
        };

        // Start measurement after ensuring DOM is ready
        const timeoutId = setTimeout(measureAndPaginate, 300);
        return () => {
            clearTimeout(timeoutId);
            setIsMeasuring(false);
        };
    }, [sections]);

    console.log('📄 Section3A4Client: Rendering pages', { pagesCount: pages.length, pages, sectionsCount: sections.length, isMeasuring });
    
    // Show loading state while measuring - DON'T show fallback pagination
    if (isMeasuring || pages.length === 0) {
        return (
            <>
                <MeasureTree />
                <div className="flex items-center justify-center p-8">
                    <p className="text-muted-foreground">Pagineren...</p>
                </div>
            </>
        );
    }
    
    
    return (
        <>
            <MeasureTree />

            {pages.map((idxs, p) => {
                const pageOffset = getPageOffset('part3');
                const pageNumber = pageOffset + p;
                const headerH = headerRef.current?.offsetHeight ?? 100;
                const FOOTER_HEIGHT = 50;
                const isFirstPage = p === 0;
                const maxContentHeight = isFirstPage 
                    ? CONTENT_H - headerH - 20 
                    : CONTENT_H - headerH - FOOTER_HEIGHT - 20;
                
                return (
                    <section key={`p-${p}`} className="print-page">
                        <div className={page} style={{ width: PAGE_W, height: PAGE_H, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                            <LogoBar />
                            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: maxContentHeight }}>
                                {idxs.map((i) => {
                                const s = sections[i];
                                return (
                                    <div key={s.key} className="mb-3">
                                        {s.variant === "subtle" && s.text ? (
                                            <div className={subtle}>{s.text}</div>
                                        ) : s.variant === "block" && s.text ? (
                                            <>
                                                <div className={blockTitle}>{s.title}</div>
                                                {s.key.startsWith('act-') ? (
                                                    <ActivityBody 
                                                        activityId={s.key.replace('act-', '')} 
                                                        bodyText={s.text} 
                                                        className={paperText}
                                                    />
                                                ) : s.key === 'vlb' || s.key === 'wk' ? (
                                                    <div className={paperText}>{renderTextWithLogoBullets(s.text, false)}</div>
                                                ) : s.key === 'plaats' ? (
                                                    <div className={paperText}>{renderTextWithLogoBullets(s.text, true)}</div>
                                                ) : s.key === 'ad' && s.text?.startsWith('N.B.') ? (
                                                    <div className={`${paperText} font-bold text-black`}>{s.text}</div>
                                                ) : s.key === 'ad' ? (
                                                    <div className={paperText}>{renderTextWithLogoBullets(s.text, false)}</div>
                                                ) : s.key === 'pow' ? (
                                                    <div className={paperText}>
                                                      {s.text && s.text !== '—' && <p className="mb-4">{formatTextWithParagraphs(s.text)}</p>}
                                                      <div className="my-4">
                                                        <img src="/pow-meter.png" alt="PoW-meter" width={700} height={200} className="mx-auto" />
                                                      </div>
                                                      <p className="text-purple-600 italic text-[10px] mt-4">
                                                        * De Perspectief op Werk meter (PoW-meter) zegt niets over het opleidingsniveau of de werkervaring van de werknemer. Het is een momentopname, welke de huidige afstand tot de arbeidsmarkt grafisch weergeeft.
                                                      </p>
                                                    </div>
                                                ) : s.key === 'inl' ? (
                                                    <div className={paperText}>
                                                        {formatTextWithParagraphs(s.text)}
                                                        {tpData.has_ad_report === false && (
                                                            <p className="mt-4 font-bold text-black">
                                                                N.B.: Tijdens het opstellen van dit trajectplan is er nog geen AD-rapport opgesteld.
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className={paperText}>{formatTextWithParagraphs(s.text)}</div>
                                                )}
                                            </>
                                        ) : (
                                            s.node
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
