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
  'Naast de functies die de arbeidsdeskundige mogelijk als passend beschouwt, denkt de loopbaanadviseur ook aan onderstaande functies*:';

/** AD present but no named functions in advies. */
export const AD_NO_FUNCTIES_INTRO =
  'In het arbeidsdeskundig rapport zijn geen passende functies benoemd. De hieronder opgenomen functies zijn door de loopbaanadviseur geselecteerd op basis van het belastbaarheidsprofiel en de informatie uit het intakegesprek.';

/** Concept AD present with named functions — footnote asterisk links to FUNCTIE_FOOTER. */
export const CONCEPT_AD_FUNCTIES_INTRO =
  'Naast de functies die de concept arbeidsdeskundige mogelijk als passend beschouwt, denkt de loopbaanadviseur ook aan onderstaande functies*:';

/** Concept AD present but no named functions in advies. */
export const CONCEPT_AD_NO_FUNCTIES_INTRO =
  'In het concept arbeidsdeskundig rapport zijn geen passende functies benoemd. De hieronder opgenomen functies zijn door de loopbaanadviseur geselecteerd op basis van het belastbaarheidsprofiel en de informatie uit het intakegesprek.';

/** No AD narrative, FML/IZP/LAB present. */
export const NO_AD_BELASTBAARHEID_INTRO =
  'Er is geen arbeidsdeskundig rapport beschikbaar. De hieronder opgenomen functies zijn door de loopbaanadviseur geselecteerd op basis van het belastbaarheidsprofiel en de informatie uit het intakegesprek.';

/** No AD narrative and no belastbaarheidsprofiel. */
export const NO_AD_NO_BELASTBAARHEID_INTRO =
  'Er zijn geen arbeidsdeskundig rapport en belastbaarheidsprofiel beschikbaar. De hieronder opgenomen functies zijn door de loopbaanadviseur geselecteerd op basis van de informatie uit het intakegesprek.';

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

export const SELECTION_PROCESS_V10 = `
Stap 1 — Analyseer persoonlijk profiel: opleiding, werkervaring, competenties, interesses, werk-/denkniveau, taal, digitale vaardigheden, mobiliteit.
Stap 2 — Analyseer zoekprofiel (leidend). Wanneer afwezig: leid af uit opleiding, werkervaring en persoonlijk profiel.
Stap 3 — Controle belastbaarheid per functie: persoonlijk/sociaal functioneren, fysieke omgeving, dynamische handelingen, statische houdingen, werktijden; plus staan, lopen, tillen/dragen, buigen, knielen/hurken, reiken, houdingsafwisseling, werktempo, omgevingseisen. Bij één wezenlijke overschrijding: afwijzen. Werk conservatief.
Stap 4 — AD-controle: functies of richtingen van arbeidsdeskundige nooit opnieuw noemen (geen synoniemen, vergelijkbare functies, vrijwel identieke werkzaamheden). Respecteer ook de structured list ad_uitsluiting_functies in context.
Stap 5 — Arbeidsmarkttoets: regulier, Nederlandse arbeidsmarkt, voldoende vacatures, realistisch bemiddelbaar, maximaal circa zes maanden scholing.
Stap 6 — Praktijktoets: functies waarin regelmatig langdurig staan/lopen, productietempo, assemblage, productiewerk, kwaliteitscontrole, zwaar tillen, veel bukken/traplopen/reiken of structurele fysieke belasting: afwijzen. Bij twijfel afwijzen.
Stap 7 — Onderlinge controle: exact vijf NIEUWE functiesuggesties per ronde. De vijf concrete suggesties moeten duidelijk verschillende roltypen zijn (bijv. contactgericht vs planning/organisatie vs specialistisch/intern), niet herschrijvingen van dezelfde admin/backoffice-idee. Zelfde zoekprofiel-wereld mag; onderlinge titel en kerntaak moeten duidelijk verschillen. Per toelichting een ander passendheidsargument (opleiding vs werkervaring vs specifieke skill); herhaal niet dezelfde prikkelarm/lage druk/geen deadlines-formulering. Nooit behouden of afgewezen namen (of synoniemen) opnieuw voorstellen.
Stap 8 — Eindcontrole: volledig passend binnen belastbaarheid, aansluitend bij profiel en zoekprofiel, niet door AD genoemd, geen synoniemen, regulier en kansrijk. Het eindresultaat in het trajectplan mag een variabel aantal behouden functies bevatten (≥1).
`.trim();

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
- Suggestieronde: exact vijf NIEUWE functies
- Eindresultaat trajectplan: variabel aantal behouden functies (≥1)
- Maximaal één zin toelichting per functie
- Geen AD-titels of synoniemen (inclusief ad_uitsluiting_functies)
- Geen overlap met behouden of afgewezen functies
- Vijf suggesties = verschillende roltypen (geen near-clones)
- Toelichtingen niet copy-paste (verschillende passendheidsargumenten)
- Passend binnen belastbaarheid en zoekprofiel
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
