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
const blockTitle = "font-bold bg-gray-100 px-2 py-1";
const paperText = "p-2 whitespace-pre-wrap leading-relaxed";
const subtle = "bg-gray-50 px-3 py-1 whitespace-pre-wrap leading-relaxed italic";

// Special rendering for visie_loopbaanadviseur with logo bullets
function renderVisieLoopbaanadviseurText(text: string): React.ReactNode {
    if (!text) return text;
    
    const paragraphs = text.split(/\n\n+/);
    
    return paragraphs.map((para, paraIdx) => {
        const lines = para.trim().split('\n');
        
        // Check if this paragraph is a list
        const isBulletList = lines.every(l => l.trim().startsWith('•'));
        
        if (isBulletList) {
            // Render list items with logos instead of bullets
            return (
                <div key={paraIdx} className="ml-4 mb-4 space-y-2">
                    {lines.map((line, idx) => {
                        const content = line.replace(/^•\s*/, '');
                        return (
                            <div key={idx} className="flex items-start gap-2">
                                <Image 
                                    src="/val-logo.jpg" 
                                    alt="" 
                                    width={14} 
                                    height={14} 
                                    style={{ marginTop: '3px', flexShrink: 0 }}
                                />
                                <span>{content}</span>
                            </div>
                        );
                    })}
                </div>
            );
        }
        
        // Regular paragraph
        return <p key={paraIdx} className={paraIdx > 0 ? "mt-4" : ""}>{para}</p>;
    });
}

const TP_ACTIVITIES_INTRO =
    "Het doel van dit traject is een bevredigend resultaat. Dit houdt in een structurele werkhervatting die zo dicht mogelijk aansluit bij de resterende functionele mogelijkheden. Onderstaande aanbodversterkende activiteiten kunnen worden ingezet om het doel van betaald werk te realiseren.";

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
const AGREEMENT_FOOTER =
    "Met ondertekening van dit trajectplan gaat u akkoord met de inhoud van dit trajectplan en de wijze waarop ValentineZ uw gegevens opvraagt, verwerkt, deelt en opslaat. Voor alle volledige informatie verwijzen wij u graag naar ons privacyreglement en ons klachtenreglement op onze website www.valentinez.nl. Een papieren versie kunt u opvragen via 085 - 800 2010 of info@ValentineZ.nl.";

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
                <ul className="list-disc pl-5 space-y-1">
                    {AGREEMENT_POINTS.map((t, i) => (
                        <li key={i}>{t}</li>
                    ))}
                </ul>
                <p className="mt-3">{AGREEMENT_FOOTER}</p>
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
    const label = "text-xs text-gray-600";
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
                text: tpData.praktische_belemmeringen || "—",
                variant: "block",
            },
            {
                key: "ad",
                title:
                    "In het arbeidsdeskundigrapport staat het volgende advies over passende arbeid",
                text: tpData.advies_ad_passende_arbeid || "—",
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

    return <PaginatedA4 sections={sections} />;
}

/* ---------- Pagination for on-screen preview ---------- */

function PaginatedA4({ sections }: { sections: PreviewItem[] }) {
    const PAGE_W = 794;
    const PAGE_H = 1123;
    const PAD = 40;
    const CONTENT_H = PAGE_H - PAD * 2;
    const BLOCK_SPACING = 12;

    const headerRef = useRef<HTMLDivElement | null>(null);
    const blockRefs = useRef<Array<HTMLDivElement | null>>([]);
    const [pages, setPages] = useState<number[][]>([]);

    // Hidden measurement tree (must mirror real rendering)
    const MeasureTree = () => (
        <div style={{ position: "absolute", left: -99999, top: 0, width: PAGE_W }} className="invisible">
            <div className={page} style={{ width: PAGE_W, height: PAGE_H, padding: PAD }}>
                <LogoBar ref={headerRef} />
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
                            <div>
                                <div className={blockTitle}>{s.title}</div>
                                {s.key.startsWith('act-') ? (
                                    <ActivityBody 
                                        activityId={s.key.replace('act-', '')} 
                                        bodyText={s.text} 
                                        className={paperText}
                                    />
                                ) : s.key === 'vlb' ? (
                                    <div className={paperText}>{renderVisieLoopbaanadviseurText(s.text)}</div>
                                ) : (
                                    <div className={paperText}>{s.text}</div>
                                )}
                            </div>
                        ) : (
                            <div>{s.node}</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    useLayoutEffect(() => {
        const headerH = headerRef.current?.offsetHeight ?? 0;
        const heights = sections.map((_, i) => blockRefs.current[i]?.offsetHeight ?? 0);

        const usable = CONTENT_H - headerH;
        const out: number[][] = [];
        let cur: number[] = [];
        let used = 0;

        heights.forEach((h, idx) => {
            const add = (cur.length ? BLOCK_SPACING : 0) + h;
            if (used + add > usable) {
                if (cur.length) out.push(cur);
                cur = [idx];
                used = h;
            } else {
                used += add;
                cur.push(idx);
            }
        });

        if (cur.length) out.push(cur);
        setPages(out);
    }, [
        sections.length,
        JSON.stringify(sections.map((s) => [s.key, s.title ?? "", s.text?.length ?? 0, s.variant])),
    ]);

    return (
        <>
            <MeasureTree />

            {pages.map((idxs, p) => (
                <section key={`p-${p}`} className="print-page">
                    <div className={page} style={{ width: PAGE_W, height: PAGE_H }}>
                        <LogoBar />
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
                                            ) : s.key === 'vlb' ? (
                                                <div className={paperText}>{renderVisieLoopbaanadviseurText(s.text)}</div>
                                            ) : (
                                                <div className={paperText}>{s.text}</div>
                                            )}
                                        </>
                                    ) : (
                                        s.node
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            ))}
        </>
    );
}
