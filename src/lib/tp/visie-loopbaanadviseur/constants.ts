/** Delimiters for internal subsections in visie_loopbaanadviseur markdown. */
export const TOELICHTING_DELIMITER = '<<<TOELICHTING>>>';
export const FUNCTIES_DELIMITER = '<<<FUNCTIES>>>';

export const TOELICHTING_SUBHEADING = 'Toelichting';
export const FUNCTIES_SUBHEADING = 'Mogelijk passende functies';

export type DocumentScenario =
  | 'ad_with_functies'
  | 'ad_no_functies'
  | 'concept_ad_with_functies'
  | 'concept_ad_no_functies'
  | 'belastbaarheid_only'
  | 'intake_only';

export const TOELICHTING_MAN =
  'Gezien de opleiding, werkervaring en de vastgestelde medische beperkingen acht ValentineZ de kansen van de werknemer op de vrije arbeidsmarkt op dit moment "voldoende". Mocht de belastbaarheid van de werknemer in de toekomst verbeteren, dan zullen ook zijn kansen op de arbeidsmarkt toenemen. In dat geval kunnen andere functies worden onderzocht als mogelijke opties voor passend werk.';

export const TOELICHTING_VROUW =
  'Gezien de opleiding, werkervaring en de vastgestelde medische beperkingen acht ValentineZ de kansen van de werknemer op de vrije arbeidsmarkt op dit moment "voldoende". Mocht de belastbaarheid van de werknemer in de toekomst verbeteren, dan zullen ook haar kansen op de arbeidsmarkt toenemen. In dat geval kunnen andere functies worden onderzocht als mogelijke opties voor passend werk.';

export const TOELICHTING_ONBEKEND =
  'Gezien de opleiding, werkervaring en de vastgestelde medische beperkingen acht ValentineZ de kansen van de werknemer op de vrije arbeidsmarkt op dit moment "voldoende". Mocht de belastbaarheid van de werknemer in de toekomst verbeteren, dan zullen ook de kansen van de werknemer op de arbeidsmarkt toenemen. In dat geval kunnen andere functies worden onderzocht als mogelijke opties voor passend werk.';

/** AD present with named functions — footnote asterisk links to FUNCTIE_FOOTER. */
export const AD_FUNCTIES_INTRO =
  'Naast de functies die de arbeidsdeskundige mogelijk als passend beschouwt, denkt de loopbaanadviseur ook aan onderstaande functies:';

/** AD present but no named functions in advies. */
export const AD_NO_FUNCTIES_INTRO =
  'In het arbeidsdeskundig rapport zijn geen passende functies benoemd. De hieronder opgenomen functies zijn door de loopbaanadviseur geselecteerd op basis van het belastbaarheidsprofiel en de informatie uit het intakegesprek.';

/** Concept AD present with named functions — footnote asterisk links to FUNCTIE_FOOTER. */
export const CONCEPT_AD_FUNCTIES_INTRO =
  'Naast de functies die de arbeidsdeskundige in het concept arbeidsdeskundigrapport mogelijk als passend beschouwt, denkt de loopbaanadviseur ook aan onderstaande functies:';

/** Concept AD present but no named functions in advies. */
export const CONCEPT_AD_NO_FUNCTIES_INTRO =
  'In het concept arbeidsdeskundig rapport zijn geen passende functies benoemd. De hieronder opgenomen functies zijn door de loopbaanadviseur geselecteerd op basis van het belastbaarheidsprofiel en de informatie uit het intakegesprek.';

/** No AD narrative, FML/IZP/LAB present. */
export const NO_AD_BELASTBAARHEID_INTRO =
  'Er is geen arbeidsdeskundig rapport beschikbaar. De hieronder opgenomen functies zijn door de loopbaanadviseur geselecteerd op basis van het belastbaarheidsprofiel en de informatie uit het intakegesprek.';

/** No AD narrative and no belastbaarheidsprofiel. */
export const NO_AD_NO_BELASTBAARHEID_INTRO =
  'Er zijn geen arbeidsdeskundig rapport en belastbaarheidsprofiel beschikbaar. Hierdoor zijn er momenteel geen functies geduid door de loopbaanadviseur. Indien er een belastbaarheidsprofiel beschikbaar wordt gesteld, zullen er passende functies geduid worden.';

export const FUNCTIE_FOOTER =
  '*Dit is geen limitatieve opsomming. De genoemde functies zijn alleen onder voorwaarden passend. Ook andere werkmogelijkheden zullen in het 2e spoortraject onderzocht worden. Voor alle werkzaamheden geldt dat rekening gehouden moet worden met de belastbaarheid zoals beschreven in de meest recente FML/ IZP/ LAB.';

export const DEFAULT_VISIE_LOOPBAANADVISEUR_MODEL = 'gpt-5.6-sol';

export const GENERATION_FALLBACK =
  '[Visie van loopbaanadviseur — AI generatie mislukt, handmatig invullen vereist]';

export const EN_SOORTGELIJK = 'En soortgelijk';

/** AI suggestion batch size per generation round. */
export const FUNCTIE_SUGGESTION_BATCH_SIZE = 5;

/** Minimum kept functies required to finalize into the trajectplan. */
export const FUNCTIE_FINAL_MIN_COUNT = 1;

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

export const SELECTION_PROCESS_V12 = `
Stap 1 — Profielbrug (EERST): kies functies die aantoonbaar aansluiten op opleiding, recente werkervaring en/of zoekprofiel. Elke suggestie moet een concreet anker uit het dossier hebben.
Stap 2 — Arbeidsmarkttoets: prefer common, findable Nederlandse vacaturetitels (kort, standaard; maximaal circa 1–2 modifiers). Geen niche-samenstellingen, geen verzonnen of zeldzame titels, geen over-specifieke stacks.
Stap 3 — Zoekprofiel: respecteer zoekrichting en niveau; wanneer zoekprofiel ontbreekt, leid af uit opleiding en werkervaring (niet alleen uit belastbaarheid).
Stap 4 — Controle belastbaarheid per functie: persoonlijk/sociaal functioneren, fysieke omgeving, dynamische handelingen, statische houdingen, werktijden; plus staan, lopen, tillen/dragen, buigen, knielen/hurken, reiken, houdingsafwisseling, werktempo, omgevingseisen. Bij één wezenlijke overschrijding: afwijzen. Werk conservatief — maar verzin géén veilige niche-titels alleen om FML te omzeilen.
Stap 5 — AD-controle: functies of richtingen van arbeidsdeskundige nooit opnieuw noemen (geen synoniemen, vergelijkbare functies, vrijwel identieke werkzaamheden). Respecteer ook ad_uitsluiting_functies en behouden/afgewezen namen.
Stap 6 — Praktijktoets: functies waarin regelmatig langdurig staan/lopen, productietempo, assemblage, productiewerk, kwaliteitscontrole, zwaar tillen, veel bukken/traplopen/reiken of structurele fysieke belasting: afwijzen. Bij twijfel afwijzen.
Stap 7 — Onderlinge controle: exact vijf NIEUWE suggesties. Verschillende roltypen én verschillende ankers (niet vijf limitation-only admin-clones). Per toelichting een ander passendheidsargument gekoppeld aan het anker; herhaal niet dezelfde prikkelarm/lage druk-formulering.
Stap 8 — Eindcontrole: plaatsbaar en realistisch, geworteld in profiel, passend binnen belastbaarheid, niet door AD genoemd, regulier en kansrijk. Eindresultaat trajectplan: variabel aantal behouden functies (≥1), behalve scenario zonder AD én zonder belastbaarheidsprofiel (geen functies).
`.trim();

/** @deprecated Use SELECTION_PROCESS_V12 */
export const SELECTION_PROCESS_V10 = SELECTION_PROCESS_V12;

export const AD_SYNONYM_EXAMPLES = `
assemblage → geen assemblagemedewerker
kwaliteitscontrole → geen kwaliteitscontroleur
productie → geen productiemedewerker
operator → geen machinebediende
receptie → geen receptionist wanneer frontoffice al genoemd is
klantcontact / callcenter → geen backoffice-klantcontact of frontoffice-receptie wanneer AD dat al noemt
administratie → geen secretarieel werk, boekenwerk of administratief medewerker als AD-variant
planning → geen roostermedewerker of planner wanneer AD planning al noemt
reisorganisatie / toerisme → geen bijna-identieke reisbureau- of toerismetitels als AD die al noemt
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
- Suggestieronde: exact vijf NIEUWE functies (behalve intake_only)
- Eindresultaat trajectplan: variabel aantal behouden functies (≥1), of geen functies bij intake_only
- Maximaal één zin toelichting per functie
- Elke functie: anker (opleiding|werkervaring|zoekprofiel) + anker_detail uit dossier
- Korte, gangbare NL-titels (geen niche-samenstellingen)
- Geen AD-titels of synoniemen (inclusief ad_uitsluiting_functies)
- Geen overlap met behouden of afgewezen functies
- Vijf suggesties = verschillende roltypen én ankers
- Toelichtingen niet copy-paste / niet alleen prikkelarm-belastbaarheid
- Passend binnen belastbaarheid en zoekprofiel; realistisch plaatsbaar
`.trim();

/** Shared banned toelichting phrase families (quality gate). */
export const TOELICHTING_CLONE_PHRASES = [
  'prikkelarm',
  'lage druk',
  'geen deadlines',
  'productiedruk',
  'zonder hoge tempo',
  'zonder hoog tempo',
  'strakke deadlines',
  'weinig prikkels',
] as const;
