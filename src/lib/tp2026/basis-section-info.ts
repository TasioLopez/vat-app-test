import type { BasisEditorSectionId } from '@/lib/tp2026/basis-editor-sections';
import { TP2026_POW_OVERVIEW_TITLE } from '@/lib/tp2026/basis-profiel-field-order';

export type BasisSectionInfo = {
  title: string;
  body: string;
};

export const BASIS_SECTION_INFO: Partial<Record<BasisEditorSectionId, BasisSectionInfo>> = {
  inleiding: {
    title: 'Inleiding',
    body: `Ik heb de heer/mevrouw achternaam, hierna werknemer te noemen, gesproken op datum voluit schrijven. Werknemer is een 43-jarige vrouw die als gevolg van medische beperkingen is uitgevallen sinds 22 augustus 2024 voor zijn/haar functie als naam functie bij naam opdrachtgever. De functie heeft een urenomvang van 40 uur per week.

Functieomschrijving
Hier het doel van de functie omschrijven in maximaal 4 zinnen. Dit is soms terug te vinden in AD-rapport, of website van werkgever. Anders mogelijk functie en werkgever in Chat GPT plaatsen voor korte functieomschrijving. Let op: schrijf dit in verhalende vorm en geen gedetailleerde taakomschrijving in bulletvorm.

Werknemer is door functie aanmelder naam aanmelder namens naam organisatie aangemeld met het verzoek een 2e spoor re-integratietraject op te starten in het kader van de Wet Verbetering Poortwachter.

Werknemer vertelt openhartig over de reden van zijn/haar ziekmelding, de aanleiding hiervan en de samenhangende gezondheidsproblemen. Gezien de wetgeving verwerking persoonsgegevens worden er geen medische gegevens geregistreerd in dit rapport. Voor zijn/haar aandoeningen is/was werknemer onder behandeling binnen het reguliere medische zorgcircuit.

Ten tijde van het intakegesprek re-integreert werknemer niet/wel in spoor 1. Indien wel actief, hier het aantal uren per week vermelden en de vorm van re-integratie; aangepast werk, deels aangepast werk of eigen werk.

ValentineZ heeft uitgelegd wat het doel is van het 2e spoortraject. Werknemer geeft aan de noodzaak van het tweede spoor te begrijpen en mee te werken. Indien werknemer het anders ervaart, hier toelichten. In het tweede spoor traject zal o.a. onderzocht worden welke passende mogelijkheden er op de arbeidsmarkt zijn.

In het arbeidsdeskundigrapport opgesteld door naam arbeidsdeskundige op datum voluit schrijven staat het volgende advies ten aanzien van het inzetten van een tweede spoor traject:
"Zoek in AD-rapport naar quotes van AD-er om hier conclusie en advies te noteren."

Of: Tijdens het opstellen van het trajectplan was het arbeidsdeskundig rapport nog niet beschikbaar voor de loopbaanadviseur. Eventuele adviezen van de arbeidsdeskundige zullen worden verwerkt in de voortgangsrapportage.`,
  },

  sociale_achtergrond: {
    title: 'Sociale achtergrond & maatschappelijke context',
    body: `In dit onderdeel omschrijf je de sociale achtergrond en maatschappelijke context van de werknemer. Denk hierbij aan sport, hobby's, taal, thuissituatie, sociale steun, sociale contacten, al dan niet (zelfstandig) kunnen zorg dragen voor huishoudelijke taken en mogelijke bijzonderheden die het traject kunnen belemmeren. Houd deze beschrijving svp kort, treed niet te veel in details en vermijd privacygevoelige informatie (AVG).`,
  },

  visie_werknemer: {
    title: 'Visie van werknemer',
    body: `In dit onderdeel beschrijf je de visie van de werknemer. Ook beschrijf je hier de motivatie, mogelijk interessante functies (buiten de eigen organisatie), branches, voorkeuren en interesses die, door de werknemer, tijdens het intakegesprek zijn aangedragen.

Onderstaand voorbeeld ter inspiratie — let op: het is altijd maatwerk:

Werknemer geeft aan in het verleden met veel plezier bij haar werkgever te hebben gewerkt. Voor haar is werken niet alleen van belang vanuit financieel oogpunt, maar ook vanuit sociaal-maatschappelijk perspectief. Zij spreekt de wens uit om op termijn terug te keren in haar eigen functie.

Op dit moment ligt de focus voor werknemer op het verder opbouwen van haar uren in een aangepaste functie. Wanneer haar belastbaarheid dit toelaat, wil zij onderzoeken of een terugkeer naar haar eigen functie haalbaar is.

Zij staat open voor het verkennen van mogelijkheden binnen spoor 2, met als doel weer actief deel te nemen aan het arbeidsproces. Zij heeft zelf enkele mogelijke richtingen benoemd, waaronder functies zoals maatje voor thuis, zorg- en welzijnsmedewerker en persoonlijk begeleider. Binnen het tweede spoortraject zullen deze richtingen nader worden onderzocht en getoetst op haalbaarheid en passendheid.`,
  },

  persoonlijk_profiel: {
    title: 'Persoonlijk profiel',
    body: `In dit onderdeel beschrijf je het persoonsprofiel van de werknemer. Het persoonsprofiel wordt vastgesteld aan de hand van een inventarisatie van de opgedane arbeidservaring, specifieke vaardigheden, scholing, gevolgde cursussen, talenkennis, computer/type vaardigheden, rijbewijs. Indien geen rijbewijs geef aan hoe iemand zich verplaatst, daarnaast de mogelijkheden en de persoonsgebonden kenmerken van de werknemer.

Onderstaand 2 voorbeelden ter inspiratie — let op: het is altijd maatwerk:

Voorbeeld 1: Werknemer is een 43-jarige vrouw die ruim twintig jaar ervaring heeft als … bij …. bij …. In haar land van herkomst, Kaapverdië, heeft zij een vierjarige opleiding fysiotherapie afgerond en werkervaring opgedaan als fysiotherapeut. Dit diploma is echter niet geaccrediteerd in Nederland. Haar opleidingsniveau staat gelijk aan MBO-4.

Werknemer beschikt over rijbewijs B. Ze heeft echter geen eigen vervoer en maakt voornamelijk gebruik van het openbaar vervoer. Haar moedertalen zijn Portugees en Creools. Daarnaast spreekt zij redelijk Engels en heeft zij een beperkte beheersing van de Nederlandse taal, in zowel woord als schrift.

Wat betreft digitale vaardigheden, beschikt zij over basiskennis van MS Office, met name Word. Zij kan goed overweg met het gebruik van internet en mail. Werknemer heeft geen beschikking over een eigen computer.

Voorbeeld 2: Werknemer is een 62-jarige vrouw met een mbo-beroepskwalificatie als verpleegkundige. Zij heeft twintig jaar ervaring opgedaan in de zorgsector, in de functie van verpleegkundige en daarnaast als helpende. Tijdens haar loopbaan heeft zij diverse zorggerelateerde certificaten behaald. Daarnaast beschikt werknemer over een BIG-registratie.

Werknemer beschikt over een rijbewijs en een auto. Zij verplaatst zich per fiets of te voet naar haar werk. Zij beheerst zowel de Nederlandse als de Engelse taal, in woord en geschrift, en kan op basisniveau communiceren in het Duits.

Op het gebied van vaardigheden beschikt zij over basiscomputervaardigheden, zoals het gebruik van e-mail en internet. Werknemer beschikt niet over een computer.`,
  },

  prognose_bedrijfsarts: {
    title: 'Belastbaarheidsprofiel',
    body: `Werknemer heeft, in overeenstemming met de Functionele Mogelijkheden Lijst (FML) of het Inzetbaarheidsprofiel (IZP) van (datum), opgesteld door bedrijfsarts (naam vermelden), beperkingen in de volgende rubrieken:

Let op: indien niet van toepassing, hieronder verwijderen
• Persoonlijk functioneren
• Sociaal functioneren
• Aanpassing aan fysieke omgevingseisen
• Dynamische handelingen
• Statische houdingen
• Werktijden

Conform het belastbaarheidsprofiel (en/of de terugkoppeling van het medisch spreekuur), opgesteld op datum door naam bedrijfsarts, staat onderstaande vermeld.

Prognose:
"Citaat bedrijfsarts vermelden."
Let op: citaat cursief schrijven en tussen aanhalingstekens plaatsen.

Advies:
"Citaat bedrijfsarts vermelden."
Let op: citaat cursief schrijven en tussen aanhalingstekens plaatsen.
Let op: mits van toepassing, anders weglaten.`,
  },

  praktische_belemmeringen: {
    title: 'Praktische belemmeringen',
    body: `Hier kan, indien van toepassing, een toelichting worden opgenomen. Praktische belemmeringen zijn factoren die het tweede spoortraject kunnen belemmeren of (negatief) kunnen beïnvloeden. Denk hierbij aan mantelzorgverplichtingen voor een naast familielid of een vervoersbeperking die niet door de bedrijfsarts is vermeld. Let op dat dit AVG-proof wordt beschreven.

Indien er geen praktische belemmeringen van toepassing zijn, kan de volgende tekst worden opgenomen:
Er zijn, voor zover bekend, geen praktische belemmeringen die mogelijk van invloed zijn op het verloop van het tweede spoortraject.`,
  },

  advies_ad_passende_arbeid: {
    title: 'Advies passende arbeid',
    body: `Let op: indien er geen arbeidsdeskundig rapport beschikbaar is en/of er geen passende mogelijkheden zijn geduid, laat dit onderdeel dan volledig weg. Vermeld in dat geval de volgende zin: Tijdens het opstellen van het trajectplan was het arbeidsdeskundig rapport nog niet beschikbaar voor de loopbaanadviseur. Eventuele adviezen van de arbeidsdeskundige zullen worden verwerkt in de voortgangsrapportage.

In het arbeidsdeskundigrapport, opgesteld door naam arbeidsdeskundige, op datum (voluit) staat het volgende advies over passende arbeid:
"Uitspraak AD".
Let op: citaat cursief schrijven en tussen aanhalingstekens.
Let op: indien er geen arbeidsdeskundig rapport beschikbaar is, dan dit onderdeel weglaten.`,
  },

  pow_meter: {
    title: TP2026_POW_OVERVIEW_TITLE,
    body: `Inschaling POW-meter™
Huidige trede POW-meter™: Werknemer bevindt zich in trede … van de POW-meter™.
Huidige werkzame uren: bijvoorbeeld 2 x 2 uur per week binnen Spoor 1. Hierbij licht je toe of het in aangepast werk, deels aangepast werk, vrijwilligerswerk of eigen werk is en daarnaast het bij eigen of andere werkgever is. Pas dit afhankelijk van de situatie.
Verwachting over 3 maanden: Werknemer bevindt zich vermoedelijk in trede … van de POW-meter™. Onderbouw hierbij je visie. Hoe dit te bereiken.

Visie op plaatsbaarheid
Onderbouw hier waarom iemand tijdens de intake in een bepaalde trede van de POW-meter™ is ingeschaald. Dit wordt gebaseerd op factoren zoals de mate van sociale activiteit, deelname aan activiteiten buitenshuis, het aantal uren per week dat iemand actief is en of de werknemer werkzaam is bij de eigen werkgever of een andere werkgever, al dan niet in aangepast werk.

De verwachting is dat de werknemer binnen een bepaalde periode de stap naar een volgende trede zal maken. Let op: pas deze tekst hierop aan. Beschrijf hier specifieke interventies, zoals een stage of werkervaringsplek.

Voorbeeld (dit onderdeel dient als voorbeeld, deze tekst in het geheel verwijderen):
Werknemer bevindt zich op het moment van de intake in trede 2 van de POW-meter™. Werknemer gaat regelmatig de deur uit om boodschappen te doen en te fietsen. De verwachting is dat werknemer binnen drie maanden de stap naar trede 3 van de POW-meter™ zal maken. Werknemer staat open voor het starten op een werkervaringsplek in de nabije woonomgeving en heeft hierin zelf initiatief getoond om een passende werkplek te vinden. De mogelijkheden zullen binnen het tweede spoortraject nader worden onderzocht.`,
  },

  visie_loopbaanadviseur: {
    title: 'Visie van loopbaanadviseur',
    body: `Gezien de opleiding, werkervaring en de vastgestelde medische beperkingen acht ValentineZ de kansen van de werknemer op de vrije arbeidsmarkt op dit moment "voldoende". Mocht de belastbaarheid van de werknemer in de toekomst verbeteren, dan zullen ook haar kansen op de arbeidsmarkt toenemen. In dat geval kunnen andere functies worden onderzocht als mogelijke opties voor passend werk.

Mogelijk passende functies
Let op: als er geen arbeidsdeskundig rapport beschikbaar is, dan moet onderstaande zin worden aangepast naar:
Op basis van de eerder genoemde beperkingen en vaardigheden kunnen de volgende functies als passend worden beschouwd:

Let op: als er geen FML beschikbaar is, dan moet onderstaande zin worden aangepast naar:
Op basis van het persoonlijke profiel van de werknemer kan worden gesteld dat hij/zij over voldoende opleiding en werkervaring beschikt om geplaatst te worden op de huidige arbeidsmarkt. De loopbaanadviseur kan op dit moment echter geen volledig beeld geven van de plaatsbaarheid, aangezien het belastbaarheidsprofiel nog niet beschikbaar is. Zodra dit profiel beschikbaar is, zal de visie op mogelijk passende functies worden aangepast in de voortgangsrapportage.

Naast de functies die de arbeidsdeskundige mogelijk als passend beschouwt, denkt de loopbaanadviseur ook aan onderstaande functies:
• Functie + korte toelichting
• Functie + korte toelichting
• Functie + korte toelichting
• En soortgelijk*

*Dit is geen limitatieve opsomming. De genoemde functies zijn alleen onder voorwaarden passend. Ook andere werkmogelijkheden zullen in het 2e spoortraject onderzocht worden. Voor alle werkzaamheden geldt dat rekening gehouden moet worden met de belastbaarheid zoals beschreven in de meest recente FML/IZP/LAB.`,
  },

  zoekprofiel: {
    title: 'Zoekprofiel',
    body: `In dit onderdeel beschrijf je de (werk)ervaring van de werknemer. Werknemer heeft ervaring als (naam functie of functies). De werknemer beschikt over een (nader te beschrijven) werk- en denkniveau. Let erop dat alles positief wordt geformuleerd en dat bijvoorbeeld lichte beperkingen niet worden vermeld. Zie hiervoor het document "Opstellen zoekprofiel".

Vanwege de verminderde belastbaarheid van de werknemer, zoals vermeld in de Functionele Mogelijkheden Lijst of het Inzetbaarheidsprofiel (maak een keuze) opgesteld op 1 januari 2026, dient rekening te worden gehouden met de beperkingen op het gebied van (bijvoorbeeld persoonlijk en/of sociaal functioneren). Vul hier de beperkingen nader aan door deze concreet te beschrijven.

Bij het beschrijven van de beperkingen en belemmeringen wordt uitgegaan van de informatie die de bedrijfsarts hierover heeft gerapporteerd. Voor het vaststellen van de uit te voeren re-integratieactiviteiten dient rekening te worden gehouden met de afgegeven prognose van de bedrijfsarts. De Functionele Mogelijkheden Lijst of het Inzetbaarheidsprofiel wordt hierbij door de loopbaanadviseur geanalyseerd en als uitgangspunt genomen.

Onderstaand voorbeelden ter inspiratie:

Voorbeeld mentale en fysieke beperkingen:
Werknemer is aangewezen op functies op maximaal hbo-niveau. Dit sluit aan bij de kennis en ervaring die zij in de loop van haar arbeidshistorie en opleiding heeft opgebouwd. Binnen dit kader is zij in staat om geschoolde werkzaamheden te verrichten die aansluiten bij haar achtergrond als verkoopmedewerker, secretaresse, assistent accountmanager en administratief medewerker (financiën).

In onze zoektocht naar passende arbeid zullen we, naast haar wensen en persoonlijke profiel, ook rekening moeten houden met de beperkingen en voorwaarden in het Inzetbaarheidsprofiel, opgesteld op 1 januari 2026. Zij functioneert het beste in een werksituatie met een lage werkdruk, structuur en zo min mogelijk onderbrekingen. Zij is gebaat bij uitvoerende en ondersteunende taken zonder leidinggevende verantwoordelijkheden of direct klantcontact, waarbij rekening wordt gehouden met situaties die emotioneel belastend of conflictueus kunnen zijn. Daarnaast komt zij goed tot haar recht in functies waarin zij haar talenkennis van Engels, Oekraïens of Russisch kan benutten.

Werknemer werkt het prettigst bij overwegend zittend werk, waarin zij haar houding regelmatig kan afwisselen, voornamelijk op lichaamshoogte kan werken en haar knieën in een rechte houding kan houden. Trillingen dienen te worden vermeden en haar hoofd dient in een comfortabele, natuurlijke stand gehouden te kunnen worden.

Er zal worden gezocht naar fysiek licht werk waarbij het mogelijk is om van houding te wisselen en te pauzeren. Zij kan overdag gemiddeld zes uur per dag werken.

Voorbeeld mentale beperkingen:
Werknemer is aangewezen op functies op maximaal hbo-niveau. Dit sluit aan bij de kennis en ervaring die zij in de loop van haar arbeidshistorie en opleiding heeft opgebouwd. De focus ligt op functies met een licht en overzichtelijk takenpakket, waarin werkzaamheden een vast karakter hebben en binnen duidelijke grenzen worden uitgevoerd.

In onze zoektocht naar passende arbeid zullen we, naast haar wensen en persoonlijke profiel, ook rekening moeten houden met de beperkingen en voorwaarden in het Inzetbaarheidsprofiel, opgesteld op 1 januari 2026. Werknemer functioneert het best in een rustige, gestructureerde werkomgeving met voorspelbare werkzaamheden, waarbij geen hoge eisen worden gesteld aan het herinneren, vasthouden en verdelen van aandacht. Zij is gebaat bij een werksituatie met duidelijke structuur en afgebakende taken. Daarnaast functioneert zij het beste in een omgeving waarin zij niet of nauwelijks wordt afgeleid door activiteiten van anderen. Wisselende taken of snel veranderende omstandigheden zijn voor haar belastend.

Werknemer kan samenwerken, mits zij beschikt over een afgebakende en zelfstandig uitvoerbare deeltaak. In sociaal contact is zij kwetsbaar, vooral wanneer het gaat om het omgaan met emotionele problematiek van anderen. Hoewel zij hierin in gedrag voldoende afstand kan bewaren, lukt dit niet altijd in beleving. Conflicten kan zij uitsluitend hanteren in schriftelijk of telefonisch contact, en niet in direct verbaal contact met agressieve of onredelijke personen.

Binnen deze functiekenmerken is duurzame inzetbaarheid mogelijk, mits het werkpatroon geleidelijk wordt opgebouwd en aansluit bij een bestendig werkritme binnen vastgestelde grenzen.`,
  },
};
