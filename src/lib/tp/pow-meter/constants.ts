/** Delimiter before inschaling JSON in pow_meter field. */
export const INSCHALING_DELIMITER = '<<<INSCHALING>>>';

/** Delimiter before toelichting text in pow_meter field. */
export const TOELICHTING_POW_DELIMITER = '<<<TOELICHTING_POW>>>';

export const DEFAULT_POW_METER_MODEL = 'gpt-5.1-2025-11-13';

export const GENERATION_FALLBACK =
  '[POW-meter inschaling — AI generatie mislukt, handmatig invullen vereist]';

export const POW_METER_FOOTNOTE =
  '* De Perspectief op Werk meter (POW-meter™) zegt niets over het opleidingsniveau of de werkervaring van de werknemer. Het is een momentopname, welke de huidige afstand tot de arbeidsmarkt grafisch weergeeft.';

export const PERSPECTIEF_OP_WERK_MISSION =
  'Als bureau voor re-integratie en loopbaanadvies is het onze doelstelling om bij te dragen aan een inclusieve arbeidsmarkt. Wij richten ons op het potentieel, perspectief en participatie van werknemers. Wij helpen mensen hun mogelijkheden te (her)ontdekken en nieuwe kansen en perspectieven te zien. En deze te benutten via ons netwerk en onze grondige kennis van de arbeidsmarkt, met als doel begeleiding naar een passende en duurzame werkplek.';

export const PERSPECTIEF_OP_WERK_POW_INTRO =
  'De POW-meter™ is een door ValentineZ ontwikkeld meetinstrument dat inzicht geeft in iemands afstand tot de arbeidsmarkt. Daarbij wordt rekening gehouden met belastbaarheid, beperkingen én mogelijkheden. Het instrument maakt inzichtelijk welke vorderingen er tijdens het traject worden gemaakt, op welk niveau iemand kan deelnemen aan de samenleving en welke interventies nodig zijn om een werknemer te laten stijgen op de POW-meter™ en zo de kansen op de arbeidsmarkt te vergroten.';

export const PERSPECTIEF_OP_WERK_NULMETING =
  'Tijdens het intakegesprek vindt de nulmeting plaats. Deze wordt, samen met de gewenste interventies, vastgelegd in het trajectplan. Tussentijdse metingen worden opgenomen in de voortgangsrapportages.';

export const INSCHALING_ROW_LABELS = {
  huidige_trede: 'Huidige trede POW-meter™',
  werkzame_uren: 'Huidige werkzame uren',
  verwachting: 'Verwachting over 3 maanden',
} as const;

export type TredeNumber = 1 | 2 | 3 | 4 | 5 | 6;

/** V10 word limits (assembled output). */
export const MAX_WORDS_WERKZAME_UREN = 50;

export const MAX_SENTENCES_WERKZAME_UREN = 2;

export const MAX_WORDS_VERWACHTING = 80;

export const MAX_SENTENCES_VERWACHTING = 4;

export const MAX_WORDS_TOELICHTING = 120;

/** Server-built trede sentence — [n] replaced at assembly time. */
export const HUIDIGE_TREDE_TEMPLATE =
  'Werknemer bevindt zich in trede [n] van de POW-meter™.';

export const VERWACHTING_OPENER = 'Werknemer bevindt zich vermoedelijk in trede';

export const VERWACHTING_OPENER_SUFFIX = 'van de POW-meter™.';

/** Server-built toelichting opener — [n] replaced; kern continues after "omdat". */
export const TOELICHTING_OPENER_PREFIX =
  'Werknemer bevindt zich tijdens de intake in trede [n] van de POW-meter™ omdat';

/** Exact V10 Spoor 2 block for verwachting_kern when logically supported. */
export const SPOOR2_VERWACHTING_BLOCK =
  'Daarnaast kunnen binnen het tweede spoor arbeidsoriëntatie, netwerkactiviteiten, een werkervaringsplaats, stage of andere passende activiteiten worden ingezet om de mogelijkheden richting passend werk verder te verkennen. Wanneer hieruit een beter passende en haalbare werksetting naar voren komt, kan werknemer ook binnen deze context verder werken aan het opbouwen en toetsen van de belastbaarheid.';

export const SOURCE_HIERARCHY_V10 = `
1. Medische belastbaarheid (altijd leidend)
Gebruik uitsluitend de meest recente informatie van de bedrijfsarts: benutbare mogelijkheden, FML, IZP, prognose, urenbeperking, beperkingen. Hiervan mag nooit worden afgeweken.

2. Feitelijke informatie (meest recente document)
Bij verschillende documentdata geldt voor feitelijke informatie de meest recente bron: huidige werkzaamheden, functie, werkuren, opbouwschema, Spoor 1-activiteiten, dagstructuur, activiteiten buitenshuis, sociale participatie, motivatie, opleiding, werkervaring, digitale vaardigheden, rijbewijs, vervoer, talen.
Een recenter intakeformulier vervangt eerdere feitelijke informatie uit een arbeidsdeskundig rapport.

3. Arbeidsdeskundige conclusies
Het arbeidsdeskundig rapport blijft leidend voor: geschiktheid eigen werk, passend werk, herplaatsingsmogelijkheden, Spoor 1, Spoor 2, loonwaarde, WIA-risico.
Alleen feitelijke informatie mag door een recenter document worden vervangen.
`.trim();

export const DECISION_TREE_V10 = `
STRICTE LADDER (verplicht — beantwoord alleen Ja/Nee per vraag, in volgorde):
Nee → stop daar (trede hoort bij die vraag). Ja → ga door naar de volgende vraag.
Geen holistische "voelt als trede X"-inschatting. Server berekent huidige trede uit jouw Ja/Nee-antwoorden.

Vraag 1: Zijn er volgens de bedrijfsarts duurzaam benutbare mogelijkheden? Nee → Trede 1. Ja → verder.
Vraag 2: Komt werknemer minimaal twee keer per week buitenshuis? Nee → Trede 1. Ja → verder.
Vraag 3: Is sprake van regelmatige sociale participatie buitenshuis? Nee → Trede 2. Ja → verder.
Vraag 4: Is werknemer gemotiveerd richting arbeid? Nee → Trede 3. Ja → verder.
Vraag 5: Kan werknemer tijdens de intake ongeveer minimaal 12 uur per week belast worden? Nee → Trede 3. Ja → verder.
Vraag 6: Verricht werknemer momenteel werkzaamheden? Nee → Trede 3. Ja → verder.
  (Let op: 0 uur werk alleen = Nee op vraag 6 → Trede 3 als vragen 1–5 Ja zijn — geen Trede 1 alleen omdat uren laag zijn.)
Vraag 7: Is sprake van betaald werk?
  Nee (vrijwilligerswerk, stage, werkervaringsplaats of activeringsplaats) → Trede 4.
  Ja: beoordeel verhouding tot contracturen, duurzaamheid, passendheid.
    Aangepast werk ≥ ~65% contracturen maar nog tijdelijke voorzieningen of Spoor 1/2-traject → Trede 5 (q7_duurzaam_passend_min_65=false).
    Duurzaam passend werk zonder tijdelijke voorzieningen, ≥ 65% loonwaarde of volledig hersteld → Trede 6 (q7_duurzaam_passend_min_65=true).

De trede wordt nooit uitsluitend bepaald door het aantal uren. Beoordeel altijd via de ladder: benutbare mogelijkheden, activiteiten buitenshuis, sociale participatie, motivatie, belastbaarheid, huidige werkzaamheden, betaald/onbetaald werk, verhouding tot contracturen, duurzaamheid, Spoor 1 en Spoor 2.
`.trim();

export const DOCUMENT_SCOPE_HINT = `
DOCUMENTEN VOOR POW-meter™:
- FML/IZP/LAB (belastbaarheid): benutbare mogelijkheden, beperkingen, urenbeperking, prognose
- AD rapport (indien aanwezig): Spoor 1/2, passend werk, loonwaarde, herplaatsing
- Intakeformulier (indien aanwezig): actuele werkzaamheden, uren, motivatie, participatie, dagstructuur
Context: prognose bedrijfsarts uit dossier (indien aanwezig)
Gebruik NIET: medische diagnoses als leidraad, privé-informatie, niet-genoemde feiten.
`.trim();

/** Style reference — length and tone only; do not copy content. */
export const INSCHALING_STYLE_REFERENCE_V10 = `
Huidige trede: Werknemer bevindt zich in trede 2 van de POW-meter™.
Huidige werkzame uren: Werknemer werkt momenteel 0,5 uur per week. Zij verricht geen betaald werk.
Verwachting over 3 maanden: Werknemer bevindt zich vermoedelijk in trede 3 van de POW-meter™. Dit kan worden gerealiseerd door een gefaseerde urenopbouw binnen spoor 1 of door het vinden van een passende activerings- of werkervaringsplaats.
Toelichting: Werknemer bevindt zich tijdens de intake in trede 2 van de POW-meter™ omdat haar belastbaarheid laag is, er een duidelijke urenbeperking geldt met advies voor zeer geleidelijke opbouw, en zij nog beperkt buitenshuis actief is.
`.trim();

/** Phrases forbidden in client-facing toelichting (decision-tree jargon). */
export const FORBIDDEN_TOELICHTING_PHRASES = [
  'benutbare mogelijkheden',
  'geen benutbare mogelijkheden',
  'duurzaam benutbare mogelijkheden',
  'wel benutbare mogelijkheden heeft',
] as const;

export const TOELICHTING_STYLE_GOOD_EXAMPLE =
  'haar belastbaarheid laag is, er een duidelijke urenbeperking geldt met advies voor zeer geleidelijke opbouw, en zij nog beperkt buitenshuis actief is.';

export const TOELICHTING_STYLE_BAD_EXAMPLE =
  'werknemer wel benutbare mogelijkheden heeft maar haar belastbaarheid laag is';

export const FORBIDDEN_WERKZAME_UREN_PHRASES = [
  'er is sprake van',
  'daarnaast lopen spoor 1 en spoor 2 parallel',
  'in het kader van',
] as const;

export const FORBIDDEN_TERMS = ['diagnose', 'diagnoses', 'behandeladvies'] as const;
