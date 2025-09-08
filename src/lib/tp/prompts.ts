type BuildArgs = {
  wantSections: string[];
  employee: any;
  details: any;
  meta: any;
  sources: { intake: string; ad: string; fml: string };
};

export const SYSTEM_BASE = `
Je bent een Nederlandse re-integratie- en rapportage-assistent.
- Schrijf zakelijk, neutraal, consistent met de door ValentineZ aangeleverde voorbeeld-TP's.
- Respecteer lengte en structuur per sectie.
- Noem geen diagnoses of medische details. Verwijs neutraal naar FML/AD.
- Gebruik 'werknemer' i.p.v. naam binnen de tekst.
- Lever strikt geldige JSON terug volgens schema. Geen extra uitleg.
`;

export function buildUserPrompt({ wantSections, employee, details, meta, sources }: BuildArgs) {
  const STYLE_NOTES = `
SECTIE-STIJL:
- Inleiding: 2–5 korte alinea's. Functiecontext + reden 2e spoor, afsluiten met NB-blok als AD ontbreekt.
- Persoonlijk profiel: 1–2 alinea’s, cv-achtig (opleiding, ervaring, rijbewijs/taal/pc), feitelijk.
- Zoekprofiel: zet belastbaarheid (op basis van FML) om in werkcontext/taak-criteria. Zittend werk/variatie/tilgrenzen etc.
- Visie op plaatsbaarheid: benoem 3–5 functies. Per functie: "Passend omdat:" (1–3 bullets) en "Mits:" (2–5 bullets).
- Prognose bedrijfsarts: 1 zin met datum + prognose uit FML/AD.
- Advies AD passende arbeid: 1–3 zinnen (kernadvies).
- PoW-meter: 1 zin alleen als info aanwezig is; anders leeg laten.
`;

  const RULES = `
BRON-PRIORITEIT:
- Inleiding: AD > Intake.
- Prognose: FML > AD.
- Sociale achtergrond & Visie werknemer & Praktische belemmeringen: uit Intake.
- Zoekprofiel: FML-constraints + afleiden context.
- Advies AD passende arbeid: uit AD (kort).
- NB-blok: schrijf "N.B." als AD ontbreekt of nog niet opgesteld.
- Laat velden leeg als info echt ontbreekt (geen hallucinaties).
`;

  const DATA = {
    wantSections,
    meta,
    employee,
    details,
    sources: {
      intake_excerpt: (sources.intake || "").slice(0, 12000),
      ad_excerpt: (sources.ad || "").slice(0, 12000),
      fml_excerpt: (sources.fml || "").slice(0, 12000)
    }
  };

  return `
VOLG DEZE STIJL EN REGELS.
${STYLE_NOTES}
${RULES}

DATA:
${JSON.stringify(DATA, null, 2)}

TAKEN:
- Genereer ALLEEN de gevraagde secties ("wantSections") in "sections" (strings).
- Houd je strikt aan het JSON schema.`;
}
