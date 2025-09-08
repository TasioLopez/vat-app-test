"use client";

import React, { useEffect, useState, useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { useTP } from "@/context/TPContext";
import { supabase } from "@/lib/supabase/client";
import { WETTELIJKE_KADERS, VISIE_LOOPBAANADVISEUR_BASIS } from "@/lib/tp/static";
import Logo2 from "@/assets/images/logo-2.png";
import ACTIVITIES, { type TPActivity } from "@/lib/tp/tp_activities";

const safeParse = <T,>(v: any, fallback: T): T => {
    try { return v ?? fallback; } catch { return fallback; }
};


const page = "bg-white w-[794px] h-[1123px] shadow border p-10 text-[12px] font-sans mx-auto mb-6 print:shadow-none print:border-0";
const heading = "text-lg font-semibold text-center mb-6";
const blockTitle = "font-bold bg-gray-100 px-2 py-1";
const paperText = "p-2 whitespace-pre-wrap leading-relaxed";
const subtle = "bg-gray-50 px-3 py-1 whitespace-pre-wrap leading-relaxed italic";




// --- Static “agreement” text (from TP template) ---
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

type PreviewVariant = "block" | "subtle" | "custom";

type PreviewItem = {
    key: string;
    title?: string;
    text?: string;
    variant: PreviewVariant;
    node?: React.ReactNode;
    measureKey?: string | number;
};

const TP_ACTIVITIES_INTRO =
    "Het doel van dit traject is een bevredigend resultaat. Dit houdt in een structurele werkhervatting die zo dicht mogelijk aansluit bij de resterende functionele mogelijkheden. Onderstaande aanbodversterkende activiteiten kunnen worden ingezet om het doel van betaald werk te realiseren.";

// tiny helpers that guarantee the literal union type (no widening to string)
const B = (key: string, title: string, text: string, measureKey?: string | number): PreviewItem =>
    ({ key, title, text, variant: "block", ...(measureKey ? { measureKey } : {}) });

const S = (key: string, text: string, measureKey?: string | number): PreviewItem =>
    ({ key, text, variant: "subtle", ...(measureKey ? { measureKey } : {}) });

const C = (key: string, node: React.ReactNode, measureKey?: string | number): PreviewItem =>
    ({ key, node, variant: "custom", ...(measureKey ? { measureKey } : {}) });


function ActivitiesPreview({ activities }: { activities: TPActivity[] }) {
    return (
        <div>
            <div className={blockTitle}>Trajectdoel en in te zetten activiteiten</div>
            <div className={paperText}>
                <p className="mb-3">
                    Het doel van dit traject is een bevredigend resultaat. Dit houdt in een structurele werkhervatting die zo dicht mogelijk aansluit bij de resterende functionele mogelijkheden. Onderstaande aanbodversterkende activiteiten kunnen worden ingezet om het doel van betaald werk te realiseren.
                </p>

                {activities.map((a) => (
                    <div key={a.id} className="mb-4">
                        <div className="font-semibold mb-1">{a.title}</div>
                        <div className="whitespace-pre-wrap leading-relaxed">{a.body}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- Small presentational blocks used in the preview ---
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
                {/* Werknemer */}
                <div className={cell}>
                    <div className="font-semibold mb-2">Werknemer</div>
                    <div className="mb-1">
                        <span className={label}>Naam: </span>
                        <span className={line}></span>
                    </div>
                    <div className="mb-1">
                        <span className={label}>Datum: </span>
                        <span className={line}></span>
                    </div>
                    <div>
                        <span className={label}>Handtekening: </span>
                        <span className={line}></span>
                    </div>
                    <div className="text-xs mt-2 italic">{employeeName}</div>
                </div>

                {/* Loopbaanadviseur */}
                <div className={cell}>
                    <div className="font-semibold mb-2">Loopbaanadviseur</div>
                    <div className="mb-1">
                        <span className={label}>Naam: </span>
                        <span className={line}></span>
                    </div>
                    <div className="mb-1">
                        <span className={label}>Datum: </span>
                        <span className={line}></span>
                    </div>
                    <div>
                        <span className={label}>Handtekening: </span>
                        <span className={line}></span>
                    </div>
                    <div className="text-xs mt-2 italic">{advisorName}</div>
                </div>

                {/* Opdrachtgever */}
                <div className={cell}>
                    <div className="font-semibold mb-2">Opdrachtgever</div>
                    <div className="mb-1">
                        <span className={label}>Naam: </span>
                        <span className={line}></span>
                    </div>
                    <div className="mb-1">
                        <span className={label}>Datum: </span>
                        <span className={line}></span>
                    </div>
                    <div>
                        <span className={label}>Handtekening: </span>
                        <span className={line}></span>
                    </div>
                    <div className="text-xs mt-2 italic">{employerContact}</div>
                </div>
            </div>
        </div>
    );
}


export default function Section3({ employeeId }: { employeeId: string }) {
    const { tpData, updateField } = useTP();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [busy, setBusy] = useState<{ [k: string]: boolean }>({});

    // ✅ no need to keep this in state; it's static
    const activities: TPActivity[] = Array.isArray(ACTIVITIES) ? ACTIVITIES : [];
    console.log("activities length:", activities.length, activities.map(a => a.id));


    const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
    const toggleActivity = (id: string) =>
        setSelectedActivities(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

    const selectedForPreview = activities.filter(a => selectedActivities.includes(a.id));


    // bootstrap previously saved values (and ensure static blocks are present)
    useEffect(() => {
        (async () => {
            setLoading(true);
            const { data: meta } = await supabase
                .from("tp_meta")
                .select(`
        inleiding,
        inleiding_sub,
        has_ad_report,
        sociale_achtergrond,
        visie_werknemer,
        visie_loopbaanadviseur,
        prognose_bedrijfsarts,
        persoonlijk_profiel,
        praktische_belemmeringen,
        zoekprofiel,
        advies_ad_passende_arbeid,
        pow_meter,
        visie_plaatsbaarheid,
        tp3_activities
      `)
                .eq("employee_id", employeeId)
                .maybeSingle();               // optional: avoids throw when no row

            if (meta) {
                [
                    "inleiding", "inleiding_sub", "sociale_achtergrond", "visie_werknemer",
                    "visie_loopbaanadviseur", "prognose_bedrijfsarts", "persoonlijk_profiel",
                    "praktische_belemmeringen", "zoekprofiel", "advies_ad_passende_arbeid",
                    "pow_meter", "visie_plaatsbaarheid"
                ].forEach((k) => {
                    // @ts-ignore
                    if (meta[k] !== undefined && meta[k] !== null) updateField(k, meta[k]);
                });

                if (typeof meta.has_ad_report === "boolean") {
                    updateField("has_ad_report", meta.has_ad_report);
                }

                // ✅ safely read the JSONB array
                const arr = safeParse<string[]>((meta as any).tp3_activities, []);
                setSelectedActivities(Array.isArray(arr) ? arr : []);
            }

            if (!tpData.wettelijke_kaders) updateField("wettelijke_kaders", WETTELIJKE_KADERS);
            if (!meta?.visie_loopbaanadviseur && !tpData.visie_loopbaanadviseur) {
                updateField("visie_loopbaanadviseur", VISIE_LOOPBAANADVISEUR_BASIS);
            }
            setLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employeeId]);


    // ---- Per-section generators ----
    const genInleiding = async () => {
        setBusy((x) => ({ ...x, inleiding: true }));
        try {
            const res = await fetch(`/api/autofill-tp-3/inleiding?employeeId=${employeeId}`);
            const data = await res.json();
            if (data?.details) {
                updateField("inleiding", data.details.inleiding);
                updateField("inleiding_sub", data.details.inleiding_sub);
                updateField("has_ad_report", data.details.has_ad_report);
            }
        } catch (e) {
            console.error("❌ Autofill Inleiding failed:", e);
        } finally {
            setBusy((x) => ({ ...x, inleiding: false }));
        }
    };

    // Intake → Sociale achtergrond + Visie werknemer (already wired)
    const genSocialeVisie = async () => {
        setBusy((x) => ({ ...x, socialeVisie: true }));
        try {
            const res = await fetch(`/api/autofill-tp-3/sociale-visie?employeeId=${employeeId}`);
            const data = await res.json();
            if (data?.details) {
                updateField("sociale_achtergrond", data.details.sociale_achtergrond);
                updateField("visie_werknemer", data.details.visie_werknemer);
            }
        } catch (e) {
            console.error("❌ Autofill Sociale/Visie failed:", e);
        } finally {
            setBusy((x) => ({ ...x, socialeVisie: false }));
        }
    };

    // NEW: FML→AD → Prognose van de bedrijfsarts
    const genPrognose = async () => {
        setBusy((x) => ({ ...x, prognose: true }));
        try {
            const res = await fetch(`/api/autofill-tp-3/prognose?employeeId=${employeeId}`);
            const data = await res.json();
            if (data?.details?.prognose_bedrijfsarts) {
                updateField("prognose_bedrijfsarts", data.details.prognose_bedrijfsarts);
            }
        } catch (e) {
            console.error("❌ Autofill Prognose BA failed:", e);
        } finally {
            setBusy((x) => ({ ...x, prognose: false }));
        }
    };

    // NEW: Examples-style → Persoonlijk profiel + Zoekprofiel
    const genProfielZoekprofiel = async () => {
        setBusy((x) => ({ ...x, profielZoek: true }));
        try {
            const res = await fetch(`/api/autofill-tp-3/profiel-zoekprofiel?employeeId=${employeeId}`);
            const data = await res.json();
            if (data?.details) {
                if (data.details.persoonlijk_profiel) updateField("persoonlijk_profiel", data.details.persoonlijk_profiel);
                if (data.details.zoekprofiel) updateField("zoekprofiel", data.details.zoekprofiel);
            }
        } catch (e) {
            console.error("❌ Autofill Profiel/Zoekprofiel failed:", e);
        } finally {
            setBusy((x) => ({ ...x, profielZoek: false }));
        }
    };

    // NEW: Intake → Praktische belemmeringen
    const genBelemmeringen = async () => {
        setBusy((x) => ({ ...x, belemmeringen: true }));
        try {
            const res = await fetch(`/api/autofill-tp-3/belemmeringen?employeeId=${employeeId}`);
            const data = await res.json();
            if (data?.details?.praktische_belemmeringen) {
                updateField("praktische_belemmeringen", data.details.praktische_belemmeringen);
            }
        } catch (e) {
            console.error("❌ Autofill Belemmeringen failed:", e);
        } finally {
            setBusy((x) => ({ ...x, belemmeringen: false }));
        }
    };

    // NEW: AD → advies passende arbeid (quote/summary)
    const genAdAdvies = async () => {
        setBusy((x) => ({ ...x, adAdvies: true }));
        try {
            const res = await fetch(`/api/autofill-tp-3/ad-advies?employeeId=${employeeId}`);
            const data = await res.json();
            if (data?.details?.advies_ad_passende_arbeid) {
                updateField("advies_ad_passende_arbeid", data.details.advies_ad_passende_arbeid);
            }
        } catch (e) {
            console.error("❌ Extract AD-advies failed:", e);
        } finally {
            setBusy((x) => ({ ...x, adAdvies: false }));
        }
    };

    // NEW: Uses zoekprofiel → 3–5 functies + korte motivatie
    const genPlaatsbaarheid = async () => {
        setBusy((x) => ({ ...x, plaatsbaarheid: true }));
        try {
            const res = await fetch(`/api/autofill-tp-3/plaatsbaarheid?employeeId=${employeeId}`);
            const data = await res.json();
            if (data?.details?.visie_plaatsbaarheid) {
                updateField("visie_plaatsbaarheid", data.details.visie_plaatsbaarheid);
            }
        } catch (e) {
            console.error("❌ Autofill Plaatsbaarheid failed:", e);
        } finally {
            setBusy((x) => ({ ...x, plaatsbaarheid: false }));
        }
    };

    const saveAll = async () => {
        setSaving(true);
        try {
            const base = {
                employee_id: employeeId,
                inleiding: tpData.inleiding || null,
                inleiding_sub: tpData.inleiding_sub || null,
                wettelijke_kaders: tpData.wettelijke_kaders || null,
                sociale_achtergrond: tpData.sociale_achtergrond || null,
                visie_werknemer: tpData.visie_werknemer || null,
                visie_loopbaanadviseur: tpData.visie_loopbaanadviseur || null,
                prognose_bedrijfsarts: tpData.prognose_bedrijfsarts || null,
                persoonlijk_profiel: tpData.persoonlijk_profiel || null,
                praktische_belemmeringen: tpData.praktische_belemmeringen || null,
                zoekprofiel: tpData.zoekprofiel || null,
                advies_ad_passende_arbeid: tpData.advies_ad_passende_arbeid || null,
                pow_meter: tpData.pow_meter || null,
                visie_plaatsbaarheid: tpData.visie_plaatsbaarheid || null,
            };

            // 1) employee_details (assumes employee_id IS unique here)
            const empRes = await supabase
                .from("employee_details")
                .upsert(base, { onConflict: "employee_id" })
                .select()
                .maybeSingle();

            if (empRes.error) {
                throw new Error(`employee_details: ${empRes.error.message}`);
            }

            // 2) tp_meta — do a "manual upsert" so we DON'T need a unique index on employee_id
            const metaPayload = {
                ...base,
                has_ad_report: !!tpData.has_ad_report,
                // if tp3_activities column is JSONB or text[], this array is fine
                tp3_activities: selectedActivities ?? [],
            };

            // find existing row by employee_id
            const { data: existing, error: findErr } = await supabase
                .from("tp_meta")
                .select("id")
                .eq("employee_id", employeeId)
                .maybeSingle();

            if (findErr) throw new Error(`tp_meta (find): ${findErr.message}`);

            let metaRes;
            if (existing?.id) {
                metaRes = await supabase
                    .from("tp_meta")
                    .update(metaPayload)
                    .eq("id", existing.id)
                    .select()
                    .single();
            } else {
                metaRes = await supabase
                    .from("tp_meta")
                    .insert(metaPayload)
                    .select()
                    .single();
            }

            if (metaRes.error) {
                throw new Error(`tp_meta (save): ${metaRes.error.message}`);
            }
        } catch (err) {
            // show the real message instead of {}
            const msg = err instanceof Error ? err.message : JSON.stringify(err);
            console.error("Save failed:", err);
            alert(msg);
        } finally {
            setSaving(false);
        }
    };


    // force re-measure when activities/signature content changes
    const activitiesMeasureKey = selectedActivities.join("|");
    const signatureMeasureKey =
        `${tpData.employee_first_name ?? ""}|${tpData.loopbaanadviseur_name ?? ""}|${tpData.referent_first_name ?? ""}|${tpData.referent_last_name ?? ""}`;

    const sectionsArr: PreviewItem[] = [
        B("inl", "Inleiding", tpData.inleiding || "— nog niet ingevuld —"),
        ...(tpData.inleiding_sub ? [S("inl_sub", tpData.inleiding_sub)] : []),

        B("wk", "Wettelijke kaders en terminologie", WETTELIJKE_KADERS),
        B("soc", "Sociale achtergrond & maatschappelijke context", tpData.sociale_achtergrond || "— nog niet ingevuld —"),
        B("visw", "Visie van werknemer", tpData.visie_werknemer || "— nog niet ingevuld —"),
        B("vlb", "Visie van loopbaanadviseur", tpData.visie_loopbaanadviseur || VISIE_LOOPBAANADVISEUR_BASIS),
        B("prog", "Prognose van de bedrijfsarts", tpData.prognose_bedrijfsarts || "— nog niet ingevuld —"),
        B("prof", "Persoonlijk profiel", tpData.persoonlijk_profiel || "— nog niet ingevuld —"),
        B("zp", "Zoekprofiel", tpData.zoekprofiel || "— nog niet ingevuld —"),
        B("blem", "Praktische belemmeringen", tpData.praktische_belemmeringen || "— nog niet ingevuld —"),
        B("ad", "In het arbeidsdeskundigrapport staat het volgende advies over passende arbeid",
            tpData.advies_ad_passende_arbeid || "— nog niet ingevuld —"),
        B("pow", "Perspectief op Werk (PoW-meter)", tpData.pow_meter || "— door werknemer in te vullen —"),
        B("plaats", "Visie op plaatsbaarheid", tpData.visie_plaatsbaarheid || "— nog niet ingevuld —"),

        ...(selectedForPreview.length
            ? [
                B("tp-acts-intro", "Trajectdoel en in te zetten activiteiten", TP_ACTIVITIES_INTRO, activitiesMeasureKey),
                ...selectedForPreview.map(a => B(`act-${a.id}`, a.title, a.body, a.id)),
            ]
            : []),

        C("agree", <AgreementBlock />, "agree"),
        C("sign",
            <SignatureBlock
                employeeName={
                    tpData.employee_full_name ||
                    `${tpData.employee_first_name ?? ""} ${tpData.employee_last_name ?? ""}`.trim() ||
                    "Naam werknemer"
                }
                advisorName={tpData.loopbaanadviseur_name || "Loopbaanadviseur"}
                employerContact={
                    tpData.client_contact_full_name ||
                    `${tpData.referent_first_name ?? ""} ${tpData.referent_last_name ?? ""}`.trim() ||
                    "Naam opdrachtgever"
                }
            />,
            signatureMeasureKey
        ),
    ];


    if (loading) return <p>Laden...</p>;

    return (
        <div className="flex gap-10 h-[75vh] items-start p-6 overflow-hidden">
            {/* LEFT: builder controls */}
            <div className="w-[50%] space-y-6 overflow-y-auto max-h-full pr-2">
                {/* Inleiding */}
                <SectionHeader
                    title="Inleiding"
                    actionLabel={busy.inleiding ? "Autofilling..." : "Autofill — Inleiding"}
                    onAction={genInleiding}
                    disabled={!!busy.inleiding}
                />
                <textarea
                    className="w-full h-[200px] border rounded text-sm p-2"
                    value={tpData.inleiding || ""}
                    onChange={(e) => updateField("inleiding", e.target.value)}
                    placeholder="Laat AI dit genereren — of pas handmatig aan."
                />
                <p className="text-xs text-gray-600 -mt-2">
                    {tpData.has_ad_report
                        ? "AD-rapport gedetecteerd → AD-subblok wordt automatisch onder de inleiding getoond."
                        : "Geen AD-rapport gedetecteerd → vaste NB-regel wordt automatisch toegevoegd."}
                </p>

                {/* Sociale + Visie werknemer */}
                <SectionHeader
                    title="Sociale achtergrond & Visie werknemer"
                    actionLabel={busy.socialeVisie ? "Autofilling..." : "Autofill — Sociale + Visie"}
                    onAction={genSocialeVisie}
                    disabled={!!busy.socialeVisie}
                />
                <label className="block text-sm font-semibold mb-1">Sociale achtergrond & maatschappelijke context</label>
                <textarea
                    className="w-full h-[130px] border rounded p-2 text-sm mb-3"
                    value={tpData.sociale_achtergrond || ""}
                    onChange={(e) => updateField("sociale_achtergrond", e.target.value)}
                />
                <label className="block text-sm font-semibold mb-1">Visie van werknemer</label>
                <textarea
                    className="w-full h-[120px] border rounded p-2 text-sm"
                    value={tpData.visie_werknemer || ""}
                    onChange={(e) => updateField("visie_werknemer", e.target.value)}
                />

                {/* Visie van loopbaanadviseur (vast) */}
                <label className="block text-sm font-semibold mt-6 mb-1">Visie van loopbaanadviseur (vast)</label>
                <textarea
                    className="w-full h-[110px] border rounded p-2 text-sm bg-gray-50"
                    value={tpData.visie_loopbaanadviseur || ""}
                    onChange={(e) => updateField("visie_loopbaanadviseur", e.target.value)}
                    readOnly
                />

                {/* Prognose van de bedrijfsarts */}
                <SectionHeader
                    title="Prognose van de bedrijfsarts"
                    actionLabel={busy.prognose ? "Autofilling..." : "Autofill — Prognose (FML → AD)"}
                    onAction={genPrognose}
                    disabled={!!busy.prognose}
                />
                <textarea
                    className="w-full h-[110px] border rounded p-2 text-sm"
                    value={tpData.prognose_bedrijfsarts || ""}
                    onChange={(e) => updateField("prognose_bedrijfsarts", e.target.value)}
                />

                {/* Persoonlijk profiel + Zoekprofiel */}
                <SectionHeader
                    title="Persoonlijk profiel & Zoekprofiel"
                    actionLabel={busy.profielZoek ? "Autofilling..." : "Autofill — Profiel + Zoekprofiel"}
                    onAction={genProfielZoekprofiel}
                    disabled={!!busy.profielZoek}
                />
                <label className="block text-sm font-semibold mb-1">Persoonlijk profiel</label>
                <textarea
                    className="w-full h-[110px] border rounded p-2 text-sm mb-3"
                    value={tpData.persoonlijk_profiel || ""}
                    onChange={(e) => updateField("persoonlijk_profiel", e.target.value)}
                />
                <label className="block text-sm font-semibold mb-1">Zoekprofiel</label>
                <textarea
                    className="w-full h-[110px] border rounded p-2 text-sm"
                    value={tpData.zoekprofiel || ""}
                    onChange={(e) => updateField("zoekprofiel", e.target.value)}
                />

                {/* Praktische belemmeringen (Intake) */}
                <SectionHeader
                    title="Praktische belemmeringen (uit Intake)"
                    actionLabel={busy.belemmeringen ? "Autofilling..." : "Autofill — Belemmeringen"}
                    onAction={genBelemmeringen}
                    disabled={!!busy.belemmeringen}
                />
                <textarea
                    className="w-full h-[100px] border rounded p-2 text-sm"
                    value={tpData.praktische_belemmeringen || ""}
                    onChange={(e) => updateField("praktische_belemmeringen", e.target.value)}
                />

                {/* AD: advies passende arbeid */}
                <SectionHeader
                    title="AD-advies: passende arbeid (extract)"
                    actionLabel={busy.adAdvies ? "Extracting..." : "Extract — AD-advies"}
                    onAction={genAdAdvies}
                    disabled={!!busy.adAdvies}
                />
                <textarea
                    className="w-full h-[90px] border rounded p-2 text-sm"
                    value={tpData.advies_ad_passende_arbeid || ""}
                    onChange={(e) => updateField("advies_ad_passende_arbeid", e.target.value)}
                />

                {/* PoW-meter (own fill by worker) */}
                <label className="block text-sm font-semibold mt-6 mb-1">Perspectief op Werk (PoW-meter)</label>
                <textarea
                    className="w-full h-[80px] border rounded p-2 text-sm"
                    value={tpData.pow_meter || ""}
                    onChange={(e) => updateField("pow_meter", e.target.value)}
                    placeholder="Laat de werknemer dit invullen (korte toelichting of score)."
                />

                {/* Visie op plaatsbaarheid */}
                <SectionHeader
                    title="Visie op plaatsbaarheid"
                    actionLabel={busy.plaatsbaarheid ? "Autofilling..." : "Autofill — Plaatsbaarheid (gebaseerd op zoekprofiel)"}
                    onAction={genPlaatsbaarheid}
                    disabled={!!busy.plaatsbaarheid}
                />
                <textarea
                    className="w-full h-[120px] border rounded p-2 text-sm"
                    value={tpData.visie_plaatsbaarheid || ""}
                    onChange={(e) => updateField("visie_plaatsbaarheid", e.target.value)}
                    placeholder="AI stelt 3–5 passende functies met korte motivatie voor."
                />

                {/* Trajectdoel & activiteiten (selector) */}
                <div className="mt-8">
                    <SectionHeader
                        title="Trajectdoel en in te zetten activiteiten"
                        actionLabel="—" onAction={() => { }} disabled
                    />
                    <p className="text-xs text-gray-600 mb-2">
                        Vink de activiteiten aan die je in het trajectplan wilt opnemen.
                    </p>
                    <div className="space-y-2">
                        {activities.map((a) => {
                            const checked = selectedActivities.includes(a.id);
                            return (
                                <label key={a.id} className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50">
                                    <input type="checkbox" className="mt-1" checked={checked} onChange={() => toggleActivity(a.id)} />
                                    <div>
                                        <div className="font-medium">{a.title}</div>
                                        <div className="text-xs text-gray-600 line-clamp-2">{a.body}</div>
                                    </div>
                                </label>
                            );
                        })}
                        {activities.length === 0 && (
                            <div className="text-xs text-gray-500 italic">Geen activiteiten geladen.</div>
                        )}
                    </div>
                </div>


                <div className="flex gap-3 pt-2">
                    <button
                        onClick={saveAll}
                        disabled={saving}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>

            {/* RIGHT: preview (A4 look) */}
            <div className="w-[50%] flex justify-center items-start pt-4 overflow-y-auto overflow-x-hidden max-h-[75vh]">
                <div className="transform scale-[0.65] origin-top">
                    <PaginatedPreview sections={sectionsArr} />


                </div>
            </div>

        </div>
    );
}

/* ---------- small helpers (UI) ---------- */

function SectionHeader({
    title,
    actionLabel,
    onAction,
    disabled,
}: {
    title: string;
    actionLabel: string;
    onAction: () => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-center justify-between mt-6 mb-1">
            <label className="block text-sm font-semibold">{title}</label>
            <button
                onClick={onAction}
                disabled={disabled}
                className="bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700 text-sm disabled:opacity-60"
            >
                {actionLabel}
            </button>
        </div>
    );
}


function PaginatedPreview({ sections }: { sections: ReadonlyArray<PreviewItem> }) {
    const PAGE_W = 794;
    const PAGE_H = 1123;
    const PAD = 40;
    const CONTENT_H = PAGE_H - PAD * 2;
    const BLOCK_SPACING = 12;

    const headerRef = useRef<HTMLDivElement | null>(null);
    const blockRefs = useRef<Array<HTMLDivElement | null>>([]);
    const measuredHeights = useRef<number[]>([]);
    const [pages, setPages] = useState<number[][]>([]);

    const MeasureTree = () => (
        <div style={{ position: "absolute", left: -99999, top: 0, width: PAGE_W }} className="invisible">
            <div className={page} style={{ width: PAGE_W, height: PAGE_H, padding: PAD }}>
                <PageHeader ref={headerRef} />
                {sections.map((s, i) => (
                    <div key={`m-${s.key}`} ref={el => { blockRefs.current[i] = el; }} className="mb-3">
                        {s.variant === "subtle" && s.text ? (
                            <div className={subtle}>{s.text}</div>
                        ) : s.variant === "block" && s.text ? (
                            <div>
                                <div className={blockTitle}>{s.title}</div>
                                <div className={paperText}>{s.text}</div>
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
        measuredHeights.current = sections.map((_, i) => blockRefs.current[i]?.offsetHeight ?? 0);

        const usable = CONTENT_H - headerH;
        const newPages: number[][] = [];
        let cur: number[] = [];
        let used = 0;

        measuredHeights.current.forEach((h, idx) => {
            const add = (cur.length ? BLOCK_SPACING : 0) + h;
            if (used + add > usable) {
                if (cur.length) newPages.push(cur);
                cur = [idx];
                used = h;
            } else {
                used += add;
                cur.push(idx);
            }
        });

        if (cur.length) newPages.push(cur);
        setPages(newPages);
    }, [
        sections.length,
        JSON.stringify(
            sections.map(s => [s.key, s.title ?? "", s.text ?? "", s.variant, s.measureKey ?? ""])
        ),
    ]);

    return (
        <>
            <MeasureTree />
            {pages.map((idxs, p) => (
                <div key={`p-${p}`} className={page} style={{ width: PAGE_W, height: PAGE_H }}>
                    <PageHeader />
                    {idxs.map(i => {
                        const s = sections[i];
                        return (
                            <div key={s.key} className="mb-3">
                                {s.variant === "subtle" && s.text ? (
                                    <div className={subtle}>{s.text}</div>
                                ) : s.variant === "block" && s.text ? (
                                    <>
                                        <div className={blockTitle}>{s.title}</div>
                                        <div className={paperText}>{s.text}</div>
                                    </>
                                ) : (
                                    s.node
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </>
    );
}



// header used in measurement & real pages (same structure)
const PageHeader = React.forwardRef<HTMLDivElement>((_props, ref) => (
    <div ref={ref as any}>
        <div className="w-full flex justify-end mb-6">
            <Image src={Logo2} alt="Valentinez Logo" width={120} height={60} />
        </div>
    </div>
));
PageHeader.displayName = "PageHeader";
