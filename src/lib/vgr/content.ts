/**
 * Static and conditional template texts for the VGR, taken from the canonical blank
 * ValentineZ templates (01–05, Oct-5 2026 body).
 *
 * Content classes:
 *  - STATIC: always exported (standard questions, PoW explanation, AVG note, legenda).
 *  - CONDITIONAL: exported only when the adviser selects the related intervention.
 *  - INSTRUCTION: authoring guidance for the adviser; shown in the editor only, never exported.
 */
import type { VGRLeernavigatorItem } from '@/lib/vgr/schema';
import { TP2026_PURPLE_DEEP } from '@/lib/tp2026/tp2026-colors';

/* ------------------------------------------------------------------ */
/* 01 / 02                                                             */
/* ------------------------------------------------------------------ */

export const VGR_COVER_TITLE = 'Rapportage voortgang';

export const VGR_TRAJECTSOORT = 'Spoor 2 begeleiding';

export const VGR_OPDRACHT_DOELSTELLING =
  'Het doel van dit traject is een bevredigend resultaat. Een structurele werkhervatting die zo dicht mogelijk aansluit bij de resterende functionele mogelijkheden.';

export const VGR_AVG_NOTE =
  'NB: in het kader van de algemene verordening gegevensbescherming (AVG) worden in deze rapportage geen medische termen en diagnoses vermeld. Voor meer informatie over ons privacyreglement en het klachtenreglement verwijzen wij u naar onze website.';

export const VGR_LEGENDA: [string, string][] = [
  ['AO', 'Arbeidsdeskundigonderzoek'],
  ['AD', 'Arbeidsdeskundig'],
  ['BA', 'Bedrijfsarts'],
  ['EZD', 'Eerste ziekte dag'],
  ['FML', 'Functiemogelijkhedenlijst'],
  ['GBM', 'Geen benutbare mogelijkheden'],
  ['IZP', 'Inzetbaarheidsprofiel'],
  ['LAB', 'Lijst arbeidsmogelijkheden en beperkingen'],
  ['TP', 'Trajectplan'],
  ['VGR', 'Voortgangsrapportage'],
  ['WAZO', 'Wet arbeid en zorg'],
];

/* ------------------------------------------------------------------ */
/* 03 — chapter titles                                                 */
/* ------------------------------------------------------------------ */

export const VGR_CHAPTERS = [
  { id: 'profiel', title: 'Profiel werknemer', color: TP2026_PURPLE_DEEP },
  { id: 'motivatie', title: 'Fase motivatie', color: '#c76f5c' },
  { id: 'orientatie', title: 'Fase oriëntatie', color: '#2d8f82' },
  { id: 'activatie', title: 'Fase activatie en arbeidsbemiddeling', color: '#b8985c' },
] as const;

export type VGRChapterId = (typeof VGR_CHAPTERS)[number]['id'];

export const VGR_TOC: { chapter: VGRChapterId; entries: string[] }[] = [
  {
    chapter: 'profiel',
    entries: [
      'Vraagstelling',
      'Benutbare mogelijkheden',
      'Praktische belemmeringen',
      'Doelstelling traject',
      'Persoonlijk profiel werknemer',
      'Belastbaarheidsprofiel werknemer',
      'Bijstellingen van het belastbaarheidsprofiel werknemer',
      'Wijzigingen doelstelling',
      'Zoekprofiel',
    ],
  },
  { chapter: 'motivatie', entries: ['Inzet en houding werknemer', 'Interventies gericht op motivatie'] },
  {
    chapter: 'orientatie',
    entries: [
      'Algemene toelichting',
      'Kwaliteiten en vaardigheden onderzoek',
      'Scholingsmogelijkheden',
      'Sollicitatie vaardigheden',
    ],
  },
  {
    chapter: 'activatie',
    entries: [
      'Interventies activatie en arbeidsbemiddeling',
      'Perspectief op werk',
      'Grafische weergave PoW-meter™',
      'Inschaling PoW-meter™',
      'Visie op plaatsbaarheid',
      'Leernavigator',
    ],
  },
];

/* ------------------------------------------------------------------ */
/* 03 — A. Profiel werknemer                                           */
/* ------------------------------------------------------------------ */

/** STATIC — the five standard questions. */
export const VGR_VRAAGSTELLING: string[] = [
  'Welke re-integratieactiviteiten en inspanningen zijn in de verslagperiode uitgevoerd en wat hebben deze opgeleverd?',
  'Welke voortgang is geboekt richting passend en duurzaam werk en welke mogelijkheden zijn daarbij onderzocht of benut?',
  'Sluiten het persoons- en zoekprofiel, de activiteiten en begeleiding nog aan bij de actuele mogelijkheden en doelstelling van werknemer? Zo nee, welke bijstelling is nodig?',
  'Welke belemmeringen zijn naar voren gekomen en wat betekenen deze voor de verdere aanpak van het 2e spoor?',
  'Welke vervolgstappen en ondersteuning zijn nodig, wie is verantwoordelijk en binnen welke termijn wordt dit uitgevoerd?',
];

export const VGR_BENUTBARE_VRAAG = 'Beschikt werknemer op dit moment over benutbare mogelijkheden?';

/** STATIC lead sentence for prognose/conclusie/advies quotes. */
export function vgrQuoteLead(
  kind: 'prognose' | 'conclusie' | 'advies',
  bronNaam: string,
  bronDatumVoluit: string,
  bronType?: string
): string {
  const source = bronType?.trim()
    ? bronType.trim()
    : 'het belastbaarheidsprofiel (en/of de terugkoppeling van het medisch spreekuur)';
  const naam = bronNaam.trim() || 'de bedrijfsarts';
  const datum = bronDatumVoluit && bronDatumVoluit !== '—' ? `, opgesteld op ${bronDatumVoluit},` : ',';
  const tail =
    kind === 'prognose'
      ? 'staat de volgende prognose:'
      : kind === 'conclusie'
        ? 'staat de volgende conclusie:'
        : 'staat het volgende advies:';
  return `In ${source} van ${naam}${datum} ${tail}`;
}

export const VGR_PRAKTISCHE_VRAAG =
  'Zijn er praktische belemmeringen bekend die van invloed kunnen zijn op het spoor 2 traject?';

/** INSTRUCTION */
export const VGR_PRAKTISCHE_INSTRUCTIE =
  'Hier geef je een onderbouwing van bovenstaande, indien van toepassing. Het gaat om praktische belemmeringen die het 2e-spoortraject kunnen beïnvloeden of vertragen.';

export const VGR_DOELSTELLING_INTRO =
  'Het doel van het traject is een adequaat resultaat, een structurele werkhervatting die zo dicht mogelijk aansluit bij de resterende functionele mogelijkheden. Ten tijde van het intakegesprek is onderstaande doelstelling van het traject vastgesteld.';

/** INSTRUCTION */
export const VGR_DOELSTELLING_INSTRUCTIE =
  'Geef hier een duidelijke toelichting en onderbouwing. Bij de onderbouwing ligt de focus op wat de werknemer nog wél kan en welke stappen al zijn ondernomen om de re-integratie te bevorderen. Beschrijf wat er is bereikt binnen spoor 1 en spoor 2, en licht toe waarom de werknemer wel of niet re-integreert. Meest recente datum bovenaan.';

export function vgrDoelstellingWijzigingZin(changed: boolean, from: string, to: string): string {
  if (!changed) return 'De doelstelling is gedurende de begeleiding ongewijzigd gebleven.';
  return `De doelstelling is gedurende de begeleiding gewijzigd van ${from || '…'} naar ${to || '…'}.`;
}

/** INSTRUCTION */
export const VGR_PERSOONLIJK_PROFIEL_INSTRUCTIE =
  'Neem hier het persoonlijk profiel over zoals dit in het trajectplan is vermeld.';

export function vgrBelastbaarheidIntro(kindLabel: string, datumVoluit: string, auteur: string): string {
  const k = kindLabel || 'de FML/het IZP/de LAB';
  const d = datumVoluit && datumVoluit !== '—' ? datumVoluit : '…';
  const a = auteur.trim() || 'de bedrijfsarts';
  return `Werknemer heeft, conform het belastbaarheidsprofiel (${k}), dat op ${d} is opgesteld door ${a}, beperkingen in onderstaande rubrieken:`;
}

export const VGR_BIJSTELLING_VRAAG =
  'Zijn er tussentijds bijstellingen van het belastbaarheidsprofiel vastgesteld?';

export function vgrBijstellingIntro(kindLabel: string, auteur: string, datumVoluit: string): string {
  const k = kindLabel || 'de FML/het IZP/de LAB';
  const a = auteur.trim() || 'de bedrijfsarts';
  const d = datumVoluit && datumVoluit !== '—' ? datumVoluit : '…';
  return `Er heeft een bijstelling van het belastbaarheidsprofiel (${k}), opgesteld door ${a} op ${d} plaatsgevonden, in de onderstaande rubriek(en):`;
}

/** INSTRUCTION */
export const VGR_BIJSTELLING_INSTRUCTIE =
  'Benoem hier per rubriek wat er veranderd is ten aanzien van het eerdere belastbaarheidsprofiel van de werknemer. Als er geen aanpassingen zijn, laat dan het gedeelte over de bijstelling weg en geef alleen een toelichting (bijv. dat de FML van [datum] ongewijzigd van kracht blijft).';

export const VGR_WIJZIGING_DOEL_VRAAG = 'Zijn er wijzigingen ten aanzien van de laatst geformuleerde doelstelling?';

/** INSTRUCTION */
export const VGR_WIJZIGING_DOEL_INSTRUCTIE =
  'Mocht een doelstelling worden aangepast, vermeld dan hier wat er is aangepast en voeg eventueel een citaat uit de consultrapportage van de bedrijfsarts toe.';

/** INSTRUCTION */
export const VGR_ZOEKPROFIEL_INSTRUCTIE =
  'Neem hier het zoekprofiel over zoals dit in het trajectplan is vermeld. Let op: bij wijziging van de FML/IZP dient het zoekprofiel te worden aangepast.';

/* ------------------------------------------------------------------ */
/* 03 — B. Fase motivatie                                              */
/* ------------------------------------------------------------------ */

export const VGR_INZET_VRAAG = 'Werkt werknemer mee aan het spoor 2 traject?';

/** INSTRUCTION */
export const VGR_INZET_INSTRUCTIE =
  'Werknemer komt afspraken na, luistert naar de tips die gegeven worden en past deze toe op een adequate manier. Vermeld hier ook wanneer een werknemer niet meewerkt of zich niet aan de afspraken houdt. Wanneer dit het geval is, geef dan aan of dit al dan niet aan de werkgever is gerapporteerd. Geef hier een persoonlijke onderbouwing en toelichting over de houding en inzet van werknemer.';

export const VGR_MOTIVATIE_ALGEMEEN =
  'Binnen het traject kunnen verschillende activiteiten worden ingezet om werknemer te ondersteunen bij het verwerken van baanverlies, het ontwikkelen van zelfinzicht en het versterken van de eigen regie. Afhankelijk van de situatie en behoefte van werknemer worden interventies ingezet, altijd met als doel de weerbaarheid en veerkracht van werknemer te verhogen.';

export const VGR_MOTIVATIE_LEAD = 'Onderstaande interventies zijn ingezet op het vlak van motivatie:';

export type VGRInterventionOption = {
  id: string;
  /** Checkbox label (canonical blank template). */
  label: string;
  /** Block heading in the body (may differ from the checkbox label). */
  heading: string;
  /** Known alias labels from filled examples (mapped to this id). */
  aliases?: string[];
  /** CONDITIONAL generic paragraph(s) shown above the adviser toelichting. */
  standardText?: string[];
  /** Default sub-items shown as a list when the block is selected (editable). */
  defaultItems?: string[];
  /** Label above the item list. */
  itemsLead?: string;
  /** INSTRUCTION for the adviser (editor only). */
  instruction?: string;
  /** "Overig" / "Niet van toepassing" style blocks. */
  kind?: 'overig' | 'nvt';
};

export const VGR_MOTIVATIE_OPTIONS: VGRInterventionOption[] = [
  {
    id: 'empowerment',
    label: 'Empowerment',
    heading: 'Empowerment',
    standardText: [
      'Tijdens afspraken met werknemer is, indien nodig, aandacht voor empowerment, het verbeteren van mentale en fysieke vitaliteit en het versterken van de weerbaarheid. Werknemer krijgt praktische tips en handvatten om in het dagelijkse leven toe te passen. Bij de gesprekstechnieken en opdrachten staat het denken in oplossingen centraal. Het werkboek Empowerment helpt werknemer bij het vergroten van inzicht in eigen kunnen en het terugpakken van de regie over het eigen leven. Persoonlijke ontwikkeling en toename van zelfvertrouwen staan hierbij centraal. Daarnaast komt effectiever omgaan met uitdagingen aan bod, op zowel werkvlak als in het dagelijkse leven.',
    ],
    itemsLead: 'Onderstaande interventies zijn ingezet op het vlak van empowerment:',
    defaultItems: [
      'Zelfbewust wording en herstel van zelfvertrouwen',
      'Geloof in eigen mogelijkheden',
      'Energie gevers en energievreters',
      'Inzicht in de invloed die je kunt uitoefenen op je toekomst, levensdoel',
      'Doorbreken van negatieve gedachtenpatronen',
      'Positief denken en in mogelijkheden denken',
    ],
    instruction:
      'Geef hier een persoonlijke toelichting wat er op dit vlak is ondernomen. Vink de interventie uit als deze niet is ingezet; het blok verdwijnt dan uit de rapportage.',
  },
  {
    id: 'rouwproces',
    label: 'Rouwproces - verlies en acceptatie',
    heading: 'Coaching bij verlies en acceptatie',
    aliases: ['Coaching bij verlies en acceptatie', 'Verwerking verlies en acceptatie'],
    standardText: [
      'Op zoek moeten naar een andere baan is voor veel werknemers een "grote" stap. Zeker als men er door ziekte eigenlijk zelf niets aan kan doen. Men voelt zich vaak extra gestraft omdat men naast het accepteren van ziekte ook nog eens te horen krijgt dat er geen passend werk meer voor werknemer is. Verlies van je baan betekent verlies van houvast, structuur, een vertrouwde omgeving, collega’s en vrienden maar ook verlies van (financiële) zekerheid.',
      'De focus ligt op het vaststellen van haalbare doelen en het nemen van concrete stappen om de gewenste vooruitgang te realiseren. Dit helpt werknemers om grip te krijgen op de persoonlijke situatie.',
    ],
    instruction: 'Geef hier een persoonlijke toelichting wat er op dit vlak is ondernomen. Het gehele onderdeel weglaten indien niet van toepassing.',
  },
  {
    id: 'overig',
    label: 'Overig',
    heading: 'Overig',
    kind: 'overig',
    instruction: 'Geef hier een persoonlijke toelichting welke extra activiteiten zijn ingezet.',
  },
  {
    id: 'nvt',
    label: 'Niet van toepassing',
    heading: 'Niet van toepassing',
    kind: 'nvt',
    instruction:
      'Geef hier een persoonlijke onderbouwing waarom bepaalde (van de bovenstaande) interventies niet zijn ingezet.',
  },
];

/* ------------------------------------------------------------------ */
/* 03 — C. Fase oriëntatie                                             */
/* ------------------------------------------------------------------ */

export const VGR_ORIENTATIE_ALGEMEEN =
  'Tijdens de begeleiding naar ander werk is het voor werknemer belangrijk inzicht te krijgen in de eigen competenties en drijfveren. Hiervoor maakt de werknemer diverse testen en opdrachten. De resultaten vormen het startpunt voor de loopbaanoriëntatie. Ze worden niet als definitief advies beschouwd, maar gebruikt om een bredere dialoog te voeren over mogelijk passende beroepen. De functies in het zoekprofiel dienen als basis voor verdere arbeidsmarktverkenning en het verrichten van sollicitaties. Daarnaast worden de verkregen inzichten gebruikt voor het opstellen van een persoonsprofiel, cv en sollicitatie- en motivatiebrieven, zodat de werknemer zich optimaal kan presenteren op de arbeidsmarkt.';

export const VGR_KWALITEITEN_LEAD =
  'Onderstaande interventies zijn ingezet op het vlak van het kwaliteiten en vaardigheden onderzoek:';

export const VGR_PERSONALITY_TRAITS: { key: keyof import('@/lib/vgr/schema').VGRPersonalityScores; label: string }[] = [
  { key: 'emotionele_stabiliteit', label: 'Emotionele stabiliteit' },
  { key: 'extraversie', label: 'Extraversie' },
  { key: 'ordelijkheid', label: 'Ordelijkheid' },
  { key: 'vriendelijkheid', label: 'Vriendelijkheid' },
  { key: 'openheid', label: 'Openheid' },
];

export const VGR_BEROEPEN_CRITERIA_INTRO =
  'De beroepen worden tijdens het spoor 2 traject nader getoetst op haalbaarheid aan de hand van de onderstaande criteria (conform UWV-richtlijnen):';

export const VGR_BEROEPEN_CRITERIA: { title: string; doel: string }[] = [
  {
    title: 'Belastbaarheidsprofiel FML/ IZP/ LAB',
    doel: 'Doel: vaststellen dat de voorgestelde beroepen passen binnen de fysieke en mentale grenzen van de werknemer.',
  },
  {
    title: 'Persoonsprofiel',
    doel: 'Doel: beroepen identificeren die aansluiten bij de persoonlijkheid en vaardigheden van de werknemer.',
  },
  { title: 'Zoekprofiel', doel: 'Doel: gericht zoeken naar passende functies binnen de opgestelde criteria.' },
];

export const VGR_BEROEPEN_CRITERIA_OUTRO =
  'Deze uitgebreide analyse zorgt ervoor dat we beroepen aanbevelen die aansluiten bij de vaardigheden en interesses van de werknemer, maar ook realistisch en haalbaar zijn gezien de beperkingen, persoonlijke voorkeuren, werkervaring en opleiding van de werknemer. De testuitslag zegt niet of een functie passend is of niet. Het helpt wel in het vaststellen van een denkrichting. Het zoekprofiel is hierbij leidend.';

export const VGR_KWALITEITEN_OPTIONS: VGRInterventionOption[] = [
  {
    id: 'persoonlijkheidstest',
    label: 'Persoonlijkheidstest',
    heading: 'Persoonlijkheidstest',
    standardText: [
      'De persoonlijkheidstest is zelfstandig of onder begeleiding van de loopbaanadviseur uitgevoerd. De resultaten geven inzicht in gedragsvoorkeuren en werkstijl van de werknemer, wat helpt bij het duiden van geschikte functies. Conform de persoonlijkheidstest scoort werknemer op de onderstaande kenmerken:',
    ],
    instruction:
      'Vul de exacte percentages in en plaats per kenmerk de beschrijving zoals vermeld in de testresultaten (positieve punten en aandachtspunten, voorbeeldbranches en -beroepen). Alleen invullen als de test daadwerkelijk is aangeleverd.',
  },
  {
    id: 'competentietest',
    label: 'Competentietest',
    heading: 'Competentietest',
    standardText: [
      'De competentietest is zelfstandig of onder begeleiding van de loopbaanadviseur uitgevoerd. De test brengt sterke en ontwikkelbare vaardigheden in kaart en helpt werknemer bij het vinden van mogelijk passende functies en ontwikkelmogelijkheden.',
    ],
    instruction:
      'Werknemer scoort het hoogst op de kenmerken … & … en heeft de volgende competenties … & … als aandachtspunten. Vermeld hier de tekst bij de competenties.',
  },
  {
    id: 'beroepskeuzetest',
    label: 'Beroepskeuzetest',
    heading: 'Beroepskeuzetest',
    instruction:
      'Werknemer scoort het hoogst op de kenmerken … & …. Geef hier de persoonlijke kenmerken weer die uit de test naar voren zijn gekomen en geef de mogelijke passende functies aan die in het rapport staan.',
  },
  {
    id: 'beroepen_arbeidsmarkt',
    label: 'Beroepen– en arbeidsmarktoriëntatie',
    heading: 'Beroepen- en arbeidsmarktoriëntatie',
    aliases: ['Beroepen- en arbeidsmarktoriëntatie', 'Beroeps- en arbeidsmarktoriëntatie'],
    standardText: [
      'Om de mogelijkheden van de werknemer op de arbeidsmarkt grondig te onderzoeken en zoveel mogelijk kansrijke bemiddelingsberoepen te formuleren hebben we ons georiënteerd op de gebieden: persoonlijkheid, competenties en bemiddelbare beroepen. Door de resultaten die verkregen zijn met behulp van de testen zijn onderstaande beroepen vastgesteld die het beste aansluiten op de persoonlijke kenmerken van de werknemer:',
    ],
    instruction:
      'Vul de beroepen in die uit de testen naar voren zijn gekomen en onderbouw bij Conclusie waarom deze beroepen al dan niet passend zijn.',
  },
  {
    id: 'overig',
    label: 'Overig (bijvoorbeeld een drijfverentest, moodboard of kwaliteitenspel)',
    heading: 'Overig',
    kind: 'overig',
    instruction: 'Geef hier een persoonlijke toelichting welke extra activiteiten zijn ingezet.',
  },
  {
    id: 'nvt',
    label: 'Niet van toepassing',
    heading: 'Niet van toepassing',
    kind: 'nvt',
    instruction:
      'Geef hier een persoonlijke onderbouwing waarom bepaalde (van de bovenstaande) interventies niet zijn ingezet.',
  },
];

export const VGR_SCHOLING_ALGEMEEN =
  'Scholing zal alleen ingezet worden als het noodzakelijk is, hierbij wordt het beginsel van redelijkheid en billijkheid toegepast hetgeen betekent dat het om een relatief korte cursus/opleiding dient te gaan en de kosten naar verhouding. Alle cursussen en opleidingen worden ter goedkeuring voorgelegd aan werkgever.';

/** INSTRUCTION */
export const VGR_SCHOLING_INSTRUCTIE =
  'Let op: controleer bij inzet van deze activiteiten of er beperkingen zijn op het gebied van persoonlijk functioneren zoals concentratie en verdelen van de aandacht.';

export const VGR_SCHOLING_OPTIONS: VGRInterventionOption[] = [
  {
    id: 'taal',
    label: 'Taal',
    heading: 'Taal',
    standardText: [
      'In het kader van re-integratie kan de beheersing van de Nederlandse taal een cruciale rol spelen. Wanneer een werknemer niet meer in de oude functie kan terugkeren en zich moet oriënteren op een functie buiten de eigen organisatie is het (over het algemeen) van belang dat een werknemer de Nederlandse taal beheerst. Dit bevordert niet alleen de zelfredzaamheid van de werknemer, het vereenvoudigt ook de betreding van de arbeidsmarkt.',
    ],
    itemsLead:
      'Werknemer heeft daarnaast beknopte links en instructies van de loopbaanadviseur ontvangen, zodat hij/zij zelfstandig thuis verder aan de slag kan en relevante kansen op de arbeidsmarkt niet worden gemist.',
    defaultItems: [
      'www.oefenen.nl - basis',
      'www.duolingo.com - taal leren met eigen taal',
      'www.nt2taalmenu.nl - A1-A2-B1 taaloefeningen',
      'juf m NT2 - YouTube - basis A1',
    ],
    instruction: 'Geef hier een toelichting wat er op dit vlak is ondernomen.',
  },
  {
    id: 'omscholing',
    label: 'Omscholing',
    heading: 'Omscholing',
    standardText: [
      'Omscholing wordt ingezet met als doel het potentieel van een werknemer te vergroten. Een voorstel voor omscholing wordt aangevraagd indien nodig, met inachtneming van redelijkheid en billijkheid. Denk hierbij aan een korte cursus of opleiding met proportionele kosten, altijd met het uitgangspunt dat de mogelijkheden van werknemer op de arbeidsmarkt worden verbeterd. Zoals een cursus of opleiding met baangarantie. Alle cursussen en opleidingen worden altijd, ter goedkeuring, voorgelegd aan de werkgever.',
    ],
    instruction:
      'Is er een aanbeveling voor een specifieke cursus? Plaats hier een persoonlijke onderbouwing (is de cursus van toegevoegde waarde voor het verkrijgen van een mogelijk passende functie — kortste weg naar werk? Worden relevante opleidingen in het rapport van de AD genoemd?).',
  },
  {
    id: 'computervaardigheden',
    label: 'Computervaardigheden',
    heading: 'Computervaardigheden',
    standardText: [
      'Computervaardigheden zijn van belang voor de zelfredzaamheid van een werknemer. Deze vaardigheid kan het verschil maken tussen succesvolle re-integratie en stagnatie in een traject. De zoektocht naar een nieuwe baan wordt grotendeels online uitgevoerd.',
    ],
    instruction: 'Geef hier een toelichting wat er op dit vlak is ondernomen.',
  },
  { id: 'overig', label: 'Overig', heading: 'Overig', kind: 'overig', instruction: 'Geef hier een persoonlijke toelichting welke extra activiteiten zijn ingezet.' },
  {
    id: 'nvt',
    label: 'Niet van toepassing',
    heading: 'Niet van toepassing',
    kind: 'nvt',
    instruction: 'Geef hier een persoonlijke onderbouwing waarom bepaalde (van de bovenstaande) interventies niet zijn ingezet.',
  },
];

export const VGR_SOLLICITATIE_LEAD =
  'In het kader van het kwaliteiten en vaardigheden onderzoek zijn onderstaande interventies ingezet.';

export const VGR_VERVOLG_LEAD = (periode: string) =>
  `Onderstaande activiteiten komen in fase 2/3 (${periode || '…'}) aan bod:`;

export const VGR_SOLLICITATIE_OPTIONS: VGRInterventionOption[] = [
  {
    id: 'werkboek',
    label: 'Werkboek Solliciteren',
    heading: 'Werkboek Solliciteren',
    standardText: [
      'Het werkboek Solliciteren bevat praktische informatie, tips en opdrachten om de sollicitatievaardigheden van de werknemer te verbeteren. Onderwerpen zoals het persoonsprofiel, curriculum vitae, sollicitatiebrief en motivatiebrief komen aan bod, maar ook de verschillende manieren van solliciteren en tips hoe een sollicitatiegesprek voor te bereiden. Dit complete naslagwerk helpt werknemer zich optimaal voor te bereiden voor het verrichten van sollicitaties.',
    ],
    instruction: 'Geef hier een toelichting wat er op dit vlak is ondernomen en welke opdrachten zijn gemaakt.',
  },
  {
    id: 'cv',
    label: 'Curriculum vitae',
    heading: 'Curriculum vitae',
    standardText: [
      'Werknemer heeft zelfstandig of onder begeleiding van de loopbaanadviseur een curriculum vitae opgesteld. Werknemer heeft tips en voorbeeld cv’s ontvangen ter inspiratie. De resultaten van de afgenomen testen heeft werknemer gebruikt bij het opstellen van het persoonsprofiel en nader verwerkt in het curriculum vitae. Werknemer heeft de benodigde kennis opgedaan om het curriculum vitae zelfstandig of onder begeleiding van de loopbaanadviseur aan te passen om gericht te solliciteren op passende functies.',
    ],
    instruction: 'Hier een persoonlijke toelichting geven wat er op dit vlak is ondernomen.',
  },
  {
    id: 'brief',
    label: 'Sollicitatie- en motivatiebrief',
    heading: 'Sollicitatie- en motivatiebrief',
    standardText: [
      'Werknemer heeft de benodigde praktische informatie en voorbeelden van motivatie- en sollicitatiebrieven ontvangen. Werknemer beschikt over de voldoende kennis en inzicht om zelfstandig of onder begeleiding van de loopbaanadviseur een sollicitatie- of motivatiebrief op te stellen of aan te passen om gericht te solliciteren op passende functies.',
    ],
    instruction: 'Hier een persoonlijke toelichting geven wat er op dit vlak is ondernomen.',
  },
  {
    id: 'webinars',
    label: 'Webinars',
    heading: 'Webinars',
    standardText: [
      'Werknemer heeft een selectie van UWV-webinars bekeken over diverse arbeidsgerelateerde onderwerpen. De webinars zijn bedoeld ter kennisgeving en ter versterking van vaardigheden van de werknemer met als doel het vergroten van de kansen van de werknemer op de arbeidsmarkt.',
    ],
    itemsLead: 'Werknemer heeft onderstaande webinars bekeken:',
    defaultItems: [],
    instruction: 'Vul de titels van de bekeken webinars in (één per regel).',
  },
  {
    id: 'netwerken',
    label: 'Netwerken',
    heading: 'Netwerk',
    standardText: [
      'Werknemer heeft uitleg gekregen over de mogelijkheden die netwerken kan bieden bij het verkennen van functies, organisaties en kansen op de arbeidsmarkt.',
    ],
    instruction: 'Beschrijf wat werknemer binnen het eigen netwerk heeft onderzocht.',
  },
  {
    id: 'gesprek',
    label: 'Sollicitatiegesprek oefenen',
    heading: 'Sollicitatiegesprek oefenen',
    standardText: [
      'Tijdens het traject is met werknemer geoefend met het voeren van een sollicitatiegesprek. Hierbij is aandacht besteed aan het presenteren van zichzelf, het toelichten van de werkervaring en motivatie en het beantwoorden van veelvoorkomende vragen van werkgevers. Daarnaast is besproken hoe werknemer zich vooraf op een gesprek kan voorbereiden en welke vragen werknemer zelf aan een potentiële werkgever kan stellen.',
    ],
    instruction: 'Hier een persoonlijke toelichting geven wat er op dit vlak is ondernomen.',
  },
  {
    id: 'vacature_analyse',
    label: 'Vacature analyse',
    heading: 'Vacature analyse',
    standardText: [
      'In het kader van zelfredzaamheid, effectief zoeken en het vinden van vacatures zijn diverse activiteiten ondernomen. Onder andere het gebruiken van het eigen zoekprofiel bij het zoeken en analyseren van vacatures op geschiktheid. De werknemer heeft de nodige begeleiding gekregen om zelfstandig of onder begeleiding vacatures te analyseren op geschiktheid, aansluitend bij het belastbaarheidsprofiel (IZP/ FML/ LAB) van de werknemer.',
    ],
    instruction: 'Hier een persoonlijke toelichting geven wat er op dit vlak is ondernomen.',
  },
  {
    id: 'vacature_portals',
    label: 'Vacature portals',
    heading: 'Vacature portals',
    standardText: [
      'Als onderdeel van de sollicitatiestrategie heeft werknemer zich zelfstandig of onder begeleiding van de loopbaanadviseur aangemeld bij diverse vacature portals. Dit vergroot de zichtbaarheid van werknemer op de arbeidsmarkt en maakt het eenvoudiger om snel en gericht te reageren op passende vacatures. Daarnaast ontvangt de werknemer via deze platforms actuele vacatures en relevante suggesties, wat de kans op een succesvolle plaatsing vergroot.',
    ],
    instruction: 'Hier een persoonlijke toelichting geven wat er op dit vlak is ondernomen.',
  },
  {
    id: 'social_media',
    label: 'Social Media',
    heading: 'Social Media',
    standardText: [
      'Werknemer heeft ondersteuning gekregen hoe Social Media in te zetten bij het zoeken naar en reageren op passende vacatures. Daarnaast gebruikt werknemer Social Media om het persoonlijke en zakelijke netwerk (verder) uit te breiden. Werknemer heeft informatie verkregen hoe de verschillende platforms zoals LinkedIn, Facebook en Instagram te gebruiken voor het vinden van vacatures en het leggen van professionele connecties.',
    ],
    instruction: 'Geef hier een toelichting wat er op dit vlak is ondernomen.',
  },
  {
    id: 'overig',
    label: 'Overig (carrière events, banenmarkt of bezoek van open dagen)',
    heading: 'Overig',
    kind: 'overig',
    instruction: 'Geef hier een persoonlijke toelichting welke extra activiteiten zijn ingezet.',
  },
];

/* ------------------------------------------------------------------ */
/* 03 — D. Fase activatie en arbeidsbemiddeling                        */
/* ------------------------------------------------------------------ */

export const VGR_ACTIVATIE_ALGEMEEN =
  'In de fase van activatie en arbeidsbemiddeling ligt de nadruk op het vergroten van de kansen op de arbeidsmarkt. De interventies die in deze periode worden ingezet, helpen de werknemer om actief te solliciteren, het netwerk te benutten en waardevolle werkervaring op te doen. Ook wordt ondersteuning geboden bij het verkennen van vacatures en het vinden van passende mogelijkheden.';

export const VGR_ACTIVATIE_OPTIONS: VGRInterventionOption[] = [
  {
    id: 'analyse_interne_vacatures',
    label: 'Analyse interne vacatures',
    heading: 'Analyse interne vacatures',
    standardText: [
      'Wekelijks zijn de interne vacatures op de website van de werkgever geanalyseerd op geschiktheid. Indien er passende functies zijn, heeft werknemer hierop gesolliciteerd.',
    ],
    instruction:
      'Hier een persoonlijke toelichting geven wat er op dit vlak is ondernomen en aangeven of er taken en/of mogelijkheden zijn om een nieuwe functie te creëren binnen de eigen organisatie (Jobcarving).',
  },
  {
    id: 'activeringsplek',
    label: 'Activeringsplek en/of werkervaringsplaats en/of activiteiten in het kader van het 1e spoortraject',
    heading: 'Activeringsplek en/of werkervaringsplaats en/of activiteiten in het kader van spoor 1',
    aliases: ['Activeringsplek en/of werkervaringsplaats en/of activiteiten in het kader van spoor 1'],
    instruction:
      'Beschrijf feitelijk welke activerings-/werkervaringsactiviteiten of spoor 1-werkzaamheden plaatsvinden (uren, dagen, taken, sinds wanneer) en waarom deze bijdragen aan de re-integratie.',
  },
  {
    id: 'wekelijks_solliciteren',
    label: 'Wekelijks solliciteren',
    heading: 'Wekelijks solliciteren',
    standardText: [
      'Werknemer heeft wekelijks de benodigde (open) sollicitaties verstuurd. Daarnaast heeft de loopbaanadviseur tijd besteed aan jobhunten om de kansen van de werknemer op de arbeidsmarkt verder te vergroten. Ondanks dat de loopbaanadviseur de nodige ondersteuning biedt aan werknemer, blijft solliciteren de primaire verantwoordelijkheid van de werknemer.',
      'Voor meer informatie over de sollicitaties die door de werknemer zijn verricht verwijs ik u naar het bijgesloten sollicitatie overzicht, zie bijlage 2.',
    ],
    instruction:
      'Indien bovenstaande afwijkt, dan hier een toelichting geven, waarbij altijd een terugkoppeling van de BA nodig is ter onderbouwing als er niet gesolliciteerd wordt. Indien je een plaatsing hebt gerealiseerd (al dan niet parttime), dan ook hier toelichten.',
  },
  {
    id: 'jobhunting',
    label: 'Jobhunting en bemiddeling',
    heading: 'Jobhunting en bemiddeling',
    standardText: [
      'De loopbaanadviseur ondersteunt werknemer bij het vinden van passende vacatures en het solliciteren. Wanneer er geen passende vacatures beschikbaar zijn, ligt de focus op het verrichten van open sollicitaties. Met het zoekprofiel van de werknemer als uitgangspunt exploreert de loopbaanadviseur het eigen netwerk om kansrijke vacatures te vinden. Mogelijk passende vacatures worden voorgelegd aan de werknemer tijdens de sollicitatiebegeleiding. Solliciteren blijft echter de primaire verantwoordelijkheid van de werknemer.',
    ],
    instruction: 'Indien bovenstaande afwijkt, dan hier een toelichting geven. Ook als je iets hebt kunnen realiseren middels jobhunten, dan toelichten.',
  },
  {
    id: 'detachering',
    label: 'Detachering onderzoeken',
    heading: 'Detachering onderzoek',
    standardText: [
      'De inzet van detachering kan interessant zijn voor werkgever en werknemer. Wanneer de huidige functie van een werknemer niet meer passend is, kan detachering een werknemer helpen om de stap naar een werkplek buiten de eigen organisatie te maken. De werknemer krijgt de kans om nieuwe werkervaring op te doen en krijgt hierdoor (weer) vertrouwen in eigen kunnen. Een potentiële nieuwe werkgever kan via detachering nader kennis maken met de vaardigheden van de werknemer. Hiermee kan de kans op een passende betaalde functie aanzienlijk worden verhoogd. Bij detachering kan er na de WIA-beoordeling een contract worden aangeboden, wanneer de werkgever gebruik wil maken van de no-risk polis.',
    ],
    instruction: 'Indien bovenstaande afwijkt, dan hier een toelichting geven. Ook indien je iets hebt gerealiseerd, dan hier toelichten.',
  },
  { id: 'overig', label: 'Overig', heading: 'Overig', kind: 'overig', instruction: 'Geef hier een persoonlijke toelichting welke extra activiteiten zijn ingezet.' },
];

export const VGR_PERSPECTIEF_ALGEMEEN =
  'Als mobiliteitsbureau is het onze doelstelling om bij te dragen aan een inclusieve arbeidsmarkt. Wij richten ons op het potentieel van werknemers – dat draagt bij op het zien van nieuwe perspectieven, die vaak resulteren in passende participatie op de arbeidsmarkt.';

export const VGR_POW_METER_TEKST =
  'De PoW-meter™ - is een door ValentineZ ontwikkeld meetinstrument - dat inzicht geeft in iemands afstand tot de arbeidsmarkt. Daarbij wordt rekening gehouden met iemands belastbaarheid, beperkingen en mogelijkheden. Het instrument maakt duidelijk welke vorderingen er tijdens het traject worden gemaakt, op welk niveau iemand kan deelnemen aan de samenleving en welke interventies nodig zijn om een werknemer te laten stijgen op de PoW-meter™ - en zo de kansen op de arbeidsmarkt te vergroten. Tijdens de intake vindt de 0-meting plaats. Deze wordt samen met de gewenste interventies vastgelegd in het trajectplan. Tussentijdse metingen worden opgenomen in de voortgangsrapportages.';

export const VGR_POW_FOOTNOTE =
  '* De Perspectief op Werk meter (PoW-meter™) zegt niets over het opleidingsniveau of de werkervaring van de werknemer. Het is een momentopname, welke de huidige afstand tot de arbeidsmarkt grafisch weergeeft.';

/** Export-safe PoW reference chart (company asset already in the app). */
export const VGR_POW_CHART_SRC = '/pow-meter-v2.png';

export const VGR_POW_ROW_LABELS = {
  intake: 'PoW-meter™ trede bij het intakegesprek',
  huidig: 'PoW-meter™ huidige trede',
  doel: 'Doelstelling in de aankomende periode',
  uren: 'Huidige werkzame uren',
} as const;

export const VGR_POW_UREN_SUFFIX = 'uur per week, in aangepast of eigen werk bij eigen of andere werkgever';

/** INSTRUCTION */
export const VGR_POW_INSTRUCTIE =
  'Onderbouw hier waarom je iemand in een bepaalde trede hebt ingeschaald tijdens het intakegesprek (sociaal actief, activiteiten buitenshuis, aantal uren per week, werkzaam bij eigen of andere werkgever, al dan niet in aangepast werk). Pas bij elke voortgangsrapportage je onderbouwing aan; meest recente bovenaan. Voorspel geen hogere trede zonder onderbouwing.';

export function vgrVisieAdLead(naam: string, datumVoluit: string): string {
  const n = naam.trim() || 'de arbeidsdeskundige';
  const d = datumVoluit && datumVoluit !== '—' ? ` op ${datumVoluit}` : '';
  return `In het arbeidsdeskundig rapport opgesteld door ${n}${d} staat het volgende advies over passend arbeid:`;
}

export const VGR_VISIE_LA_TITLE = 'Visie loopbaanadviseur op mogelijk passende functies';

export function vgrVisieKansenZin(kansenLabel: string): string {
  const k = kansenLabel || '…';
  return `Gezien de opleiding, werkervaring en de vastgestelde medische beperkingen acht ValentineZ de kansen van werknemer op de vrije arbeidsmarkt op dit moment als “${k}”. Mocht de belastbaarheid van werknemer in de toekomst verbeteren, dan zullen ook de kansen op de arbeidsmarkt toenemen. In dat geval kunnen andere functies worden onderzocht als mogelijke opties voor passend werk.`;
}

export const VGR_VISIE_FUNCTIES_LEAD =
  'Naast de functies die de arbeidsdeskundige mogelijk als passend beschouwt denkt de loopbaanadviseur ook aan de volgende functies*:';

export const VGR_VISIE_FUNCTIES_FOOTNOTE =
  '*Dit is een momentopname en geen limitatieve opsomming. De genoemde functies zijn alleen onder voorwaarden passend. Voor alle werkzaamheden geldt dat rekening gehouden moet worden met de belastbaarheid zoals beschreven in het laatste belastbaarheidsprofiel (FML/IZP/LAB).';

export const VGR_LEERNAVIGATOR_INTRO =
  'Werknemer heeft gedurende het 2e spoortraject onderstaande vaardigheden ontwikkeld, taken verricht of inzicht verkregen in:';

export const VGR_LEERNAVIGATOR_BASIS_TITLE = 'Basisinterventies ontwikkeling';
export const VGR_LEERNAVIGATOR_ACTIVERING_TITLE = 'Activeringsinterventies';

export type LeernavigatorDef = { id: string; label: string; hasUren?: boolean };

export const VGR_LEERNAVIGATOR_BASIS_DEFS: LeernavigatorDef[] = [
  { id: 'talenten', label: 'De eigen talenten en valkuilen.' },
  { id: 'persoonsprofiel', label: 'Het eigen persoonsprofiel.' },
  { id: 'kansen_denken', label: 'In kansen en mogelijkheden te denken.' },
  { id: 'type_beroepen', label: 'Welke type beroepen (onder welke voorwaarde) passend zijn.' },
  { id: 'zoekprofiel', label: 'Het eigen zoekprofiel.' },
  { id: 'kans_geven', label: 'Iets een kans te geven om te ervaren of iets passend is.' },
  { id: 'cv', label: 'Het opstellen van een verzorgd curriculum vitae.' },
  { id: 'brief', label: 'Het schrijven van een gesloten en open sollicitatiebrief (al dan niet met hulp).' },
  { id: 'pc', label: 'Verbetering van de pc-vaardigheden.' },
  { id: 'taal', label: 'Verbetering van taalvaardigheden.' },
  { id: 'portals', label: 'Actief gebruik te maken van diverse vacatureportals.' },
  { id: 'webinars', label: 'Deelname aan diverse arbeidsgerelateerde webinars.' },
  { id: 'sollicitatie_week', label: 'Minimaal 1 keer per week een sollicitatieactiviteit verricht.' },
  { id: 'wep', label: '(Werk)ervaring opgedaan via een werkervaringsplaats/stage (WEP).' },
  { id: 'linkedin', label: 'Gebruik van LinkedIn om te netwerken en te solliciteren.' },
  { id: 'netwerkgesprek', label: 'Hoe een netwerkgesprek voor te bereiden en te voeren.' },
  { id: 'sollicitatiegesprek', label: 'Hoe een sollicitatiegesprek voor te bereiden en te voeren.' },
  { id: 'wia', label: 'De WIA-aanvraag.' },
];

export const VGR_LEERNAVIGATOR_ACTIVERING_DEFS: LeernavigatorDef[] = [
  { id: 'binnenshuis', label: 'Werknemer verricht minimaal 3x per week een activiteit binnenshuis.' },
  { id: 'buitenshuis', label: 'Werknemer komt minimaal 2x per week buitenshuis.' },
  { id: 'activiteiten_buitenshuis', label: 'Werknemer neemt minimaal 2x per week deel aan één of meerdere activiteiten buitenshuis.' },
  {
    id: 'spoor1',
    label: 'Werknemer re-integreert voor … uur per week bij de huidige werkgever in het kader van spoor 1 in eigen of aangepast werk.',
    hasUren: true,
  },
  { id: 'beschermd', label: 'Werknemer werkt in een beschermde werkomgeving voor … uur per week.', hasUren: true },
  { id: 'activeringsplek', label: 'Werknemer heeft een activeringsplek voor … uur per week.', hasUren: true },
  { id: 'scholing', label: 'Werknemer neemt deel aan scholing voor … uur per week.', hasUren: true },
  { id: 'wep', label: 'Werknemer heeft een werkervaringsplaats voor … uur per week.', hasUren: true },
  { id: 'parttime', label: 'Werknemer heeft een parttimebaan voor … uur per week.', hasUren: true },
  { id: 'detachering', label: 'Werknemer heeft een detacheringsplek voor … uur per week.', hasUren: true },
  { id: 'fulltime', label: 'Werknemer heeft een fulltime functie.' },
];

export function createLeernavigatorItems(defs: LeernavigatorDef[]): VGRLeernavigatorItem[] {
  return defs.map((d) => ({ id: d.id, label: d.label, checked: false, uren: '' }));
}

export function leernavigatorLabelWithUren(item: VGRLeernavigatorItem): string {
  if (!item.label.includes('…')) return item.label;
  const uren = item.uren.trim();
  return item.label.replace('…', uren || '…');
}

/* ------------------------------------------------------------------ */
/* 04 / 05                                                             */
/* ------------------------------------------------------------------ */

export const VGR_PLANNING_FOOTNOTE =
  '* Het solliciteren geschiedt volgens planning, aanvang sollicitatiefase wordt vervroegd indien werknemer daar eerder klaar voor is.';

export const VGR_PLANNING_LEGEND: [string, string][] = [
  ['G', 'gedaan / succesvol uitgevoerd'],
  ['P', 'nog in planning'],
  ['N', 'niet gedaan / geen succes'],
  ['U', 'in uitvoering'],
];

/** Conditional caveats for Bijlage 2 (rendered when relevant). */
export const VGR_APPLICATION_CAVEATS = {
  planning:
    '* Het solliciteren geschiedt conform planning, aanvang sollicitatiefase wordt vervroegd indien werknemer daar eerder klaar voor is.',
  teZwaar:
    '*Indien er onder status “te zwaar” staat betekent dit dat de functie in een (telefonisch) gesprek zijn/ haar belastbaarheid conform de laatst bekende FML/IZP/LAB overschrijdt. Dit is niet altijd vooraf goed in te schatten vandaar dat er wel is gesolliciteerd.',
  intern:
    '*Indien werknemer op interne vacatures is afgewezen dan zijn de redenen divers. Dat kan zijn omdat een functie in de praktijk te zwaar is (zijn/haar belastbaarheid conform de laatst bekende FML/IZP overschrijdt), maar ook omdat een andere interne sollicitant beter aansluit op de vacature.',
  voorwaarden:
    '*Voor alle vacatures waarop gesolliciteerd is geldt dat ze alleen onder voorwaarden passend zijn of passend te maken zijn.',
} as const;

export const VGR_APPLICATIONS_EMPTY_TEXT =
  'In de rapportageperiode zijn geen sollicitatieactiviteiten geregistreerd.';

/** INSTRUCTION — editor help only, never exported. */
export const VGR_APPLICATIONS_INSTRUCTIE =
  'Type activiteit: Sollicitatie, Open sollicitatie, Sollicitatiegesprek, Netwerkgesprek, Banenmarkt, Open Dag, Werkervaringsplek, Activeringsplek, Webinar. Status: in behandeling, afgewezen, vervuld (of te zwaar, met toelichting). Voeg alleen daadwerkelijke activiteiten toe; een lege bijlage is toegestaan.';

/* ------------------------------------------------------------------ */
/* Lookup helpers                                                      */
/* ------------------------------------------------------------------ */

export function findInterventionOption(
  options: VGRInterventionOption[],
  idOrLabel: string
): VGRInterventionOption | undefined {
  const needle = idOrLabel.trim().toLowerCase();
  return options.find(
    (o) =>
      o.id === idOrLabel ||
      o.label.toLowerCase() === needle ||
      o.heading.toLowerCase() === needle ||
      (o.aliases || []).some((a) => a.toLowerCase() === needle)
  );
}
