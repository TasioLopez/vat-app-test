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
    const label = "text-xs text-gray-600 font-bold";
    return (
        <div>
            <div className={blockTitle}>Ondertekening</div>
            <div className={`${paperText} ${row}`}>
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

export default function Section3A4Client({ employeeId }: { employeeId: string }) {
    const { tpData } = useTP();

    // pull selected activities for this employee (saved by the builder)
    // pull selected activities for this employee (saved by the builder)
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        (async () => {
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
        })();
    }, [employeeId]);


    const selectedActivities: TPActivity[] = useMemo(
        () => ACTIVITIES.filter(a => selectedIds.includes(a.id)),
        [selectedIds]
    );

    const sections = useMemo<PreviewItem[]>(() => {
        const list: PreviewItem[] = [
            { key: "inl", title: "Inleiding", text: tpData.inleiding || "—", variant: "block" },
        ];

        if (tpData.inleiding_sub) {
            list.push({ key: "inl_sub", text: tpData.inleiding_sub, variant: "subtle" });
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
                />
            ),
        });

        return list;
    }, [
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

    return <PaginatedA4 sections={sections} tpData={tpData} />;
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
    const [pages, setPages] = useState<number[][]>([]);

    // Hidden measurement tree (must mirror real rendering exactly)
    const MeasureTree = () => (
        <div style={{ position: "absolute", left: -99999, top: 0, width: PAGE_W }} className="invisible">
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
                                    ) : s.key === 'pow' ? (
                                        <div className={paperText}>
                                          {s.text && s.text !== '—' && <p className="mb-4">{formatTextWithParagraphs(s.text)}</p>}
                                          <div className="my-4">
                                            <Image src="/pow-meter.png" alt="PoW-meter" width={700} height={200} className="mx-auto" />
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
                    const headerH = headerRef.current?.offsetHeight ?? 0;
                    const heights = sections.map((_, i) => blockRefs.current[i]?.offsetHeight ?? 0);

                    const FOOTER_HEIGHT = 50; // Account for footer on non-first pages
                    const SAFETY_MARGIN = 50; // Increased even more to prevent overflow
                    const maxUsableFirst = CONTENT_H - headerH - SAFETY_MARGIN; // First page: no footer
                    const maxUsableRest = CONTENT_H - headerH - FOOTER_HEIGHT - SAFETY_MARGIN; // Other pages: with footer
                    
                    const out: number[][] = [];
                    let cur: number[] = [];
                    let used = 0;
                    let isFirstPage = true;

                    heights.forEach((h, idx) => {
                        const maxUsable = isFirstPage ? maxUsableFirst : maxUsableRest;
                        
                        // If a single block is taller than the usable space, it needs its own page
                        if (h > maxUsable) {
                            // Finalize current page if it has content
                            if (cur.length) {
                                out.push(cur);
                                cur = [];
                                used = 0;
                                isFirstPage = false;
                            }
                            // Place oversized block on its own page
                            out.push([idx]);
                            used = 0;
                            isFirstPage = false;
                        } else {
                            const add = (cur.length ? BLOCK_SPACING : 0) + h;
                            // Be very conservative - if adding would get close to limit, start new page
                            if (used + add >= maxUsable) {
                                // Start new page
                                if (cur.length) {
                                    out.push(cur);
                                    isFirstPage = false;
                                }
                                cur = [idx];
                                used = h;
                            } else {
                                // Add to current page
                                used += add;
                                cur.push(idx);
                            }
                        }
                    });

                    if (cur.length) out.push(cur);
                    setPages(out);
                    // Report page count to context
                    setSectionPageCount('part3', out.length);
                });
            });
        };

        // Increased delay to ensure everything is rendered
        const timeoutId = setTimeout(measureAndPaginate, 100);
        return () => clearTimeout(timeoutId);
    }, [
        sections.length,
        JSON.stringify(sections.map((s) => [s.key, s.title ?? "", s.text?.length ?? 0, s.variant])),
    ]);

    return (
        <>
            <MeasureTree />

            {pages.map((idxs, p) => {
                const pageOffset = getPageOffset('part3');
                const pageNumber = pageOffset + p;
                
                return (
                    <section key={`p-${p}`} className="print-page">
                        <div className={page} style={{ width: PAGE_W, height: PAGE_H, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'visible' }}>
                            <LogoBar />
                            <div style={{ flex: 1, overflow: 'visible', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                                                ) : s.key === 'pow' ? (
                                                    <div className={paperText}>
                                                      {s.text && s.text !== '—' && <p className="mb-4">{formatTextWithParagraphs(s.text)}</p>}
                                                      <div className="my-4">
                                                        <Image src="/pow-meter.png" alt="PoW-meter" width={700} height={200} className="mx-auto" />
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
