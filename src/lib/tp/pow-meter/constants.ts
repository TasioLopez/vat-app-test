/** Delimiter before inschaling JSON in pow_meter field. */
export const INSCHALING_DELIMITER = '<<<INSCHALING>>>';

/** Delimiter before toelichting text in pow_meter field. */
export const TOELICHTING_POW_DELIMITER = '<<<TOELICHTING_POW>>>';

export const DEFAULT_POW_METER_MODEL = 'gpt-5.6-sol';

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

/** V11 limits (assembled output). */
export const MAX_WORDS_WERKZAME_UREN = 60;

export const MAX_SENTENCES_WERKZAME_UREN = 2;

export const MAX_WORDS_VERWACHTING = 30;

export const MAX_SENTENCES_VERWACHTING = 1;

export const MAX_WORDS_TOELICHTING = 180;

/** Server-built trede sentence — [n] replaced at assembly time. */
export const HUIDIGE_TREDE_TEMPLATE =
  'Werknemer bevindt zich in trede [n] van de POW-meter™.';

export const WERKZAME_UREN_EMPTY = 'Werknemer verricht momenteel geen werkzame uren.';

export const VERWACHTING_OPENER = 'Werknemer bevindt zich vermoedelijk over drie maanden in trede';

export const VERWACHTING_OPENER_SUFFIX = 'van de POW-meter™.';

/** Legacy opener pattern (V10) — still used for leak-stripping / mapping heuristics. */
export const TOELICHTING_OPENER_PREFIX =
  'Werknemer bevindt zich tijdens de intake in trede [n] van de POW-meter™ omdat';

/** V11 visie typically starts with this pattern (intakegesprek). */
export const VISIE_OPENER_PREFIX =
  'Werknemer bevindt zich tijdens het intakegesprek in trede';

export const CONTROLEPUNT_LABEL = 'Controlepunt';

/** PDF: normally max one trede growth unless concrete evidence (server enforces +1). */
export const MAX_VERWACHTING_JUMP = 1;

export const DOCUMENT_SCOPE_HINT_V11 = `
DOCUMENTEN VOOR POW-meter™:
- Primair: intakeformulier — activiteiten, uren, motivatie, participatie, dagstructuur, geplande activering.
- Bevestigend (alleen indien aanwezig): FML/IZP/LAB of AD-rapport voor loonwaarde, herstelmelding, contracturen of betaald werk wanneer het intake dit noemt of mist.
Gebruik NIET: medische diagnoses als leidraad, privé-informatie, niet-genoemde feiten.
`.trim();

export const TREDE_RUBRIC_V11 = `
Tredebepaling
Bepaal de trede op basis van activiteiten, arbeidsgerichte uren, soort werkzaamheden, betaling, contractpercentage, herstelmelding en loonwaarde.
Controleer trede 6 vóór trede 5. Verwar het percentage contracturen niet met het percentage loonwaarde.
Voorkom dubbeltelling van activiteiten en uren.

Trede 1
Minder dan 2 uur per week actief binnen of buitenshuis.
Voor trede 1 en 2 tellen ook gewone activiteiten mee, zoals: huishoudelijke activiteiten; wandelen; afspraken; sociale contacten; maatschappelijke activiteiten.

Trede 2
Minimaal 2 maar minder dan 4 uur per week actief binnen of buitenshuis.
Wanneer iemand regelmatig wandelt, kleine huishoudelijke activiteiten verricht, afspraken bijwoont en sociale contacten onderhoudt, mag je aannemen dat diegene minimaal 2 uur per week actief is, ook wanneer geen exact aantal uren is ingevuld.

Trede 3
Minimaal 4 maar minder dan 10 uur per week aan structurele activerings-, re-integratie- of arbeidsmatige activiteiten, bijvoorbeeld in spoor 1, op een activeringsplek, op een werkervaringsplaats of elders.

Trede 4
Minimaal 10 maar minder dan 20 uur per week aan re-integratie- of arbeidsmatige activiteiten, of minder dan 50% van de contracturen.
Het kan gaan om aangepast, begeleid of onbetaald werk in spoor 1 of elders. Zolang het werk onbetaald of sterk aangepast is, kan iemand ook bij meer uren in trede 4 blijven.

Trede 5
Er is sprake van betaald werk in spoor 1 of bij een andere werkgever, eventueel via een betaalde werkervaringsplaats of detachering.
Uitgangspunten: meer dan 11 uur per week; meer dan 50% van de contracturen; nog geen volledige duurzame hervatting; de situatie voldoet nog niet aan trede 6.
Betaald werk is een belangrijk onderscheid tussen trede 4 en trede 5. Onbetaald werk wordt niet automatisch trede 5.

Trede 6
Trede 6 geldt bij: een herstelmelding in spoor 1; of minimaal 65% loonwaarde of verdiencapaciteit bij een andere werkgever.
`.trim();

export const POW_FIELD_RULES_V11 = `
Huidige trede POW-meter™
Het systeem zet de zin op basis van jouw huidige_trede_nummer. Geef bij dit onderdeel geen toelichting in andere velden.

Huidige werkzame uren
Onder werkzame uren vallen uitsluitend: eigen of aangepaste werkzaamheden in spoor 1; re-integratiewerkzaamheden; activeringswerkzaamheden; een werkervaringsplaats; werkzaamheden bij een andere werkgever.
Huishoudelijke, sociale en vrijetijdsactiviteiten zijn geen werkzame uren. Ze mogen wel worden gebruikt om trede 1 of 2 te bepalen en te onderbouwen in de visie.
Wanneer er geen werk-, re-integratie- of activeringsuren zijn: zet has_werkzame_uren=false en huidige_werkzame_uren="". Het systeem schrijft exact: "Werknemer verricht momenteel geen werkzame uren." Noem dan geen 0 uur.
Wanneer er wel werkzame uren zijn: zet has_werkzame_uren=true en schrijf:
"Werknemer verricht momenteel [aantal] uur per week aan [soort werkzaamheden] [binnen spoor 1/op een activeringsplek/op een werkervaringsplaats/bij een andere werkgever]."
Noem alleen betaald, onbetaald, eigen of aangepast als dat uit het formulier blijkt en relevant is.

Verwachting over 3 maanden
Lever alleen verwachting_trede_nummer. Het systeem zet exact één zin. Voeg hier geen uitleg, doelstelling of onderbouwing toe.
Bepaal de verwachte trede aan de hand van: advies van bedrijfsarts, verzekeringsarts of arbeidsdeskundige; huidige belastbaarheid; opbouwschema; houding tegenover re-integratie of spoor 2; geplande activering of werkervaringsplaats; realistische ontwikkeling binnen drie maanden.
Ga niet automatisch uit van groei. Handhaaf de huidige trede als ontwikkeling onvoldoende wordt ondersteund. Ga normaal uit van maximaal één trede groei.

Visie op plaatsbaarheid (visie_op_plaatsbaarheid)
Gebruik deze structuur:
"Werknemer bevindt zich tijdens het intakegesprek in trede [huidige trede] van de POW-meter™, omdat hij/zij op dit moment [feitelijke onderbouwing]. Het doel is dat werknemer binnen drie maanden doorgroeit naar trede [verwachte trede] van de POW-meter™ door [passende vervolgstap]. [Korte toelichting over het opbouwen of toetsen van uren, arbeidsritme, belastbaarheid of inzetbaarheid.]"
Gebruik "hij" of "zij" volgens het formulier. Gebruik anders "werknemer".
Bij trede 1 of 2 beschrijf je gewone activiteiten algemeen en professioneel.
Bij trede 3 tot en met 6 vermeld je, indien beschikbaar: aantal uren; soort werkzaamheden; spoor 1 of elders; betaald of onbetaald; eigen of aangepast werk; contractpercentage; loonwaarde of herstelmelding.
Gebruik "binnen spoor 2" alleen als daadwerkelijk sprake is van een spoor 2-traject.
Een passende slotzin is: "Hiermee kan werknemer arbeidsritme opdoen en kunnen de uren en belastbaarheid geleidelijk worden opgebouwd en in de praktijk worden getoetst."

Ontbrekende informatie
Maak een redelijke professionele gevolgtrekking als het formulier voldoende aanwijzingen bevat. Verzin geen exacte uren, percentages, loonwaarde, betaald werk, herstelmelding of activiteiten.
Als essentiële informatie ontbreekt en het antwoord de trede daadwerkelijk kan veranderen: kies de meest aannemelijke trede; formuleer voorzichtig; zet controlepunt op maximaal één concrete controlevraag. Anders controlepunt="".
Plaats geen onzekerheidsdisclaimer in de vier hoofdteksten.

Privacy
Neem geen diagnoses, uitgebreide medische verhalen of onnodige privégegevens over. Vertaal relevante informatie naar functionele termen (beperkte belastbaarheid; geleidelijke urenopbouw; passend licht werk; beperkingen bij staan, lopen, tillen of werktijden).
Noem geen schulden, gezinsproblematiek of behandelingsdetails tenzij strikt noodzakelijk.
`.trim();

/** Phrases forbidden in client-facing toelichting. */
export const FORBIDDEN_TOELICHTING_PHRASES = [
  'benutbare mogelijkheden',
  'geen benutbare mogelijkheden',
  'duurzaam benutbare mogelijkheden',
  'wel benutbare mogelijkheden heeft',
] as const;

export const FORBIDDEN_WERKZAME_UREN_PHRASES = [
  'er is sprake van',
  'daarnaast lopen spoor 1 en spoor 2 parallel',
  'in het kader van',
] as const;

export const FORBIDDEN_TERMS = ['diagnose', 'diagnoses', 'behandeladvies'] as const;
