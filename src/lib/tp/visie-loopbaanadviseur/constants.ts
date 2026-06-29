/** Delimiters for internal subsections in visie_loopbaanadviseur markdown. */
export const TOELICHTING_DELIMITER = '<<<TOELICHTING>>>';
export const FUNCTIES_DELIMITER = '<<<FUNCTIES>>>';

export const TOELICHTING_SUBHEADING = 'Toelichting';
export const FUNCTIES_SUBHEADING = 'Mogelijk passende functies';

export type DocumentScenario = 'ad' | 'belastbaarheid_only' | 'intake_only';

export const TOELICHTING_MAN =
  'Gezien de opleiding, werkervaring en de vastgestelde medische beperkingen acht ValentineZ de kansen van de werknemer op de vrije arbeidsmarkt op dit moment "voldoende". Mocht de belastbaarheid van de werknemer in de toekomst verbeteren, dan zullen ook zijn kansen op de arbeidsmarkt toenemen. In dat geval kunnen andere functies worden onderzocht als mogelijke opties voor passend werk.';

export const TOELICHTING_VROUW =
  'Gezien de opleiding, werkervaring en de vastgestelde medische beperkingen acht ValentineZ de kansen van de werknemer op de vrije arbeidsmarkt op dit moment "voldoende". Mocht de belastbaarheid van de werknemer in de toekomst verbeteren, dan zullen ook haar kansen op de arbeidsmarkt toenemen. In dat geval kunnen andere functies worden onderzocht als mogelijke opties voor passend werk.';

export const TOELICHTING_ONBEKEND =
  'Gezien de opleiding, werkervaring en de vastgestelde medische beperkingen acht ValentineZ de kansen van de werknemer op de vrije arbeidsmarkt op dit moment "voldoende". Mocht de belastbaarheid van de werknemer in de toekomst verbeteren, dan zullen ook de kansen van de werknemer op de arbeidsmarkt toenemen. In dat geval kunnen andere functies worden onderzocht als mogelijke opties voor passend werk.';

/** V10 situation 1 — AD document present. */
export const AD_FUNCTIES_INTRO =
  'Naast de functies die de arbeidsdeskundige mogelijk als passend beschouwt, denkt de loopbaanadviseur ook aan onderstaande functies:';

/** V10 situation 2 — no AD, FML or IZP present. */
export const NO_AD_BELASTBAARHEID_INTRO =
  'Ten tijde van het opstellen van het trajectplan was ValentineZ niet in het bezit van een arbeidsdeskundig rapport. Op basis van het belastbaarheidsprofiel en het intakegesprek denkt de loopbaanadviseur aan onderstaande functies:';

/** V10 situation 3 — no AD, no FML, no IZP. */
export const NO_AD_NO_BELASTBAARHEID_INTRO =
  'Ten tijde van het opstellen van het trajectplan was ValentineZ niet in het bezit van een arbeidsdeskundig rapport en/of belastbaarheidsprofiel. Op basis van het intakegesprek denkt de loopbaanadviseur aan onderstaande functies:';

export const FUNCTIE_FOOTER =
  '*Dit is geen limitatieve opsomming. De genoemde functies zijn alleen onder voorwaarden passend. Ook andere werkmogelijkheden zullen in het 2e spoortraject onderzocht worden. Voor alle werkzaamheden geldt dat rekening gehouden moet worden met de belastbaarheid zoals beschreven in de meest recente FML/ IZP/ LAB.';

export const DEFAULT_VISIE_LOOPBAANADVISEUR_MODEL = 'gpt-5.1-2025-11-13';

export const GENERATION_FALLBACK =
  '[Visie van loopbaanadviseur — AI generatie mislukt, handmatig invullen vereist]';

export const EN_SOORTGELIJK = 'En soortgelijk';

export const SOURCE_HIERARCHY_V10 = `
Belastbaarheid (gebruik meest recente bron):
1. meest recente FML
2. meest recente IZP
3. belastbaarheid uit arbeidsdeskundig rapport (alleen wanneer geen losse FML/IZP aanwezig is)
4. intakeformulier (alleen wanneer geen FML, IZP én geen AD aanwezig zijn)

Wanneer FML of IZP aanwezig is: vermeld datum volledig, naam arts, superviserend bedrijfsarts indien vermeld.
Gebruik nooit een oudere FML wanneer een recentere aanwezig is.
`.trim();

export const DOCUMENT_SCOPE_HINT = `
DOCUMENTEN:
- intakeformulier (verplicht)
- meest recente FML
- meest recente IZP
- arbeidsdeskundig rapport
Context uit dossier: zoekprofiel (leidend), persoonlijk profiel, advies AD passende arbeid (uitsluitingslijst).
Gebruik nooit aannames.
`.trim();

export const SELECTION_PROCESS_V10 = `
Stap 1 — Analyseer persoonlijk profiel: opleiding, werkervaring, competenties, interesses, werk-/denkniveau, taal, digitale vaardigheden, mobiliteit.
Stap 2 — Analyseer zoekprofiel (leidend). Wanneer afwezig: leid af uit opleiding, werkervaring en persoonlijk profiel.
Stap 3 — Controle belastbaarheid per functie: persoonlijk/sociaal functioneren, fysieke omgeving, dynamische handelingen, statische houdingen, werktijden; plus staan, lopen, tillen/dragen, buigen, knielen/hurken, reiken, houdingsafwisseling, werktempo, omgevingseisen. Bij één wezenlijke overschrijding: afwijzen. Werk conservatief.
Stap 4 — AD-controle: functies of richtingen van arbeidsdeskundige nooit opnieuw noemen (geen synoniemen, vergelijkbare functies, vrijwel identieke werkzaamheden).
Stap 5 — Arbeidsmarkttoets: regulier, Nederlandse arbeidsmarkt, voldoende vacatures, realistisch bemiddelbaar, maximaal circa zes maanden scholing.
Stap 6 — Praktijktoets: functies waarin regelmatig langdurig staan/lopen, productietempo, assemblage, productiewerk, kwaliteitscontrole, zwaar tillen, veel bukken/traplopen/reiken of structurele fysieke belasting: afwijzen. Bij twijfel afwijzen.
Stap 7 — Onderlinge controle: exact vier functies, duidelijk verschillend in sector, werkzaamheden, werkomgeving, competenties.
Stap 8 — Eindcontrole: volledig passend binnen belastbaarheid, aansluitend bij profiel en zoekprofiel, niet door AD genoemd, geen synoniemen, regulier en kansrijk.
`.trim();

export const AD_SYNONYM_EXAMPLES = `
assemblage → geen assemblagemedewerker
kwaliteitscontrole → geen kwaliteitscontroleur
productie → geen productiemedewerker
operator → geen machinebediende
receptie → geen receptionist wanneer frontoffice al genoemd is
`.trim();

export const PRAKTIJKTOETS_AVOID = [
  'langdurig staan',
  'langdurig lopen',
  'productietempo',
  'assemblage',
  'productiewerk',
  'kwaliteitscontrole',
  'zwaar tillen',
  'veel bukken',
  'veel traplopen',
  'veel reiken',
  'structureel fysieke belasting',
] as const;

export const EINDCONTROLE_CHECKLIST = `
- Juiste vaste toelichting (systeem)
- Juiste inleidende zin functies (systeem)
- Exact vier functies + vierde "En soortgelijk"
- Maximaal één zin toelichting per functie
- Geen AD-synoniemen
- Functies onderling verschillend
- Passend binnen belastbaarheid en zoekprofiel
`.trim();
