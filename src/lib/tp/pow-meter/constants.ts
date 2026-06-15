/** Delimiter before inschaling JSON in pow_meter field. */
export const INSCHALING_DELIMITER = '<<<INSCHALING>>>';

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

export const TREDE_DEFINITIONS = `
Trede 1: Geen benutbare mogelijkheden. Nauwelijks activiteiten buitenshuis. Minder dan 2 uur per week actief.
Trede 2: Werknemer komt buitenshuis. Beperkte sociale participatie. Minder dan 4 uur per week actief.
Trede 3: Werknemer neemt deel aan activiteiten buitenshuis. Activering, vrijwilligerswerk, arbeidsoriëntatie of Spoor 1 activiteiten. Minder dan 10 uur per week werkzaam of actief.
Trede 4: Werknemer verricht werkzaamheden in aangepast werk, stage, werkervaringsplaats, activeringsplaats of structurele re-integratie. Tussen 10 en 20 uur per week werkzaam. Of minder dan 50% van de contracturen werkzaam.
Trede 5: Werknemer verricht betaald werk bij eigen of andere werkgever. Meer dan 50% maar minder dan 70% van de contracturen werkzaam.
Trede 6: Werknemer is duurzaam werkzaam bij eigen of andere werkgever. Minimaal 65% loonwaarde of volledig hersteld gemeld.
`.trim();

export const SPOOR2_OPTIONAL_PHRASING =
  'Daarnaast kunnen binnen het tweede spoor arbeidsoriëntatie, netwerkactiviteiten, een werkervaringsplaats, stage of andere passende activiteiten worden ingezet om de mogelijkheden richting passend werk verder te verkennen. Wanneer hieruit een beter passende en haalbare werksetting naar voren komt, kan werknemer ook binnen deze context verder werken aan het opbouwen en toetsen van de belastbaarheid.';

export const VERWACHTING_OPENER = 'Werknemer bevindt zich vermoedelijk in trede';
