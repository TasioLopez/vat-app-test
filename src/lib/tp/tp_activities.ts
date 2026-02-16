// src/lib/tp/activities.ts
export type TPActivitySelection = { id: string; subText?: string | null };

export type TPActivity = {
  id: string;
  title: string;
  body: string;
  subTextTemplates?: [string, string, string];
};

/** Normalize tp3_activities from DB: support legacy string[] or new { id, subText }[]. */
export function normalizeTp3Activities(raw: unknown): TPActivitySelection[] {
  if (!Array.isArray(raw)) return [];
  if (raw.length === 0) return [];
  if (raw.every((x): x is string => typeof x === "string")) {
    return raw.map((id) => ({ id, subText: null }));
  }
  return raw
    .filter((x): x is { id: string; subText?: string | null } => typeof x === "object" && x !== null && "id" in x && typeof (x as { id: unknown }).id === "string")
    .map((x) => ({ id: x.id, subText: x.subText ?? null }));
}

export function getBodyMain(activity: TPActivity): string {
  return activity.body;
}

export const TP_ACTIVITIES: TPActivity[] = [
  {
    id: "verwerking-verlies-acceptatie",
    title: "Verwerking verlies en acceptatie",
    body: `Een andere baan moeten zoeken is voor veel werknemers een zeer ‘grote’ stap. Zeker als iemand door ziekte zelf niets aan de situatie kan doen. Een werknemer voelt zich dan vaak extra gestraft omdat ze, naast het accepteren van hun ziekte, ook te horen krijgen dat er geen passend werk meer is binnen de organisatie. Het verlies van een baan vertegenwoordigt vaak meer dan alleen het verlies van een bron van inkomen. Het staat ook voor het verlies van vertrouwde routines, een gevoel van stabiliteit, een bekende werkomgeving, hechte banden met collega's en vrienden, en financiële zekerheid. Aan de hand van een aantal sessies proberen we werknemer te begeleiden in het verwerken en accepteren van het verlies van een baan, het los te laten en de werknemer te motiveren om verder te kijken.`,
    subTextTemplates: [
      "Werknemer is bereid om in gesprekken het verlies van de baan te verwerken en stappen te zetten richting een nieuwe toekomst.",
      "De loopbaanadviseur ondersteunt werknemer bij het verwerken van het baanverlies en het vinden van een nieuwe richting.",
      "Verwerking en acceptatie van het verlies maken onderdeel uit van de begeleiding; werknemer staat hiervoor open.",
    ],
  },
  {
    id: "empowerment",
    title: "Empowerment",
    body: `Soms is een werknemer nog niet staat om tot actie over te gaan, bijvoorbeeld wanneer iemand te somber is, te weinig energie heeft en/ of zichzelf te veel als slachtoffer ziet. In dat geval biedt de loopbaan adviseur tijdens de begeleiding ook empowerment aan, door de inzet van gesprekstechnieken en huiswerkopdrachten. We maken hierbij gebruik van de methodiek ’weten, willen, kunnen, doen’. Empowerment betekent sterker maken: iemand de controle (terug)geven over zijn of haar leven. Wij zorgen ervoor dat iemand weer de regie neemt, zelf in staat is om zijn of haar problemen op te lossen. Stappen die daarbij moeten worden gemaakt: herstellen van zelfvertrouwen, geloof in eigen mogelijkheden, inzicht in de invloed die je kunt uitoefenen op je toekomst en het doorbreken van negatieve gedachtenpatronen. Dit alles met als doel om weer vertrouwen te krijgen en in eigen kunnen en mogelijkheden te gaan geloven.`,
    subTextTemplates: [
      "Werknemer is gemotiveerd om met de methodiek weten, willen, kunnen, doen aan de slag te gaan en de regie te hernemen.",
      "Empowerment wordt ingezet waar nodig; werknemer staat open voor gesprekken en huiswerkopdrachten die het zelfvertrouwen versterken.",
      "De loopbaanadviseur zet empowerment in zodat werknemer weer vertrouwen krijgt in eigen kunnen.",
    ],
  },
  {
    id: "orientatie",
    title: "Oriëntatie",
    body: `Om alle passende mogelijkheden goed te kunnen onderzoeken en zoveel mogelijk kansrijke bemiddelingsberoepen te formuleren besteden we tijdens de oriëntatie veel tijd en aandacht aan iemands persoonlijkheid, competenties en beroepen. De mogelijk passende beroepen zullen we vervolgens toetsen op haalbaarheid aan de hand van beschikbare vacatures op de arbeidsmarkt en de FML/ IZP/ LAB. Daarnaast zal een interesse- en competentietest worden ingezet als blijkt dat de werknemer niet duidelijk weet wat de concrete beroepsmogelijkheden zijn op de arbeidsmarkt. Door middel van de test(en) krijgt de werknemer in korte tijd een helder beeld van zijn wensen en mogelijkheden op de arbeidsmarkt. Dit resulteert in een persoonlijk zoekprofiel, waarmee de basis wordt gelegd voor de sollicitatiebegeleiding en jobhunting (zie de verdere beschrijving in dit document).`,
    subTextTemplates: [
      "Werknemer staat open voor een oriëntatie op persoonlijkheid, competenties en beroepen; een interesse- of competentietest kan worden ingezet indien nodig.",
      "Tijdens de oriëntatie wordt gewerkt aan een persoonlijk zoekprofiel dat aansluit bij de mogelijkheden van werknemer.",
      "De loopbaanadviseur begeleidt werknemer bij het in kaart brengen van wensen en mogelijkheden op de arbeidsmarkt.",
    ],
  },
  {
    id: "scholing",
    title: "Scholing",
    body: `Scholing zal alleen ingezet worden als het noodzakelijk blijkt, hierbij wordt het uitgangspunt van redelijkheid en billijkheid toegepast, wat inhoudt dat het om een relatief korte cursus/ opleiding dient te gaan en de kosten naar verhouding zijn. Alle cursussen en opleidingen worden altijd ter goedkeuring voorgelegd aan de werkgever.`,
    subTextTemplates: [
      "Werknemer staat open om de mogelijkheden voor scholing of cursus te onderzoeken. Een cursus MS-Office zou van toegevoegde waarde kunnen zijn voor werknemer en ze zou hiervoor open staan.",
      "Werknemer is bereid om scholingsmogelijkheden te verkennen indien dit het traject ondersteunt.",
      "Scholing wordt alleen ingezet wanneer dit noodzakelijk is; werknemer staat open voor een korte, passende cursus.",
    ],
  },
  {
    id: "social-media",
    title: "Social Media",
    body: `Tegenwoordig speelt (digitaal) netwerken en solliciteren een belangrijke rol in het vinden van een nieuwe baan. Daarom zal het gebruik van Social Media, met name LinkedIn, een onderdeel zijn van begeleiding. De werknemer maakt zelfstandig (of onder begeleiding) een LinkedIn profiel en leert het eigen netwerk in kaart te brengen, te ontwikkelen en te gebruiken voor het vinden van een baan.`,
    subTextTemplates: [
      "Werknemer heeft genoeg pc-vaardigheden, voor specifieke Social mediapresentatie zal de loopbaanadviseur de nodige begeleiding bieden.",
      "Werknemer kan met ondersteuning van de loopbaanadviseur een professioneel LinkedIn-profiel opzetten.",
      "Voor het optimaal gebruik van social media bij solliciteren biedt de loopbaanadviseur de benodigde begeleiding.",
    ],
  },
  {
    id: "webinars",
    title: "Webinars",
    body: `ValentineZ biedt verschillende webinars aan waar werknemer gebruik van kan maken. Werknemer zal op basis van vaardigheden en behoefte een voorstel op maat. De webinars zijn erop gericht om op een laagdrempelige manier kennis te verkrijgen over verschillende (sollicitatie)vaardigheden. Omdat de webinars online (live) zijn bij te wonen en/ of terug te kijken kan werknemer dit laten aansluiten op zijn/ haar persoonlijke omstandigheden.`,
    subTextTemplates: [
      "Werknemer heeft genoeg pc-vaardigheden om via de pc webinars te volgen, loopbaan adviseur zal hierin adviseren welke nuttig kunnen zijn voor werknemer.",
      "Werknemer kan webinars volgen; de loopbaanadviseur adviseert welke webinars het meest passend zijn.",
      "Online webinars sluiten aan bij de mogelijkheden van werknemer; advies over keuze volgt van de loopbaanadviseur.",
    ],
  },
  {
    id: "sollicitatievaardigheden-en-sollicitatietools",
    title: "Sollicitatievaardigheden en sollicitatietools",
    body: `De sollicitatiebegeleiding van ValentineZ is volledig maatwerk en wordt ondersteund vanuit de persoonlijke begeleiding die we werknemers bieden. Solliciteren is een vaardigheid die veel werknemers lang niet meer actief hebben uitgeoefend en soms ook grotendeels verleerd zijn. Wij helpen de werknemer bij het opstellen of bijwerken van een curriculum. Daarnaast laten wij werknemer zien waar vacatures te zoeken en te vinden, die aansluiten bij het persoonlijke zoekprofiel. Ook begeleiden we werknemer bij de geschreven en ongeschreven wetten van het schrijven van een sollicitatiebrief of motivatiebrief en wordt er aandacht besteed aan correct en overtuigend taalgebruik. We informeren werknemers waar, indien nodig, taaladvies in te winnen wanneer het opstellen van een sollicitatiebrief of motivatiebrief niet binnen de mogelijkheden ligt.`,
    subTextTemplates: [
      "Werknemer zal de nodige begeleiding van de loopbaanadviseur ontvangen op het gebied van solliciteren en sollicitatietools. De cv van werknemer zal samen met de loopbaanadviseur worden nagelopen en aangepast/aangevuld.",
      "CV en sollicitatievaardigheden worden samen met de loopbaanadviseur op maat bijgewerkt.",
      "De loopbaanadviseur ondersteunt werknemer bij cv, sollicitatiebrieven en het gebruik van sollicitatietools.",
    ],
  },
  {
    id: "solliciteren",
    title: "Solliciteren",
    body: `Aan de hand van de opgestelde FML/ IZP/ LAB, het zoekprofiel en de wensen van werknemer zal er wekelijks gesolliciteerd worden op passende vacatures. Het solliciteren is een mix van het solliciteren op bestaande vacatures, het versturen van open sollicitaties, het reageren op vacatures bij de eigen werkgever, het bezoeken van netwerkbijeenkomsten, het inschrijven bij verschillende uitzendbureaus, het volgen van webinars en trainingen, bellen met mogelijke werkgevers en het verrichtten van diverse netwerk-activiteiten.`,
    subTextTemplates: [
      "Werknemer zal wekelijks actief solliciteren op passende vacatures, in overleg met de loopbaanadviseur.",
      "Solliciteren gebeurt op basis van het zoekprofiel en de FML/IZP/LAB; werknemer neemt hierin actief deel.",
      "De loopbaanadviseur ondersteunt bij het vinden en beantwoorden van vacatures; werknemer zet wekelijks stappen.",
    ],
  },
  {
    id: "stage-en-werkervaringsplek",
    title: "Stage & werkervaringsplek",
    body: `Als de belastbaarheid het toelaat en werknemer nog geen passende arbeid heeft gevonden zullen wij de werknemer proberen te bemiddelen naar een werkervaringsplek. Het liefst een werkervaringsplek met een mogelijke kans op betaalde arbeid. De belangrijkste doelstellingen van een werkervaringsplek zijn: het doorbreken van sociaal isolement en het opbouwen van werknemersvaardigheden.`,
    subTextTemplates: [
      "Werknemer staat open voor een werkervaringsplek zodra de belastbaarheid het toelaat, bij voorkeur met kans op betaald werk.",
      "Indien passend wordt werknemer bemiddeld naar een stage of werkervaringsplek om vaardigheden op te bouwen.",
      "De loopbaanadviseur zoekt mee naar een geschikte werkervaringsplek die aansluit bij de mogelijkheden van werknemer.",
    ],
  },
  {
    id: "detachering",
    title: "Detachering",
    body: `Detacheren kan een interessante oplossing zijn voor beide partijen, zeker als werknemer zijn of haar huidige functie maar moeilijk kan loslaten. Detachering helpt om de stap richting een andere werkplek te maken. Ook de vrees van alles verliezen kan hiermee veelal worden weggenomen, doordat de werknemer ervaring opdoet en weer vertrouwen krijgt in eigen kunnen. Nieuwe werkgevers durven een werknemer (met beperkingen) makkelijker aan te nemen wanneer ze geen risico lopen. Bij detachering kan de nieuwe werkgever pas een contract aanbieden wanneer een werknemer door de WIA-poort is, dit om een beroep te kunnen doen op een no-risk polis.`,
    subTextTemplates: [
      "Werknemer staat open voor detachering als tussenstap richting een andere werkgever wanneer dit passend is.",
      "Detachering kan worden verkend als werknemer de huidige functie moeilijk kan loslaten; de loopbaanadviseur licht de mogelijkheden toe.",
      "Indien detachering een passende route is, wordt werknemer hierin begeleid en bemiddeld.",
    ],
  },
  {
    id: "bemiddeling-en-jobhunting",
    title: "Bemiddeling & Jobhunting",
    body: `Door het inzetten van bemiddeling wordt werknemer ondersteund bij het vinden van vacatures en het reageren daarop. Als er geen passende vacatures zijn wordt werknemer geholpen met het versturen van open sollicitaties. Daarnaast zoekt de jobhunter van ValentineZ actief mee met de werknemer naar een passende betaalde baan. Met het zoekprofiel van de beroepsoriëntatie en de FML/ IZP/ LAB als vertrekpunt, exploreert de jobhunter zijn netwerk van contactpersonen bij verschillende organisaties op zoek naar passende, kansrijke vacatures. Deze vacatures worden vervolgens voorgelegd aan de werknemer tijdens de sollicitatiebegeleiding of persoonlijke gesprekken. Solliciteren blijft echter primair de eigen verantwoordelijkheid van de werknemer.`,
    subTextTemplates: [
      "De jobhunter van ValentineZ zoekt actief mee naar passende vacatures; werknemer reageert op voorgelegde kansen.",
      "Werknemer wordt ondersteund bij het vinden van vacatures en open sollicitaties; bemiddeling en jobhunting maken onderdeel uit van het traject.",
      "Met het zoekprofiel als basis zoekt de loopbaanadviseur mee naar kansrijke vacatures; werknemer neemt sollicitaties zelf ter hand.",
    ],
  },
];

export default TP_ACTIVITIES;