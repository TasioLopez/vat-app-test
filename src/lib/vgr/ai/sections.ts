import {
  VGR_ACTIVATIE_OPTIONS,
  VGR_KWALITEITEN_OPTIONS,
  VGR_MOTIVATIE_OPTIONS,
  VGR_PERSONALITY_TRAITS,
  VGR_SCHOLING_OPTIONS,
  VGR_SOLLICITATIE_OPTIONS,
  type VGRInterventionOption,
} from '@/lib/vgr/content';
import { VGR_FML_RUBRIEKEN, type VGRBody, type VGRData, type VGRFmlRubriek } from '@/lib/vgr/schema';

/**
 * Per-section AI generation definitions.
 *
 * Every section produces the same envelope:
 *   { fields: { <key>: string }, bronnen: string[], ontbrekende_informatie: string[], waarschuwingen: string[] }
 * `fields` keys are section-specific and are mapped to a body patch by `toPatch`.
 * Only text-like values are generated; ja/nee switches, tredes and checkboxes stay adviser decisions
 * (the model may *suggest* them in the dedicated `suggesties` field, never set them).
 */

export type VGRAiSectionId =
  | 'benutbare_mogelijkheden'
  | 'praktische_belemmeringen'
  | 'doelstelling_traject'
  | 'persoonlijk_profiel'
  | 'belastbaarheidsprofiel'
  | 'bijstellingen_belastbaarheid'
  | 'zoekprofiel'
  | 'inzet_houding'
  | 'interventies_motivatie'
  | 'kwaliteiten_onderzoek'
  | 'scholing'
  | 'sollicitatie_vaardigheden'
  | 'interventies_activatie'
  | 'pow'
  | 'visie_plaatsbaarheid';

export type VGRAiFieldDef = { key: string; description: string };

export type VGRAiEnvelope = {
  fields: Record<string, string>;
  suggesties: Record<string, string>;
  bronnen: string[];
  ontbrekende_informatie: string[];
  waarschuwingen: string[];
};

export type VGRAiSectionDef = {
  id: VGRAiSectionId;
  label: string;
  /** Which source document types are most relevant (used for ordering/limiting uploads). */
  preferredDocTypes: string[];
  /** Section-specific instructions appended to the house style. */
  instructions: string;
  /** Text fields to generate; may depend on current data (e.g. selected interventions). */
  fields: (data: VGRData) => VGRAiFieldDef[];
  /** Non-text suggestions (ja/nee, trede, rubrieken) — adviser decides. */
  suggestions?: VGRAiFieldDef[];
  /** Map generated fields to a body patch. */
  toPatch: (fields: Record<string, string>, data: VGRData) => Partial<Record<keyof VGRBody, Record<string, unknown>>>;
};

const BA_DOCS = ['fml_izp', 'spreek_reportage', 'ad_rapportage'];
const VGR_FML_RUBRIEKEN_HINT = VGR_FML_RUBRIEKEN.join(', ');

function interventionFields(section: keyof VGRBody, options: VGRInterventionOption[]) {
  return (data: VGRData): VGRAiFieldDef[] => {
    const sec = data.body[section] as VGRBody['interventies_motivatie'];
    const selected = sec.selected.length ? sec.selected : [];
    return selected
      .map((id) => options.find((o) => o.id === id))
      .filter((o): o is VGRInterventionOption => Boolean(o))
      .map((o) => ({
        key: `toelichting__${o.id}`,
        description: `Persoonlijke toelichting bij "${o.heading}". ${o.instruction ?? ''} Beschrijf concreet wat in de rapportageperiode is gedaan en wat het heeft opgeleverd; 2–6 zinnen.`,
      }));
  };
}

function interventionPatch(section: keyof VGRBody) {
  return (fields: Record<string, string>, data: VGRData) => {
    const sec = data.body[section] as VGRBody['interventies_motivatie'];
    const blocks = { ...sec.blocks };
    for (const [k, v] of Object.entries(fields)) {
      if (!k.startsWith('toelichting__') || !v.trim()) continue;
      const id = k.slice('toelichting__'.length);
      blocks[id] = { ...(blocks[id] ?? { items: [], standaardtekst: true }), toelichting: v.trim() };
    }
    return { [section]: { blocks } } as Partial<Record<keyof VGRBody, Record<string, unknown>>>;
  };
}

const VERVOLG_FIELD: VGRAiFieldDef = {
  key: 'vervolg_activiteiten',
  description:
    'Alleen vullen als uit het dossier blijkt dat activiteiten uit deze fase niet (volledig) zijn uitgevoerd en in de volgende fase terugkomen; anders leeg laten.',
};

export const VGR_AI_SECTIONS: Record<VGRAiSectionId, VGRAiSectionDef> = {
  benutbare_mogelijkheden: {
    id: 'benutbare_mogelijkheden',
    label: 'Benutbare mogelijkheden',
    preferredDocTypes: BA_DOCS,
    instructions: `Haal de meest recente prognose, conclusie en advies van de bedrijfsarts LETTERLIJK uit de aangeleverde spreekuurrapportage / FML / IZP / AD-rapport. Geef per citaat ook de naam van de bedrijfsarts/arbeidsdeskundige en de datum van het document (YYYY-MM-DD). Niet parafraseren; geen eigen formulering. Als er geen bron is: leeg laten.`,
    fields: () => [
      { key: 'prognose_citaat', description: 'Letterlijk citaat prognose bedrijfsarts' },
      { key: 'prognose_bron_naam', description: 'Naam bedrijfsarts bij prognose' },
      { key: 'prognose_bron_datum', description: 'Datum document prognose (YYYY-MM-DD)' },
      { key: 'prognose_bron_type', description: 'Soort document (bijv. "de terugkoppeling van het medisch spreekuur", "het belastbaarheidsprofiel")' },
      { key: 'conclusie_citaat', description: 'Letterlijk citaat conclusie' },
      { key: 'conclusie_bron_naam', description: 'Naam bedrijfsarts bij conclusie' },
      { key: 'conclusie_bron_datum', description: 'Datum document conclusie (YYYY-MM-DD)' },
      { key: 'conclusie_bron_type', description: 'Soort document conclusie' },
      { key: 'advies_citaat', description: 'Letterlijk citaat advies' },
      { key: 'advies_bron_naam', description: 'Naam bedrijfsarts bij advies' },
      { key: 'advies_bron_datum', description: 'Datum document advies (YYYY-MM-DD)' },
      { key: 'advies_bron_type', description: 'Soort document advies' },
    ],
    suggestions: [{ key: 'heeft_benutbare_mogelijkheden', description: '"ja" of "nee" volgens de bedrijfsarts, anders ""' }],
    toPatch: (f, data) => {
      const cur = data.body.benutbare_mogelijkheden;
      const q = (p: 'prognose' | 'conclusie' | 'advies') => ({
        ...cur[p],
        citaat: f[`${p}_citaat`] || cur[p].citaat,
        bron_naam: f[`${p}_bron_naam`] || cur[p].bron_naam,
        bron_datum: f[`${p}_bron_datum`] || cur[p].bron_datum,
        bron_type: f[`${p}_bron_type`] || cur[p].bron_type,
      });
      return { benutbare_mogelijkheden: { prognose: q('prognose'), conclusie: q('conclusie'), advies: q('advies') } };
    },
  },

  praktische_belemmeringen: {
    id: 'praktische_belemmeringen',
    label: 'Praktische belemmeringen',
    preferredDocTypes: ['intakeformulier', 'spreek_reportage', 'ad_rapportage'],
    instructions: `Beschrijf praktische (niet-medische) belemmeringen voor spoor 2 die uit het dossier blijken: taal, vervoer/reisafstand, zorgtaken, financiën, digitale vaardigheden, woonsituatie, rijbewijs. Benoem de praktische gevolgen voor het traject en welke ondersteuning nodig is. Als er geen belemmeringen zijn: één feitelijke zin dat er geen praktische belemmeringen bekend zijn.`,
    fields: () => [{ key: 'toelichting', description: 'Toelichting praktische belemmeringen (1–2 alinea\'s)' }],
    suggestions: [{ key: 'aanwezig', description: '"ja" / "nee" / ""' }],
    toPatch: (f) => ({ praktische_belemmeringen: { toelichting: f.toelichting } }),
  },

  doelstelling_traject: {
    id: 'doelstelling_traject',
    label: 'Doelstelling traject',
    preferredDocTypes: BA_DOCS,
    instructions: `Werk de doelstelling uit. Waar passend starten vanuit: "Het doel van dit traject is een bevredigend resultaat. Een structurele werkhervatting die zo dicht mogelijk aansluit bij de resterende functionele mogelijkheden van werknemer." Daarna concreet maken: aansluiten bij actuele belastbaarheid, fase van het traject, spoor 1 én spoor 2 in samenhang, PoW-trede, zoekprofiel, actuele activiteiten en advies bedrijfsarts. Niet ambitieuzer dan het dossier rechtvaardigt. Bij activeringsfocus: activering als middel beschrijven (arbeidsritme, toetsen/uitbreiden belastbaarheid, structuur, werknemersvaardigheden) en sollicitaties niet als hoofdfocus presenteren.`,
    fields: () => [{ key: 'toelichting', description: 'Toelichting doelstelling (2–4 alinea\'s)' }],
    toPatch: (f) => ({ doelstelling_traject: { toelichting: f.toelichting } }),
  },

  persoonlijk_profiel: {
    id: 'persoonlijk_profiel',
    label: 'Persoonlijk profiel',
    preferredDocTypes: ['intakeformulier', 'cv', 'ad_rapportage'],
    instructions: `Schrijf of actualiseer het persoonlijk profiel: opleiding, werkervaring, laatste functie, competenties/kwaliteiten zoals die uit intake/CV/AD blijken, taalniveau, woon-/gezinssituatie voor zover relevant voor re-integratie, en de ontwikkeling in deze rapportageperiode. Geen medische details buiten wat de bedrijfsarts heeft vastgesteld. Als er een bestaand profiel is: behoud de inhoud, actualiseer en zet eerdere periode in verleden tijd.`,
    fields: () => [{ key: 'tekst', description: 'Persoonlijk profiel (3–6 alinea\'s)' }],
    toPatch: (f) => ({ persoonlijk_profiel: { tekst: f.tekst } }),
  },

  belastbaarheidsprofiel: {
    id: 'belastbaarheidsprofiel',
    label: 'Belastbaarheidsprofiel',
    preferredDocTypes: ['fml_izp', 'ad_rapportage', 'spreek_reportage'],
    instructions: `Beschrijf de belastbaarheid uitsluitend zoals vastgesteld in de FML / IZP / LAB (of AD-rapport als de FML daarin is opgenomen). Noem de datum en opsteller. Benoem per rubriek (${VGR_FML_RUBRIEKEN_HINT}) alleen beperkingen die letterlijk in het document staan. Geen eigen interpretatie. Als de FML-datum gelijk is aan de eerste ziektedag, meld dit als waarschuwing.`,
    fields: () => [
      { key: 'toelichting', description: 'Toelichting beperkingen per rubriek, feitelijk (1–3 alinea\'s)' },
      { key: 'datum', description: 'Datum FML/IZP/LAB (YYYY-MM-DD) of ""' },
      { key: 'auteur', description: 'Naam bedrijfsarts die het profiel opstelde of ""' },
      { key: 'kind', description: '"fml", "izp", "lab" of ""' },
    ],
    suggestions: [{ key: 'rubrieken', description: `Komma-gescheiden lijst van rubrieken met beperkingen, exact uit: ${VGR_FML_RUBRIEKEN.join(' | ')}` }],
    toPatch: (f, data) => {
      const cur = data.body.belastbaarheidsprofiel;
      const kind = f.kind === 'fml' || f.kind === 'izp' || f.kind === 'lab' ? f.kind : cur.kind;
      return {
        belastbaarheidsprofiel: {
          toelichting: f.toelichting || cur.toelichting,
          datum: f.datum || cur.datum,
          auteur: f.auteur || cur.auteur,
          kind,
        },
      };
    },
  },

  bijstellingen_belastbaarheid: {
    id: 'bijstellingen_belastbaarheid',
    label: 'Bijstellingen belastbaarheidsprofiel',
    preferredDocTypes: ['fml_izp', 'spreek_reportage', 'ad_rapportage'],
    instructions: `Bepaal of er in de rapportageperiode een bijgesteld belastbaarheidsprofiel is afgegeven (nieuwe FML/IZP/spreekuurterugkoppeling met gewijzigde belastbaarheid). Zo ja: beschrijf per rubriek wat er veranderd is t.o.v. het eerdere profiel, met datum en opsteller. Zo nee: één zin, bijvoorbeeld "Gedurende deze periode is er geen bijstelling bekend bij de loopbaanadviseur. De vastgestelde FML van [datum] blijft ongewijzigd van kracht."`,
    fields: () => [
      { key: 'toelichting_geen', description: 'Tekst als er GEEN bijstelling is; anders ""' },
      { key: 'bijstelling_toelichting', description: 'Tekst als er WEL een bijstelling is: wat is veranderd per rubriek; anders ""' },
      { key: 'bijstelling_datum', description: 'Datum bijstelling (YYYY-MM-DD) of ""' },
      { key: 'bijstelling_auteur', description: 'Opsteller bijstelling of ""' },
    ],
    suggestions: [{ key: 'aanwezig', description: '"ja" / "nee" / ""' }],
    toPatch: (f, data) => {
      const cur = data.body.bijstellingen_belastbaarheid;
      const patch: Record<string, unknown> = {};
      if (f.toelichting_geen) patch.toelichting_geen = f.toelichting_geen;
      if (f.bijstelling_toelichting) {
        const existing = cur.revisions[0];
        const rev = existing
          ? { ...existing, toelichting: f.bijstelling_toelichting, date: f.bijstelling_datum || existing.date, auteur: f.bijstelling_auteur || existing.auteur }
          : {
              id: `rev_ai_${Date.now().toString(36)}`,
              date: f.bijstelling_datum || data.vgr_meta.report_date,
              auteur: f.bijstelling_auteur || data.body.belastbaarheidsprofiel.auteur,
              kind: data.body.belastbaarheidsprofiel.kind,
              rubrieken: [] as VGRFmlRubriek[],
              toelichting: f.bijstelling_toelichting,
            };
        patch.revisions = existing ? [rev, ...cur.revisions.slice(1)] : [rev, ...cur.revisions];
      }
      return { bijstellingen_belastbaarheid: patch };
    },
  },

  zoekprofiel: {
    id: 'zoekprofiel',
    label: 'Zoekprofiel',
    preferredDocTypes: ['intakeformulier', 'ad_rapportage', 'fml_izp', 'cv'],
    instructions: `Beschrijf het zoekprofiel: richting(en) van passend werk, werkniveau, uren, reisafstand, werktijden, fysieke/mentale randvoorwaarden uit de FML, taalniveau en praktische randvoorwaarden. Maak onderscheid tussen onderzochte functies, mogelijk passende functies, functies waarop is gesolliciteerd en afgevallen functies — alleen voor zover uit het dossier bekend. Noem een functie niet passend zonder onderbouwing. Actualiseer het bestaande zoekprofiel in plaats van opnieuw te beginnen.`,
    fields: () => [{ key: 'tekst', description: 'Zoekprofiel (2–5 alinea\'s)' }],
    toPatch: (f) => ({ zoekprofiel: { tekst: f.tekst } }),
  },

  inzet_houding: {
    id: 'inzet_houding',
    label: 'Inzet en houding',
    preferredDocTypes: ['spreek_reportage', 'intakeformulier'],
    instructions: `Beschrijf feitelijk de inzet en houding van werknemer in de rapportageperiode: nakomen van afspraken, uitvoeren van huiswerkopdrachten, openheid, motivatie, zelfstandigheid versus benodigde ondersteuning. Geen kwalificaties als "zeer gemotiveerd" zonder onderbouwing uit het dossier. Bij beperkte inzet: inhoudelijke verklaring geven (belastbaarheid, taal, praktische belemmeringen).`,
    fields: () => [{ key: 'toelichting', description: 'Toelichting inzet en houding (1–3 alinea\'s)' }],
    suggestions: [{ key: 'werkt_mee', description: '"ja" / "nee" / ""' }],
    toPatch: (f) => ({ inzet_houding: { toelichting: f.toelichting } }),
  },

  interventies_motivatie: {
    id: 'interventies_motivatie',
    label: 'Interventies motivatie',
    preferredDocTypes: ['spreek_reportage', 'intakeformulier'],
    instructions: `Schrijf per aangevinkte interventie een persoonlijke toelichting: wat is besproken/gedaan, hoe reageerde werknemer, wat is het effect op motivatie en welke vervolgstap volgt. Alleen aangevinkte interventies krijgen tekst.`,
    fields: interventionFields('interventies_motivatie', VGR_MOTIVATIE_OPTIONS),
    toPatch: interventionPatch('interventies_motivatie'),
  },

  kwaliteiten_onderzoek: {
    id: 'kwaliteiten_onderzoek',
    label: 'Kwaliteiten en vaardigheden onderzoek',
    preferredDocTypes: ['extra', 'cv', 'intakeformulier'],
    instructions: `Schrijf per aangevinkt onderdeel een toelichting op basis van de aangeleverde testrapporten en het CV. Testresultaten alleen uit daadwerkelijk aangeleverde testen; percentages exact; nooit beroepen of kenmerken verzinnen. Voor de beroepenconclusie: onderbouw waarom beroepen uit de testen al dan niet passend zijn gelet op belastbaarheid, opleiding, ervaring en zoekprofiel. Als geen testrapport is aangeleverd: velden over testen leeg laten en dit melden.`,
    fields: (data) => [
      ...interventionFields('kwaliteiten_onderzoek', VGR_KWALITEITEN_OPTIONS)(data),
      ...(data.body.kwaliteiten_onderzoek.selected.includes('beroepen_arbeidsmarkt')
        ? [
            { key: 'beroepen', description: 'Beroepen uit de testen, één per regel, alleen uit aangeleverde testen; anders ""' },
            { key: 'beroepen_conclusie', description: 'Conclusie over passendheid van deze beroepen' },
          ]
        : []),
      ...(data.body.kwaliteiten_onderzoek.selected.includes('persoonlijkheidstest')
        ? VGR_PERSONALITY_TRAITS.flatMap((t) => [
            { key: `score__${t.key}`, description: `Percentage ${t.label} (alleen cijfers) uit de persoonlijkheidstest of ""` },
            { key: `tekst__${t.key}`, description: `Beschrijving ${t.label} in derde persoon volgens lager/gemiddeld/hoger-regel, of ""` },
          ])
        : []),
    ],
    toPatch: (f, data) => {
      const base = interventionPatch('kwaliteiten_onderzoek')(f, data).kwaliteiten_onderzoek ?? {};
      const cur = data.body.kwaliteiten_onderzoek;
      const patch: Record<string, unknown> = { ...base };
      if (f.beroepen?.trim()) {
        patch.beroepen = f.beroepen.split(/\r?\n|;/).map((s) => s.replace(/^[-•\d.\s]+/, '').trim()).filter(Boolean);
      }
      if (f.beroepen_conclusie?.trim()) patch.beroepen_conclusie = f.beroepen_conclusie.trim();
      const scores = { ...cur.persoonlijkheid_scores };
      const teksten = { ...cur.persoonlijkheid_teksten };
      let touched = false;
      for (const t of VGR_PERSONALITY_TRAITS) {
        const s = (f[`score__${t.key}`] ?? '').replace('%', '').trim();
        const tx = (f[`tekst__${t.key}`] ?? '').trim();
        if (s) {
          scores[t.key] = s;
          touched = true;
        }
        if (tx) {
          teksten[t.key] = tx;
          touched = true;
        }
      }
      if (touched) {
        patch.persoonlijkheid_scores = scores;
        patch.persoonlijkheid_teksten = teksten;
      }
      return { kwaliteiten_onderzoek: patch };
    },
  },

  scholing: {
    id: 'scholing',
    label: 'Scholingsmogelijkheden',
    preferredDocTypes: ['intakeformulier', 'cv', 'spreek_reportage'],
    instructions: `Schrijf per aangevinkt onderdeel een toelichting: welke scholing/cursus/taaltraining is onderzocht of gestart, waarom dit past bij het zoekprofiel en de belastbaarheid, en wat de stand van zaken is. Geen opleidingen noemen die niet uit het dossier blijken.`,
    fields: interventionFields('scholing', VGR_SCHOLING_OPTIONS),
    toPatch: interventionPatch('scholing'),
  },

  sollicitatie_vaardigheden: {
    id: 'sollicitatie_vaardigheden',
    label: 'Sollicitatie vaardigheden',
    preferredDocTypes: ['spreek_reportage', 'cv'],
    instructions: `Schrijf per aangevinkt onderdeel wat concreet is gedaan (CV, brief, LinkedIn, netwerkgesprekken, webinars, gesprekstraining) en het resultaat. Benoem benodigde ondersteuning (taal, digitale vaardigheden) feitelijk. Gebruik de sollicitatielijst in de context; verzin geen sollicitaties.`,
    fields: (data) => [...interventionFields('sollicitatie_vaardigheden', VGR_SOLLICITATIE_OPTIONS)(data), VERVOLG_FIELD],
    toPatch: (f, data) => {
      const base = interventionPatch('sollicitatie_vaardigheden')(f, data).sollicitatie_vaardigheden ?? {};
      return { sollicitatie_vaardigheden: { ...base, ...(f.vervolg_activiteiten?.trim() ? { vervolg_activiteiten: f.vervolg_activiteiten.trim() } : {}) } };
    },
  },

  interventies_activatie: {
    id: 'interventies_activatie',
    label: 'Interventies activatie en arbeidsbemiddeling',
    preferredDocTypes: ['spreek_reportage', 'ad_rapportage'],
    instructions: `Schrijf per aangevinkt onderdeel een toelichting. Beschrijf spoor 1 en spoor 2 in samenhang (welke werkzaamheden bij eigen werkgever, urenopbouw, welke spoor-2-activiteiten). Activering als middel (arbeidsritme, toetsen belastbaarheid, structuur). Jobhunting/wekelijks solliciteren alleen beschrijven op basis van de sollicitatielijst in de context. Als een onderdeel beperkt is uitgevoerd: geef de inhoudelijke verklaring.`,
    fields: (data) => [...interventionFields('interventies_activatie', VGR_ACTIVATIE_OPTIONS)(data), VERVOLG_FIELD],
    toPatch: (f, data) => {
      const base = interventionPatch('interventies_activatie')(f, data).interventies_activatie ?? {};
      return { interventies_activatie: { ...base, ...(f.vervolg_activiteiten?.trim() ? { vervolg_activiteiten: f.vervolg_activiteiten.trim() } : {}) } };
    },
  },

  pow: {
    id: 'pow',
    label: 'PoW-meter onderbouwing',
    preferredDocTypes: ['spreek_reportage', 'fml_izp', 'ad_rapportage'],
    instructions: `Schrijf de onderbouwing van de PoW-trede voor de actuele rapportagedatum. Beschrijf de trede in relatie tot de feitelijke situatie: werkzaamheden spoor 1, vrijwilligerswerk, activeringsactiviteiten, sollicitaties, arbeidsritme, urenopbouw, zelfstandigheid, belastbaarheid. Als groei binnen drie maanden realistisch is: naar welke trede en via welke concrete stappen. Anders: "Het doel voor de komende periode is het verder toetsen van de actuele belastbaarheid en, waar mogelijk, het stapsgewijs uitbreiden van de activiteiten. Op dit moment is moeilijk in te schatten of dit binnen drie maanden zal leiden tot een ontwikkeling naar een hogere trede van de PoW-meter." De PoW-meter volgt de feitelijke situatie, niet andersom. De adviseur bepaalt de trede; jij mag alleen een suggestie geven.`,
    fields: () => [
      { key: 'toelichting', description: 'Onderbouwing PoW-trede voor deze rapportage (2–4 alinea\'s)' },
      { key: 'werkzame_uren', description: 'Aantal werkzame uren per week (alleen cijfer) als dit uit het dossier blijkt, anders ""' },
      { key: 'werkzame_uren_context', description: 'Context uren, bijv. "2 x 4 uur aangepast werk bij eigen werkgever (spoor 1)" of ""' },
    ],
    suggestions: [
      { key: 'huidige_trede', description: 'Voorgestelde huidige trede 1–6 of ""' },
      { key: 'doel_trede', description: 'Voorgestelde doeltrede 1–6, of "onbekend" als niet in te schatten, of ""' },
    ],
    toPatch: (f, data) => {
      const cur = data.body.pow;
      const history = [...cur.history];
      const text = f.toelichting?.trim();
      if (text) {
        const idx = history.findIndex((m) => m.date === data.vgr_meta.report_date);
        if (idx >= 0) history[idx] = { ...history[idx], toelichting: text };
        else history.unshift({ id: `pow_ai_${Date.now().toString(36)}`, date: data.vgr_meta.report_date, toelichting: text });
      }
      return {
        pow: {
          history,
          ...(f.werkzame_uren?.trim() ? { werkzame_uren: f.werkzame_uren.trim() } : {}),
          ...(f.werkzame_uren_context?.trim() ? { werkzame_uren_context: f.werkzame_uren_context.trim() } : {}),
        },
      };
    },
  },

  visie_plaatsbaarheid: {
    id: 'visie_plaatsbaarheid',
    label: 'Visie op plaatsbaarheid',
    preferredDocTypes: ['ad_rapportage', 'fml_izp', 'extra', 'cv'],
    instructions: `1) Neem het advies van de arbeidsdeskundige over passende arbeid LETTERLIJK over uit het AD-rapport (met naam en datum). Als er geen AD-rapport is: leeg laten. 2) Geef mogelijk passende functies volgens de loopbaanadviseur — alleen functies die uit zoekprofiel, testen of AD-rapport volgen en die passen bij de belastbaarheid; één per regel. 3) Schrijf de conclusie: onderbouw waarom deze functies (onder voorwaarden) passend zijn en hoe realistisch plaatsing is gelet op belastbaarheid, arbeidsmarkt en fase van het traject. Voorzichtig formuleren.`,
    fields: () => [
      { key: 'ad_citaat', description: 'Letterlijk citaat AD-advies passende arbeid of ""' },
      { key: 'ad_bron_naam', description: 'Naam arbeidsdeskundige of ""' },
      { key: 'ad_bron_datum', description: 'Datum AD-rapport (YYYY-MM-DD) of ""' },
      { key: 'functies', description: 'Mogelijk passende functies, één per regel, of ""' },
      { key: 'conclusie', description: 'Conclusie visie loopbaanadviseur (1–3 alinea\'s)' },
    ],
    suggestions: [{ key: 'kansen', description: '"zeer_onwaarschijnlijk" | "matig" | "voldoende" | "goed" | ""' }],
    toPatch: (f, data) => {
      const cur = data.body.visie_plaatsbaarheid;
      const patch: Record<string, unknown> = {};
      if (f.ad_citaat || f.ad_bron_naam || f.ad_bron_datum) {
        patch.ad = {
          ...cur.ad,
          citaat: f.ad_citaat || cur.ad.citaat,
          bron_naam: f.ad_bron_naam || cur.ad.bron_naam,
          bron_datum: f.ad_bron_datum || cur.ad.bron_datum,
        };
      }
      if (f.functies?.trim()) {
        patch.functies = f.functies.split(/\r?\n|;/).map((s) => s.replace(/^[-•\d.\s]+/, '').trim()).filter(Boolean);
      }
      if (f.conclusie?.trim()) patch.conclusie = f.conclusie.trim();
      return { visie_plaatsbaarheid: patch };
    },
  },
};

export const VGR_AI_SECTION_IDS = Object.keys(VGR_AI_SECTIONS) as VGRAiSectionId[];

export function isVgrAiSectionId(v: unknown): v is VGRAiSectionId {
  return typeof v === 'string' && v in VGR_AI_SECTIONS;
}

/** Strict JSON schema for a section's envelope. */
export function buildVgrSectionSchema(def: VGRAiSectionDef, data: VGRData): Record<string, unknown> {
  const fieldDefs = def.fields(data);
  const suggestionDefs = def.suggestions ?? [];
  const obj = (defs: VGRAiFieldDef[]) => ({
    type: 'object',
    properties: Object.fromEntries(defs.map((d) => [d.key, { type: 'string', description: d.description }])),
    required: defs.map((d) => d.key),
    additionalProperties: false,
  });
  return {
    type: 'object',
    properties: {
      fields: obj(fieldDefs),
      suggesties: obj(suggestionDefs),
      bronnen: { type: 'array', items: { type: 'string' }, description: 'Welke documenten/contextdelen zijn gebruikt' },
      ontbrekende_informatie: { type: 'array', items: { type: 'string' } },
      waarschuwingen: { type: 'array', items: { type: 'string' }, description: 'Tegenstrijdigheden of risico\'s' },
    },
    required: ['fields', 'suggesties', 'bronnen', 'ontbrekende_informatie', 'waarschuwingen'],
    additionalProperties: false,
  };
}

export function parseVgrEnvelope(raw: unknown): VGRAiEnvelope {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const strMap = (v: unknown): Record<string, string> => {
    if (!v || typeof v !== 'object') return {};
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, typeof val === 'string' ? val : '']));
  };
  const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []);
  return {
    fields: strMap(o.fields),
    suggesties: strMap(o.suggesties),
    bronnen: strArr(o.bronnen),
    ontbrekende_informatie: strArr(o.ontbrekende_informatie),
    waarschuwingen: strArr(o.waarschuwingen),
  };
}

/** Strip anything that looks like template instruction / placeholder from generated prose. */
export function sanitizeGeneratedText(text: string): string {
  return text
    .replace(/\[[^\]]{0,80}\]/g, (m) => (/^\[(datum|naam|x|…|\.\.\.)/i.test(m) ? '' : m))
    .replace(/\s{2,}/g, ' ')
    .replace(/ \n/g, '\n')
    .trim();
}
