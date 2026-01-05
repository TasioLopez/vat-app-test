"use client";

import React, { useEffect, useState, useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { useTP } from "@/context/TPContext";
import { supabase } from "@/lib/supabase/client";
import { WETTELIJKE_KADERS, VISIE_LOOPBAANADVISEUR_BASIS } from "@/lib/tp/static";
import Logo2 from "@/assets/images/logo-2.png";
import ACTIVITIES, { type TPActivity } from "@/lib/tp/tp_activities";
import SectionEditorModal from '../SectionEditorModal';
import { FileText } from 'lucide-react';
import { ActivityBody } from './ActivityBody';
import { Button } from '@/components/ui/button';
import TPPreviewWrapper from '@/components/tp/TPPreviewWrapper';

const safeParse = <T,>(v: any, fallback: T): T => {
    try { return v ?? fallback; } catch { return fallback; }
};

const page = "bg-white w-[794px] h-[1123px] shadow-lg border border-border p-10 text-[12px] font-sans mx-auto mb-6 print:shadow-none print:border-0";
const heading = "text-lg font-semibold text-center mb-6";
const blockTitle = "font-bold bg-muted text-purple-600 px-2 py-1";
const paperText = "p-2 whitespace-pre-wrap leading-relaxed";
const subtle = "bg-muted/50 px-3 py-1 whitespace-pre-wrap leading-relaxed italic";

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

const AGREEMENT_FOOTER_1 =
    "Met ondertekening van dit trajectplan gaat u akkoord met de inhoud van dit trajectplan en de wijze waarop ValentineZ uw gegevens opvraagt, verwerkt, deelt en opslaat.";

const AGREEMENT_FOOTER_2 = {
    text: "Voor alle volledige informatie verwijzen wij u graag naar ons privacyreglement en ons klachtenreglement op onze website ",
    link1: "www.valentinez.nl",
    middle: ". Een papieren versie kunt u opvragen via 085 - 800 2010 of ",
    link2: "info@ValentineZ.nl",
    end: "."
};

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

const TP_ACTIVITIES_INTRO = "Het doel van dit traject is een bevredigend resultaat. Dit houdt in een structurele werkhervatting die zo dicht mogelijk aansluit bij de resterende functionele mogelijkheden. Onderstaande aanbodversterkende activiteiten zullen ingezet worden om het doel van betaald werk te realiseren.";

function AgreementBlock() {
    return (
        <div>
            <div className={blockTitle}>Akkoordverklaring</div>
            <div className={paperText}>
                <p className="mb-3">{AGREEMENT_INTRO}</p>
                <div className="ml-4 space-y-2 mb-4">
                    {AGREEMENT_POINTS.map((point, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <img 
                                src="/val-logo.jpg" 
                                alt="" 
                                style={{ width: '14px', height: '14px', marginTop: '3px', flexShrink: 0 }}
                            />
                            <span className="text-xs leading-relaxed">{point}</span>
                        </div>
                    ))}
                </div>
                <p className="text-xs leading-relaxed">{AGREEMENT_FOOTER_1}</p>
                <p className="text-xs leading-relaxed mt-2">
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
    const [rewriting, setRewriting] = useState<{ [k: string]: boolean }>({});
    const [autofillMessage, setAutofillMessage] = useState<{
        type: 'success' | 'error' | 'warning';
        title: string;
        content: string;
    } | null>(null);
    const [openModal, setOpenModal] = useState<string | null>(null);

    // ✅ no need to keep this in state; it's static
    const activities: TPActivity[] = Array.isArray(ACTIVITIES) ? ACTIVITIES : [];
    console.log("activities length:", activities.length, activities.map(a => a.id));

    const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

    const selectedForPreview = activities.filter(a => a && selectedActivities.includes(a.id));

    // Rewrite function for applying user's writing style
    const rewriteInMyStyle = async (fieldName: string, originalText: string) => {
        try {
            setRewriting(prev => ({ ...prev, [fieldName]: true }));

            // Get current user ID
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            if (authError || !user) {
                alert('Gebruiker niet gevonden. Probeer opnieuw in te loggen.');
                return;
            }

            const rewriteResponse = await fetch('/api/mijn-stem/rewrite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    originalText: originalText,
                    sectionType: fieldName
                }),
            });

            const rewriteData = await rewriteResponse.json();

            if (rewriteData.success) {
                updateField(fieldName, rewriteData.rewrittenText);
                // Optional: Show success message
                console.log('Text rewritten in your style successfully');
            } else if (rewriteData.hasStyle === false) {
                alert('Geen schrijfstijl gevonden. Upload eerst enkele documenten in de Instellingen > Mijn Stem sectie.');
            } else {
                alert('Fout bij herschrijven: ' + (rewriteData.error || 'Onbekende fout'));
            }
        } catch (error) {
            console.error('Rewrite error:', error);
            alert('Fout bij herschrijven van tekst. Probeer het opnieuw.');
        } finally {
            setRewriting(prev => ({ ...prev, [fieldName]: false }));
        }
    };

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
        setAutofillMessage(null);
        
        try {
            const res = await fetch(`/api/autofill-tp-3/inleiding?employeeId=${employeeId}`);
            const json = await res.json();
            
            if (json.error) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Fout',
                    content: json.error
                });
                throw new Error(json.error);
            }
            
            if (json.details) {
                // Update all fields - API returns { details: { inleiding, inleiding_sub, has_ad_report } }
                updateField("inleiding", json.details.inleiding || "");
                updateField("inleiding_sub", json.details.inleiding_sub || "");
                updateField("has_ad_report", json.details.has_ad_report || false);
                
                setAutofillMessage({
                    type: 'success',
                    title: '✅ Succesvol Ingevuld',
                    content: `De Inleiding sectie is ingevuld met AI. Velden: ${json.autofilled_fields?.join(', ') || 'inleiding, inleiding_sub'}`
                });
                
                // Auto-dismiss after 3 seconds
                setTimeout(() => setAutofillMessage(null), 3000);
            }
        } catch (err) {
            console.error("❌ Autofill failed for inleiding:", err);
            if (!autofillMessage) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Systeem Fout',
                    content: err instanceof Error ? err.message : 'Onbekende fout bij autofill'
                });
            }
        } finally {
            setBusy(prev => ({ ...prev, inleiding: false }));
        }
    };

    const genSocialeAchtergrond = async () => {
        if (busy.socialeAchtergrond) return;
        setBusy(prev => ({ ...prev, socialeAchtergrond: true }));
        setAutofillMessage(null);
        
        try {
            const res = await fetch(`/api/autofill-tp-3/sociale-achtergrond?employeeId=${employeeId}`);
            const json = await res.json();
            
            if (json.error) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Fout',
                    content: json.error
                });
                throw new Error(json.error);
            }
            
            if (json.details) {
                updateField("sociale_achtergrond", json.details.sociale_achtergrond || "");
                
                setAutofillMessage({
                    type: 'success',
                    title: '✅ Succesvol Ingevuld',
                    content: `De Sociale achtergrond sectie is ingevuld met AI. Velden: ${json.autofilled_fields?.join(', ') || 'sociale_achtergrond'}`
                });
                
                // Auto-dismiss after 3 seconds
                setTimeout(() => setAutofillMessage(null), 3000);
            }
        } catch (err) {
            console.error("❌ Autofill failed for sociale-achtergrond:", err);
            if (!autofillMessage) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Systeem Fout',
                    content: err instanceof Error ? err.message : 'Onbekende fout bij autofill'
                });
            }
        } finally {
            setBusy(prev => ({ ...prev, socialeAchtergrond: false }));
        }
    };

    const genVisieWerknemer = async () => {
        if (busy.visieWerknemer) return;
        setBusy(prev => ({ ...prev, visieWerknemer: true }));
        setAutofillMessage(null);
        
        try {
            const res = await fetch(`/api/autofill-tp-3/visie-werknemer?employeeId=${employeeId}`);
            const json = await res.json();
            
            if (json.error) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Fout',
                    content: json.error
                });
                throw new Error(json.error);
            }
            
            if (json.details) {
                updateField("visie_werknemer", json.details.visie_werknemer || "");
                
                setAutofillMessage({
                    type: 'success',
                    title: '✅ Succesvol Ingevuld',
                    content: `De Visie van werknemer sectie is ingevuld met AI. Velden: ${json.autofilled_fields?.join(', ') || 'visie_werknemer'}`
                });
                
                // Auto-dismiss after 3 seconds
                setTimeout(() => setAutofillMessage(null), 3000);
            }
        } catch (err) {
            console.error("❌ Autofill failed for visie-werknemer:", err);
            if (!autofillMessage) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Systeem Fout',
                    content: err instanceof Error ? err.message : 'Onbekende fout bij autofill'
                });
            }
        } finally {
            setBusy(prev => ({ ...prev, visieWerknemer: false }));
        }
    };

    const genVisieAdviseur = async () => {
        if (busy.visieAdviseur) return;
        setBusy(prev => ({ ...prev, visieAdviseur: true }));
        setAutofillMessage(null);
        
        try {
            const res = await fetch(`/api/autofill-tp-3/visie-adviseur?employeeId=${employeeId}`);
            const json = await res.json();
            
            if (json.error) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Fout',
                    content: json.error
                });
                throw new Error(json.error);
            }
            
            if (json.details) {
                updateField("visie_loopbaanadviseur", json.details.visie_loopbaanadviseur || "");
                
                setAutofillMessage({
                    type: 'success',
                    title: '✅ Succesvol Ingevuld',
                    content: `De Visie van loopbaanadviseur sectie is ingevuld met AI. Velden: ${json.autofilled_fields?.join(', ') || 'visie_loopbaanadviseur'}`
                });
                
                // Auto-dismiss after 3 seconds
                setTimeout(() => setAutofillMessage(null), 3000);
            }
        } catch (err) {
            console.error("❌ Autofill failed for visie-adviseur:", err);
            if (!autofillMessage) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Systeem Fout',
                    content: err instanceof Error ? err.message : 'Onbekende fout bij autofill'
                });
            }
        } finally {
            setBusy(prev => ({ ...prev, visieAdviseur: false }));
        }
    };

    const genPrognose = async () => {
        if (busy.prognose) return;
        setBusy(prev => ({ ...prev, prognose: true }));
        setAutofillMessage(null);
        
        try {
            const res = await fetch(`/api/autofill-tp-3/prognose-bedrijfsarts?employeeId=${employeeId}`);
            const json = await res.json();
            
            if (json.error) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Fout',
                    content: json.error
                });
                throw new Error(json.error);
            }
            
            if (json.details) {
                updateField("prognose_bedrijfsarts", json.details.prognose_bedrijfsarts || "");
                
                setAutofillMessage({
                    type: 'success',
                    title: '✅ Succesvol Ingevuld',
                    content: `De Prognose van bedrijfsarts sectie is ingevuld met AI. Velden: ${json.autofilled_fields?.join(', ') || 'prognose_bedrijfsarts'}`
                });
                
                // Auto-dismiss after 3 seconds
                setTimeout(() => setAutofillMessage(null), 3000);
            }
        } catch (err) {
            console.error("❌ Autofill failed for prognose-bedrijfsarts:", err);
            if (!autofillMessage) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Systeem Fout',
                    content: err instanceof Error ? err.message : 'Onbekende fout bij autofill'
                });
            }
        } finally {
            setBusy(prev => ({ ...prev, prognose: false }));
        }
    };

    const genPersoonlijkProfiel = async () => {
        if (busy.persoonlijkProfiel) return;
        setBusy(prev => ({ ...prev, persoonlijkProfiel: true }));
        setAutofillMessage(null);
        
        try {
            const res = await fetch(`/api/autofill-tp-3/persoonlijk-profiel?employeeId=${employeeId}`);
            const json = await res.json();
            
            if (json.error) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Fout',
                    content: json.error
                });
                throw new Error(json.error);
            }
            
            if (json.details) {
                updateField("persoonlijk_profiel", json.details.persoonlijk_profiel || "");
                
                setAutofillMessage({
                    type: 'success',
                    title: '✅ Succesvol Ingevuld',
                    content: `De Persoonlijk profiel sectie is ingevuld met AI. Velden: ${json.autofilled_fields?.join(', ') || 'persoonlijk_profiel'}`
                });
                
                // Auto-dismiss after 3 seconds
                setTimeout(() => setAutofillMessage(null), 3000);
            }
        } catch (err) {
            console.error("❌ Autofill failed for persoonlijk-profiel:", err);
            if (!autofillMessage) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Systeem Fout',
                    content: err instanceof Error ? err.message : 'Onbekende fout bij autofill'
                });
            }
        } finally {
            setBusy(prev => ({ ...prev, persoonlijkProfiel: false }));
        }
    };

    const genZoekprofiel = async () => {
        if (busy.zoekprofiel) return;
        setBusy(prev => ({ ...prev, zoekprofiel: true }));
        setAutofillMessage(null);
        
        try {
            const res = await fetch(`/api/autofill-tp-3/zoekprofiel?employeeId=${employeeId}`);
            const json = await res.json();
            
            if (json.error) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Fout',
                    content: json.error
                });
                throw new Error(json.error);
            }
            
            if (json.details) {
                updateField("zoekprofiel", json.details.zoekprofiel || "");
                
                setAutofillMessage({
                    type: 'success',
                    title: '✅ Succesvol Ingevuld',
                    content: `De Zoekprofiel sectie is ingevuld met AI. Velden: ${json.autofilled_fields?.join(', ') || 'zoekprofiel'}`
                });
                
                // Auto-dismiss after 3 seconds
                setTimeout(() => setAutofillMessage(null), 3000);
            }
        } catch (err) {
            console.error("❌ Autofill failed for zoekprofiel:", err);
            if (!autofillMessage) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Systeem Fout',
                    content: err instanceof Error ? err.message : 'Onbekende fout bij autofill'
                });
            }
        } finally {
            setBusy(prev => ({ ...prev, zoekprofiel: false }));
        }
    };


    const genAdAdviesPassendeArbeid = async () => {
        if (busy.adAdvies) return;
        setBusy(prev => ({ ...prev, adAdvies: true }));
        setAutofillMessage(null);
        
        try {
            const res = await fetch(`/api/autofill-tp-3/ad-advies-passende-arbeid?employeeId=${employeeId}`);
            const json = await res.json();
            
            if (json.error) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Fout',
                    content: json.error
                });
                throw new Error(json.error);
            }
            
            if (json.details) {
                updateField("advies_ad_passende_arbeid", json.details.advies_ad_passende_arbeid || "");
                
                setAutofillMessage({
                    type: 'success',
                    title: '✅ Succesvol Ingevuld',
                    content: `De AD advies over passende arbeid sectie is ingevuld met AI. Velden: ${json.autofilled_fields?.join(', ') || 'advies_ad_passende_arbeid'}`
                });
                
                // Auto-dismiss after 3 seconds
                setTimeout(() => setAutofillMessage(null), 3000);
            }
        } catch (err) {
            console.error("❌ Autofill failed for ad-advies-passende-arbeid:", err);
            if (!autofillMessage) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Systeem Fout',
                    content: err instanceof Error ? err.message : 'Onbekende fout bij autofill'
                });
            }
        } finally {
            setBusy(prev => ({ ...prev, adAdvies: false }));
        }
    };

    const genVisiePlaatsbaarheid = async () => {
        if (busy.plaatsbaarheid) return;
        setBusy(prev => ({ ...prev, plaatsbaarheid: true }));
        setAutofillMessage(null);
        
        try {
            const res = await fetch(`/api/autofill-tp-3/visie-plaatsbaarheid?employeeId=${employeeId}`);
            const json = await res.json();
            
            if (json.error) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Fout',
                    content: json.error
                });
                throw new Error(json.error);
            }
            
            if (json.details) {
                updateField("visie_plaatsbaarheid", json.details.visie_plaatsbaarheid || "");
                
                setAutofillMessage({
                    type: 'success',
                    title: '✅ Succesvol Ingevuld',
                    content: `De Visie op plaatsbaarheid sectie is ingevuld met AI. Velden: ${json.autofilled_fields?.join(', ') || 'visie_plaatsbaarheid'}`
                });
                
                // Auto-dismiss after 3 seconds
                setTimeout(() => setAutofillMessage(null), 3000);
            }
        } catch (err) {
            console.error("❌ Autofill failed for visie-plaatsbaarheid:", err);
            if (!autofillMessage) {
                setAutofillMessage({
                    type: 'error',
                    title: '❌ Systeem Fout',
                    content: err instanceof Error ? err.message : 'Onbekende fout bij autofill'
                });
            }
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
        B("blem", "Praktische belemmeringen", tpData.praktische_belemmeringen || "— nog niet ingevuld —"),
        B("zp", "Zoekprofiel", tpData.zoekprofiel || "— nog niet ingevuld —"),
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
                    `${tpData.first_name ?? ""} ${tpData.last_name ?? ""}`.trim() ||
                    "Naam werknemer"
                }
                advisorName={tpData.consultant_name || "Loopbaanadviseur"}
                employerContact={tpData.client_referent_name || "Naam opdrachtgever"}
            />,
            signatureMeasureKey
        ),
    ].filter(section => section); // Final safety check to remove any undefined sections

    if (loading) return <p>Laden...</p>;

    return (
        <div className="flex gap-10 h-full items-start p-6 overflow-hidden">
            {/* LEFT: builder controls */}
            <div className="w-[50%] space-y-6 overflow-y-auto max-h-full pr-2">
                {/* Notification */}
                {autofillMessage && (
                    <div className={`mb-4 p-4 rounded-lg ${
                        autofillMessage.type === 'success' ? 'bg-green-50 border border-green-200' :
                        autofillMessage.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-red-50 border border-red-200'
                    }`}>
                        <h4 className={`font-semibold ${
                            autofillMessage.type === 'success' ? 'text-green-800' :
                            autofillMessage.type === 'warning' ? 'text-yellow-800' :
                            'text-red-800'
                        }`}>{autofillMessage.title}</h4>
                        <p className={`text-sm mt-1 ${
                            autofillMessage.type === 'success' ? 'text-green-700' :
                            autofillMessage.type === 'warning' ? 'text-yellow-700' :
                            'text-red-700'
                        }`}>{autofillMessage.content}</p>
                    </div>
                )}
                
                {/* Sticky Save Button at the top */}
                <div className="sticky top-0 backdrop-blur-2xl bg-muted/30 hover:bg-muted/50 z-10 flex items-center gap-3 px-6 py-4 rounded-b-lg border-b border-border transition-all duration-300">
                    <Button
                        onClick={saveAll}
                        disabled={saving}
                    >
                        {saving ? "Opslaan..." : "Opslaan"}
                    </Button>
                </div>
                
                {/* Section Cards - MOVED TO TOP */}
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-600" />
                        Secties
                    </h3>
                    <div className="space-y-2">
                        <SectionCard
                            title="Inleiding"
                            content={tpData.inleiding}
                            onClick={() => setOpenModal('inleiding')}
                        />
                        <SectionCard
                            title="Sociale achtergrond"
                            content={tpData.sociale_achtergrond}
                            onClick={() => setOpenModal('sociale-achtergrond')}
                        />
                        <SectionCard
                            title="Visie van werknemer"
                            content={tpData.visie_werknemer}
                            onClick={() => setOpenModal('visie-werknemer')}
                        />
                        <SectionCard
                            title="Visie van loopbaanadviseur"
                            content={tpData.visie_loopbaanadviseur}
                            onClick={() => setOpenModal('visie-adviseur')}
                        />
                        <SectionCard
                            title="Prognose van de bedrijfsarts"
                            content={tpData.prognose_bedrijfsarts}
                            onClick={() => setOpenModal('prognose')}
                        />
                        <SectionCard
                            title="Persoonlijk profiel"
                            content={tpData.persoonlijk_profiel}
                            onClick={() => setOpenModal('persoonlijk-profiel')}
                        />
                        <SectionCard
                            title="Praktische belemmeringen"
                            content={tpData.praktische_belemmeringen}
                            onClick={() => setOpenModal('praktische-belemmeringen')}
                        />
                        <SectionCard
                            title="Zoekprofiel"
                            content={tpData.zoekprofiel}
                            onClick={() => setOpenModal('zoekprofiel')}
                        />
                        <SectionCard
                            title="AD advies over passende arbeid"
                            content={tpData.advies_ad_passende_arbeid}
                            onClick={() => setOpenModal('ad-advies')}
                        />
                        <SectionCard
                            title="Perspectief op Werk (PoW-meter)"
                            content={tpData.pow_meter}
                            onClick={() => setOpenModal('pow')}
                        />
                        <SectionCard
                            title="Visie op plaatsbaarheid"
                            content={tpData.visie_plaatsbaarheid}
                            onClick={() => setOpenModal('plaatsbaarheid')}
                        />
                    </div>
                </div>

                {/* Trajectdoel & activiteiten - KEEP THIS */}
                <div className="mt-8">
                    <SectionHeader
                        title="Trajectdoel en in te zetten activiteiten"
                        actionLabel="—" onAction={() => { }} disabled
                    />
                    <p className="text-xs text-muted-foreground mb-2">
                        Vink de activiteiten aan die je in het trajectplan wilt opnemen.
                    </p>
                    <div className="space-y-2">
                        {activities.filter(a => a).map((a) => {
                            const checked = selectedActivities.includes(a.id);
                            return (
                                <label key={a.id} className="flex items-start gap-2 p-2 border border-border rounded-md hover:bg-muted/50 transition-colors">
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
            </div>
            
            {/* MODALS */}
            <SectionEditorModal
                isOpen={openModal === 'inleiding'}
                onClose={() => setOpenModal(null)}
                title="Inleiding"
                value={tpData.inleiding || ''}
                onChange={(v) => updateField('inleiding', v)}
                onAutofill={genInleiding}
                onRewrite={() => rewriteInMyStyle('inleiding', tpData.inleiding || '')}
                isAutofilling={busy.inleiding}
                isRewriting={rewriting.inleiding}
                placeholder="Laat AI dit genereren — of pas handmatig aan."
            />
            
            <SectionEditorModal
                isOpen={openModal === 'sociale-achtergrond'}
                onClose={() => setOpenModal(null)}
                title="Sociale achtergrond"
                value={tpData.sociale_achtergrond || ''}
                onChange={(v) => updateField('sociale_achtergrond', v)}
                onAutofill={genSocialeAchtergrond}
                onRewrite={() => rewriteInMyStyle('sociale_achtergrond', tpData.sociale_achtergrond || '')}
                isAutofilling={busy.socialeAchtergrond}
                isRewriting={rewriting.sociale_achtergrond}
            />

            <SectionEditorModal
                isOpen={openModal === 'visie-werknemer'}
                onClose={() => setOpenModal(null)}
                title="Visie van werknemer"
                value={tpData.visie_werknemer || ''}
                onChange={(v) => updateField('visie_werknemer', v)}
                onAutofill={genVisieWerknemer}
                onRewrite={() => rewriteInMyStyle('visie_werknemer', tpData.visie_werknemer || '')}
                isAutofilling={busy.visieWerknemer}
                isRewriting={rewriting.visie_werknemer}
            />
            
            <SectionEditorModal
                isOpen={openModal === 'visie-adviseur'}
                onClose={() => setOpenModal(null)}
                title="Visie van loopbaanadviseur"
                value={tpData.visie_loopbaanadviseur || ''}
                onChange={(v) => updateField('visie_loopbaanadviseur', v)}
                onAutofill={genVisieAdviseur}
                onRewrite={() => rewriteInMyStyle('visie_loopbaanadviseur', tpData.visie_loopbaanadviseur || '')}
                isAutofilling={busy.visieAdviseur}
                isRewriting={rewriting.visie_loopbaanadviseur}
                placeholder="Laat AI dit genereren uit FML/IZP documenten — of pas handmatig aan."
            />
            
            <SectionEditorModal
                isOpen={openModal === 'prognose'}
                onClose={() => setOpenModal(null)}
                title="Prognose van de bedrijfsarts"
                value={tpData.prognose_bedrijfsarts || ''}
                onChange={(v) => updateField('prognose_bedrijfsarts', v)}
                onAutofill={genPrognose}
                onRewrite={() => rewriteInMyStyle('prognose_bedrijfsarts', tpData.prognose_bedrijfsarts || '')}
                isAutofilling={busy.prognose}
                isRewriting={rewriting.prognose_bedrijfsarts}
                placeholder="Laat AI dit genereren uit FML/IZP/AD documenten — of pas handmatig aan."
            />
            
            <SectionEditorModal
                isOpen={openModal === 'persoonlijk-profiel'}
                onClose={() => setOpenModal(null)}
                title="Persoonlijk profiel"
                value={tpData.persoonlijk_profiel || ''}
                onChange={(v) => updateField('persoonlijk_profiel', v)}
                onAutofill={genPersoonlijkProfiel}
                onRewrite={() => rewriteInMyStyle('persoonlijk_profiel', tpData.persoonlijk_profiel || '')}
                isAutofilling={busy.persoonlijkProfiel}
                isRewriting={rewriting.persoonlijk_profiel}
                placeholder="Laat AI dit genereren uit alle documenten — of pas handmatig aan."
            />
            
            <SectionEditorModal
                isOpen={openModal === 'praktische-belemmeringen'}
                onClose={() => setOpenModal(null)}
                title="Praktische belemmeringen"
                value={tpData.praktische_belemmeringen || ''}
                onChange={(v) => updateField('praktische_belemmeringen', v)}
                onRewrite={() => rewriteInMyStyle('praktische_belemmeringen', tpData.praktische_belemmeringen || '')}
                isRewriting={rewriting.praktische_belemmeringen}
                placeholder="Handmatig invullen — geen AI autofill beschikbaar."
            />
            
            <SectionEditorModal
                isOpen={openModal === 'zoekprofiel'}
                onClose={() => setOpenModal(null)}
                title="Zoekprofiel"
                value={tpData.zoekprofiel || ''}
                onChange={(v) => updateField('zoekprofiel', v)}
                onAutofill={genZoekprofiel}
                onRewrite={() => rewriteInMyStyle('zoekprofiel', tpData.zoekprofiel || '')}
                isAutofilling={busy.zoekprofiel}
                isRewriting={rewriting.zoekprofiel}
                placeholder="Laat AI dit genereren uit alle documenten — of pas handmatig aan."
            />
            
            
            <SectionEditorModal
                isOpen={openModal === 'ad-advies'}
                onClose={() => setOpenModal(null)}
                title="AD advies over passende arbeid"
                value={tpData.advies_ad_passende_arbeid || ''}
                onChange={(v) => updateField('advies_ad_passende_arbeid', v)}
                onAutofill={genAdAdviesPassendeArbeid}
                onRewrite={() => rewriteInMyStyle('advies_ad_passende_arbeid', tpData.advies_ad_passende_arbeid || '')}
                isAutofilling={busy.adAdvies}
                isRewriting={rewriting.advies_ad_passende_arbeid}
                placeholder="Laat AI dit genereren uit AD rapport, FML en IZP documenten — of pas handmatig aan."
            />
            
            <SectionEditorModal
                isOpen={openModal === 'pow'}
                onClose={() => setOpenModal(null)}
                title="Perspectief op Werk (PoW-meter)"
                value={tpData.pow_meter || ''}
                onChange={(v) => updateField('pow_meter', v)}
                placeholder="Laat de werknemer dit invullen"
            />
            
            <SectionEditorModal
                isOpen={openModal === 'plaatsbaarheid'}
                onClose={() => setOpenModal(null)}
                title="Visie op plaatsbaarheid"
                value={tpData.visie_plaatsbaarheid || ''}
                onChange={(v) => updateField('visie_plaatsbaarheid', v)}
                onAutofill={genVisiePlaatsbaarheid}
                onRewrite={() => rewriteInMyStyle('visie_plaatsbaarheid', tpData.visie_plaatsbaarheid || '')}
                isAutofilling={busy.plaatsbaarheid}
                isRewriting={rewriting.visie_plaatsbaarheid}
                placeholder="Laat AI dit genereren uit alle documenten — of pas handmatig aan."
            />

            {/* RIGHT: preview (A4 look) */}
            <TPPreviewWrapper>
                <PaginatedPreview sections={sectionsArr} />
            </TPPreviewWrapper>
        </div>
    );
}

/* ---------- small helpers (UI) ---------- */

// Helper function to format bold/italic
function formatInlineText(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let currentIdx = 0;
    
    // Regex to match **bold** or *italic*
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
        // Add text before match
        if (match.index > currentIdx) {
            parts.push(text.slice(currentIdx, match.index));
        }
        
        const matched = match[0];
        if (matched.startsWith('**') && matched.endsWith('**')) {
            // Bold
            parts.push(<strong key={match.index}>{matched.slice(2, -2)}</strong>);
        } else if (matched.startsWith('*') && matched.endsWith('*')) {
            // Italic
            parts.push(<em key={match.index}>{matched.slice(1, -1)}</em>);
        }
        
        currentIdx = match.index + matched.length;
    }
    
    // Add remaining text
    if (currentIdx < text.length) {
        parts.push(text.slice(currentIdx));
    }
    
    return parts.length > 0 ? parts : text;
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
            return t.startsWith('•') || t.startsWith('☑') || t.startsWith('✓') || t.startsWith('- ') || /^\d+\./.test(t);
        });
        
        if (hasBullets) {
            // Render mixed content: intro text + bullet list with Z logos
            return (
                <div key={paraIdx} className="mb-4">
                    {lines.map((line, idx) => {
                        const t = line.trim();
                        const isBullet = t.startsWith('•') || t.startsWith('☑') || t.startsWith('✓') || t.startsWith('- ') || /^\d+\./.test(t);
                        
                        if (isBullet) {
                            const content = t.replace(/^[•☑✓\-]\s*/, '').replace(/^\d+\.\s*/, '');
                            return (
                                <div key={idx} className="flex items-start gap-2 ml-4 mt-1">
                                    <img 
                                        src="/val-logo.jpg" 
                                        alt="" 
                                        style={{ width: '14px', height: '14px', marginTop: '3px', flexShrink: 0 }}
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
        
        // Regular paragraph - bold will come from **markdown** in the text itself
        return (
            <p key={paraIdx} className={paraIdx > 0 ? "mt-4" : ""}>
                {lines.map((line, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && <br/>}
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

function renderFormattedText(text: string): React.ReactNode {
    if (!text) return text;
    
    // Split by double newlines to get paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    return paragraphs.map((para, paraIdx) => {
        const lines = para.trim().split('\n');
        
        // Check if this paragraph is a list
        const isBulletList = lines.every(l => l.trim().startsWith('•'));
        const isNumberedList = lines.every(l => /^\d+\./.test(l.trim()));
        
        if (isBulletList || isNumberedList) {
            // Render as list
            const ListTag = isBulletList ? 'ul' : 'ol';
            return (
                <ListTag key={paraIdx} className="ml-4 mb-4 space-y-1">
                    {lines.map((line, idx) => {
                        const content = line.replace(/^[•\d+\.]\s*/, '');
                        return <li key={idx}>{formatInlineText(content)}</li>;
                    })}
                </ListTag>
            );
        }
        
        // Regular paragraph
        return (
            <p key={paraIdx} className={paraIdx > 0 ? "mt-4" : ""}>
                {lines.map((line, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && <br/>}
                        {formatInlineText(line)}
                    </React.Fragment>
                ))}
            </p>
        );
    });
}

function SectionCard({ 
    title, 
    content, 
    onClick,
    isReadOnly 
}: { 
    title: string; 
    content?: string; 
    onClick: () => void;
    isReadOnly?: boolean;
}) {
    const preview = content 
        ? content.substring(0, 100) + (content.length > 100 ? '...' : '')
        : '— nog niet ingevuld —';
        
    return (
        <button
            onClick={onClick}
            className="w-full text-left p-4 border border-border rounded-lg hover:bg-muted/50 hover:border-primary transition group"
        >
            <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-sm group-hover:text-primary">
                    {title}
                </h3>
                {isReadOnly && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        Alleen-lezen
                    </span>
                )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
                {preview}
            </p>
        </button>
    );
}

function SectionHeader({
    title,
    actionLabel,
    onAction,
    disabled,
    onRewrite,
    rewriteDisabled,
    fieldName,
    currentText,
}: {
    title: string;
    actionLabel: string;
    onAction: () => void;
    disabled?: boolean;
    onRewrite?: () => void;
    rewriteDisabled?: boolean;
    fieldName?: string;
    currentText?: string;
}) {
    const canRewrite = onRewrite && currentText && currentText.trim().length > 0;
    
    return (
        <div className="flex items-center justify-between mt-6 mb-1">
            <label className="block text-sm font-semibold">{title}</label>
            <div className="flex gap-2">
                <Button
                    onClick={onAction}
                    disabled={disabled}
                    size="sm"
                    variant="secondary"
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                    {actionLabel}
                </Button>
                {canRewrite && (
                    <Button
                        onClick={onRewrite}
                        disabled={rewriteDisabled}
                        size="sm"
                        variant="secondary"
                        className="bg-success-500 text-white hover:bg-success-600"
                        title="Herschrijf in mijn stijl"
                    >
                        {rewriteDisabled ? "Herschrijf..." : "Mijn Stijl"}
                    </Button>
                )}
            </div>
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
                                <div className={paperText}>
                                    {s.key.startsWith('act-') ? (
                                        <ActivityBody 
                                            activityId={s.key.replace('act-', '')} 
                                            bodyText={s.text} 
                                            className=""
                                        />
                                    ) : s.key === 'vlb' || s.key === 'wk' ? (
                                        renderTextWithLogoBullets(s.text, false)
                                    ) : s.key === 'plaats' ? (
                                        renderTextWithLogoBullets(s.text, true)
                                    ) : (
                                        renderFormattedText(s.text)
                                    )}
                                </div>
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
                                    <div className={subtle}>{renderFormattedText(s.text)}</div>
                                ) : s.variant === "block" && s.text ? (
                                    <>
                                        <div className={blockTitle}>{s.title}</div>
                                        <div className={paperText}>
                                            {s.key.startsWith('act-') ? (
                                                <ActivityBody 
                                                    activityId={s.key.replace('act-', '')} 
                                                    bodyText={s.text} 
                                                    className=""
                                                />
                                            ) : s.key === 'vlb' || s.key === 'wk' ? (
                                                renderTextWithLogoBullets(s.text, false)
                                            ) : s.key === 'plaats' ? (
                                                renderTextWithLogoBullets(s.text, true)
                                            ) : (
                                                renderFormattedText(s.text)
                                            )}
                                        </div>
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