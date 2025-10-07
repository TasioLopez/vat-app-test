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

// --- Static "agreement" text (from TP template) ---
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

const B = (key: string, title: string, text: string, measureKey?: string | number): PreviewItem => ({
    key, title, text, variant: "block", measureKey
});

const S = (key: string, text: string): PreviewItem => ({
    key, text, variant: "subtle"
});

const C = (key: string, node: React.ReactNode, measureKey?: string | number): PreviewItem => ({
    key, node, variant: "custom", measureKey
});

const TP_ACTIVITIES_INTRO = "Op basis van de intake en de beschikbare documenten zijn de volgende activiteiten geselecteerd voor dit traject:";

function AgreementBlock() {
    return (
        <div>
            <div className={blockTitle}>Akkoordverklaring</div>
            <div className={paperText}>
                <p className="mb-3">{AGREEMENT_INTRO}</p>
                <ol className="list-decimal list-inside space-y-2 mb-4">
                    {AGREEMENT_POINTS.map((point, i) => (
                        <li key={i} className="text-xs leading-relaxed">{point}</li>
                    ))}
                </ol>
                <p className="text-xs leading-relaxed">{AGREEMENT_FOOTER}</p>
            </div>
        </div>
    );
}

function SignatureBlock({ employeeName, advisorName, employerContact }: {
    employeeName: string;
    advisorName: string;
    employerContact: string;
}) {
    return (
        <div>
            <div className={blockTitle}>Ondertekening</div>
            <div className={paperText}>
                <div className="grid grid-cols-3 gap-8 text-xs">
                    <div>
                        <div className="font-semibold mb-8">Werknemer</div>
                        <div className="border-b border-gray-400 mb-2">{employeeName}</div>
                        <div className="text-gray-600">Handtekening</div>
                    </div>
                    <div>
                        <div className="font-semibold mb-8">Loopbaanadviseur</div>
                        <div className="border-b border-gray-400 mb-2">{advisorName}</div>
                        <div className="text-gray-600">Handtekening</div>
                    </div>
                    <div>
                        <div className="font-semibold mb-8">Opdrachtgever</div>
                        <div className="border-b border-gray-400 mb-2">{employerContact}</div>
                        <div className="text-gray-600">Handtekening</div>
                    </div>
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

    const selectedForPreview = activities.filter(a => a && selectedActivities.includes(a.id));

    const toggleActivity = async (id: string) => {
        const newSelectedActivities = selectedActivities.includes(id) 
            ? selectedActivities.filter(x => x !== id)
            : [...selectedActivities, id];
        
        console.log("🔄 Toggling activity:", id);
        console.log("📊 Current selected:", selectedActivities);
        console.log("📊 New selected:", newSelectedActivities);
        
        setSelectedActivities(newSelectedActivities);
        
        // Auto-save the changes with retry logic
        let retries = 3;
        while (retries > 0) {
            try {
                const metaPayload = {
                    employee_id: employeeId,
                    tp3_activities: newSelectedActivities
                };

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

                if (metaRes.error) throw new Error(`tp_meta (save): ${metaRes.error.message}`);
                console.log("✅ Auto-saved activities:", newSelectedActivities);
                break; // Success, exit retry loop
            } catch (err) {
                console.error(`❌ Failed to auto-save activities (${4-retries} retries left):`, err);
                retries--;
                if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
                }
            }
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data, error } = await supabase
                    .from("tp_meta")
                    .select("*")
                    .eq("employee_id", employeeId)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    // Load saved activities
                    const savedActivities = safeParse(data.tp3_activities, []);
                    console.log("📥 Loaded activities from DB:", savedActivities);
                    setSelectedActivities(savedActivities);
                } else {
                    console.log("📥 No data found in DB, using empty array");
                }
            } catch (err) {
                console.error("Failed to load TP meta:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [employeeId]);

    const saveAll = async () => {
        setSaving(true);
        try {
            const metaPayload = {
                employee_id: employeeId,
                tp3_activities: selectedActivities
            };

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

            if (metaRes.error) throw new Error(`tp_meta (save): ${metaRes.error.message}`);

        } catch (err) {
            const msg = err instanceof Error ? err.message : JSON.stringify(err);
            console.error("Save failed:", err);
            alert(msg);
        } finally {
            setSaving(false);
        }
    };

    const genInleiding = async () => {
        if (busy.inleiding) return;
        setBusy(prev => ({ ...prev, inleiding: true }));
        try {
            const res = await fetch(`/api/autofill-tp-3/inleiding?employeeId=${employeeId}`);
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            if (json.content) updateField("inleiding", json.content);
        } catch (err) {
            console.error("❌ Autofill failed for inleiding:", err);
        } finally {
            setBusy(prev => ({ ...prev, inleiding: false }));
        }
    };

    const genSocialeVisie = async () => {
        if (busy.socialeVisie) return;
        setBusy(prev => ({ ...prev, socialeVisie: true }));
        try {
            const res = await fetch(`/api/autofill-tp-3/sociale-visie?employeeId=${employeeId}`);
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            if (json.content) {
                updateField("sociale_achtergrond", json.content.sociale_achtergrond || "");
                updateField("visie_werknemer", json.content.visie_werknemer || "");
            }
        } catch (err) {
            console.error("❌ Autofill failed for sociale-visie:", err);
        } finally {
            setBusy(prev => ({ ...prev, socialeVisie: false }));
        }
    };

    const genPrognose = async () => {
        if (busy.prognose) return;
        setBusy(prev => ({ ...prev, prognose: true }));
        try {
            const res = await fetch(`/api/autofill-tp-3/prognose?employeeId=${employeeId}`);
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            if (json.content) updateField("prognose_bedrijfsarts", json.content);
        } catch (err) {
            console.error("❌ Autofill failed for prognose:", err);
        } finally {
            setBusy(prev => ({ ...prev, prognose: false }));
        }
    };

    const genProfielZoekprofiel = async () => {
        if (busy.profielZoek) return;
        setBusy(prev => ({ ...prev, profielZoek: true }));
        try {
            const res = await fetch(`/api/autofill-tp-3/profiel-zoekprofiel?employeeId=${employeeId}`);
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            if (json.content) {
                updateField("persoonlijk_profiel", json.content.persoonlijk_profiel || "");
                updateField("zoekprofiel", json.content.zoekprofiel || "");
            }
        } catch (err) {
            console.error("❌ Autofill failed for profiel-zoekprofiel:", err);
        } finally {
            setBusy(prev => ({ ...prev, profielZoek: false }));
        }
    };

    const genBelemmeringen = async () => {
        if (busy.belemmeringen) return;
        setBusy(prev => ({ ...prev, belemmeringen: true }));
        try {
            const res = await fetch(`/api/autofill-tp-3/belemmeringen?employeeId=${employeeId}`);
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            if (json.content) updateField("praktische_belemmeringen", json.content);
        } catch (err) {
            console.error("❌ Autofill failed for belemmeringen:", err);
        } finally {
            setBusy(prev => ({ ...prev, belemmeringen: false }));
        }
    };

    const genAdAdvies = async () => {
        if (busy.adAdvies) return;
        setBusy(prev => ({ ...prev, adAdvies: true }));
        try {
            const res = await fetch(`/api/autofill-tp-3/ad-advies?employeeId=${employeeId}`);
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            if (json.content) updateField("advies_ad_passende_arbeid", json.content);
        } catch (err) {
            console.error("❌ Autofill failed for ad-advies:", err);
        } finally {
            setBusy(prev => ({ ...prev, adAdvies: false }));
        }
    };

    const genPlaatsbaarheid = async () => {
        if (busy.plaatsbaarheid) return;
        setBusy(prev => ({ ...prev, plaatsbaarheid: true }));
        try {
            const res = await fetch(`/api/autofill-tp-3/plaatsbaarheid?employeeId=${employeeId}`);
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            if (json.content) updateField("visie_plaatsbaarheid", json.content);
        } catch (err) {
            console.error("❌ Autofill failed for plaatsbaarheid:", err);
        } finally {
            setBusy(prev => ({ ...prev, plaatsbaarheid: false }));
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
                ...selectedForPreview.filter(a => a).map(a => B(`act-${a.id}`, a.title, a.body, a.id)),
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
    ].filter(section => section); // Final safety check to remove any undefined sections

    if (loading) return <p>Laden...</p>;

    return (
        <div className="flex gap-10 h-[75vh] items-start p-6 overflow-hidden">
            {/* LEFT: builder controls */}
            <div className="w-[50%] space-y-6 overflow-y-auto max-h-full pr-2">
                {/* Inleiding */}
                <SectionHeader
                    title="Inleiding"
                    actionLabel={busy.inleiding ? "Automatisch invullen..." : "Automatisch invullen — Inleiding"}
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
                    actionLabel={busy.socialeVisie ? "Automatisch invullen..." : "Automatisch invullen — Sociale + Visie"}
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
                    actionLabel={busy.prognose ? "Automatisch invullen..." : "Automatisch invullen — Prognose (FML → AD)"}
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
                    actionLabel={busy.profielZoek ? "Automatisch invullen..." : "Automatisch invullen — Profiel + Zoekprofiel"}
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
                    actionLabel={busy.belemmeringen ? "Automatisch invullen..." : "Automatisch invullen — Belemmeringen"}
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
                    actionLabel={busy.adAdvies ? "Extraheren..." : "Extraheren — AD-advies"}
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
                    actionLabel={busy.plaatsbaarheid ? "Automatisch invullen..." : "Automatisch invullen — Plaatsbaarheid (gebaseerd op zoekprofiel)"}
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
                        {activities.filter(a => a).map((a) => {
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
                        {saving ? "Opslaan..." : "Opslaan"}
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
                {sections.filter(s => s).map((s, i) => (
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
                        if (!s) return null; // Safety check for undefined sections
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