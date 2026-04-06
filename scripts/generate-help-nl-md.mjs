import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "content", "help", "nl");

const articles = [
  ["inloggen-sessie-timeout.md", `---
slug: inloggen-sessie-timeout
title: Inloggen en sessie
excerpt: Aanmelden, sessies en toegang tot het dashboard.
category_slug: account-access
translation_group_id: 8e44c61b-c047-4914-9de6-e2608958c2ad
locale: nl
---

# Inloggen en sessie

Meld u aan via de inlogpagina met e-mail en wachtwoord. Na succes komt u op het dashboard.

Sessies kunnen verlopen bij inactiviteit of na uitloggen. Meld u dan opnieuw aan.

Bij wachtwoordproblemen gebruikt u waar beschikbaar de optie wachtwoord vergeten op de inlogpagina.
`],
  ["admin-vs-standaard-gebruiker.md", `---
slug: admin-vs-standaard-gebruiker
title: Admin en standaardgebruiker
excerpt: Welke menus en gegevens zichtbaar zijn per rol.
category_slug: account-access
translation_group_id: e445d044-bb61-4f9d-a66c-23e580b49b12
locale: nl
---

# Rollen

## Beheerder

Ziet alle werkgevers, werknemers en TP-documenten. Heeft Gebruikers en Helpbeheer.

## Standaardgebruiker

Ziet alleen gekoppelde werkgevers en werknemers en bijbehorende documenten.

Ontbreekt een menu-item, vraag dan een beheerder om koppeling of rol.
`],
  ["account-veiligheid-uitloggen.md", `---
slug: account-veiligheid-uitloggen
title: Uitloggen en veiligheid
excerpt: Veilig omgaan met uw account op gedeelde computers.
category_slug: account-access
translation_group_id: f567a728-61bb-491a-95f1-823d255d985f
locale: nl
---

# Uitloggen en veiligheid

Log onderaan het menu uit, vooral op gedeelde computers.

Wijzig uw wachtwoord via Instellingen indien nodig.

Deel geen inloggegevens met anderen.
`],
  ["dashboard-wat-zie-ik.md", `---
slug: dashboard-wat-zie-ik
title: Wat toont het dashboard?
excerpt: Kaarten, tellingen en het doel van de startpagina.
category_slug: dashboard
translation_group_id: f0d5e9ea-fe94-43d2-9ccc-eec14c21af6f
locale: nl
---

# Het dashboard

De startpagina geeft een kort overzicht: aantallen en snelkoppelingen die voor u relevant zijn.

Beheerders zien organisatiebrede totalen. Standaardgebruikers zien data beperkt tot eigen gekoppelde werknemers.

Gebruik tegels en links om verder te gaan.
`],
  ["dashboard-snel-naar-werknemer.md", `---
slug: dashboard-snel-naar-werknemer
title: Snel naar een werknemer of dossier
excerpt: Van het dashboard naar werknemers en trajectplan.
category_slug: dashboard
translation_group_id: 53dae159-fdb5-447e-9b1e-762b643772e2
locale: nl
---

# Snel verder

Open recente werknemers vanaf het dashboard als die sectie zichtbaar is.

Anders via het menu Werknemers zoeken en het dossier openen, of TP Docs voor PDFs.
`],
  ["werknemer-aanmaken-en-bewerken.md", `---
slug: werknemer-aanmaken-en-bewerken
title: Werknemer aanmaken en bewerken
excerpt: Nieuwe werknemer, gegevens en werkgever kiezen.
category_slug: werknemers
translation_group_id: 5945c9bc-1d52-4bdc-91d4-5fecf9599533
locale: nl
---

# Werknemers

Ga naar Werknemers voor de lijst. Maak een nieuwe werknemer aan en kies de juiste werkgever.

Open een werknemer om naam, contact en overige velden te wijzigen.

Zonder werkgever kan een werknemer niet goed in het dossier worden geplaatst.
`],
  ["werknemer-koppelen-aan-gebruiker.md", `---
slug: werknemer-koppelen-aan-gebruiker
title: Werknemer koppelen aan een gebruiker
excerpt: Wie mag welk dossier zien als standaardgebruiker.
category_slug: werknemers
translation_group_id: 5f4cfd96-cd54-47c8-80fc-a2e963d9c1c6
locale: nl
---

# Koppeling gebruiker en werknemer

Standaardgebruikers zien alleen werknemers waaraan zij zijn gekoppeld. Een beheerder koppelt gebruikers aan werknemers (via gebruikersbeheer of het werknemersrecord, afhankelijk van uw inrichting).

Zonder koppeling verschijnt een werknemer niet in uw lijst.
`],
  ["trajectplan-starten-vanuit-werknemer.md", `---
slug: trajectplan-starten-vanuit-werknemer
title: Trajectplan Bouwer openen vanuit een werknemer
excerpt: Van werknemer naar de vijf stappen van het trajectplan.
category_slug: werknemers
translation_group_id: 64ac3727-1480-4558-a93c-e8ff658f5039
locale: nl
---

# Trajectplan starten

Open het detail van een werknemer en start de Trajectplan Bouwer (link of knop op de werknemerpagina).

U doorloopt vijf stappen: voorblad, gegevens werknemer, TP deel 3, bijlage 1 en eindecontrole.

Zie ook het overzichtsartikel over de Trajectplan Bouwer.
`],
  ["trajectplan-bouwer-werkwijze.md", `---
slug: trajectplan-bouwer-werkwijze
title: Trajectplan Bouwer: werkwijze
excerpt: Stappen, voortgang en niet-opgeslagen wijzigingen.
category_slug: trajectplan-builder
translation_group_id: db778ef3-8ed5-4488-b2bc-a9ca85fc395a
locale: nl
---

# Trajectplan Bouwer

De bouwer bestaat uit vijf stappen met een voortgangsbalk bovenaan. Gebruik Terug en Volgende om tussen stappen te gaan.

## Opslaan

Sla uw werk op volgens de knoppen op het scherm. Als u het venster sluit met openstaande wijzigingen, kan de applicatie waarschuwen: bevestig of sla eerst op.

## Tips

Werk stap voor stap; u kunt later terug naar eerdere stappen via Terug.

Zie per stap de aparte hulpitems onder Trajectplan Bouwer.
`],
  ["tp-stap-voorblad.md", `---
slug: tp-stap-voorblad
title: Stap 1: Voorblad
excerpt: Titelpagina en basis van het trajectplan.
category_slug: tp-part-1
translation_group_id: d8f7e71e-a1ec-4523-96b8-96c122f579c6
locale: nl
---

# Voorblad

Vul de gegevens in voor de titelpagina van het trajectplan. Controleer spelling van naam en titels.

Ga daarna naar stap 2: Gegevens werknemer.
`],
  ["tp-stap-gegevens-werknemer.md", `---
slug: tp-stap-gegevens-werknemer
title: Stap 2: Gegevens werknemer
excerpt: Persoons- en adresgegevens voor het plan.
category_slug: tp-part-2
translation_group_id: 78798091-db3f-40e6-b251-0da038213fa2
locale: nl
---

# Gegevens werknemer

Vul de gevraagde persoons- en contactgegevens zorgvuldig in. Deze worden gebruikt in het document.

Controleer het e-mailadres en postadres voordat u verder gaat naar TP deel 3.
`],
  ["tp-stap-deel-drie.md", `---
slug: tp-stap-deel-drie
title: Stap 3: TP deel 3
excerpt: Hoofddeel van het trajectplan invullen.
category_slug: tp-part-3
translation_group_id: b75af4bf-a66e-4a37-8781-187fb1a87352
locale: nl
---

# TP deel 3

Dit is het hoofddeel van het trajectplan. Vul alle verplichte secties in volgens uw interne richtlijnen.

Gebruik waar beschikbaar hulpteksten of automatische invulling in de velden.

Daarna volgt Bijlage 1.
`],
  ["tp-stap-bijlage-een.md", `---
slug: tp-stap-bijlage-een
title: Stap 4: Bijlage 1
excerpt: Aanvullende informatie en bijlagen.
category_slug: tp-part-4
translation_group_id: ae23d840-2af9-430c-bf7a-e58d974da49c
locale: nl
---

# Bijlage 1

Vul de bijlage in zoals vereist voor dit dossier. Controleer of alle verwijzingen kloppen.

Ga vervolgens naar Eindecontrole.
`],
  ["tp-stap-eindcontrole.md", `---
slug: tp-stap-eindcontrole
title: Stap 5: Eindecontrole
excerpt: Controleren en afronden van het trajectplan.
category_slug: tp-part-5
translation_group_id: 99c06522-3dc0-4b9e-8a33-5c395095da28
locale: nl
---

# Eindecontrole

Controleer alle stappen op volledigheid. Los ontbrekende velden op voordat u exporteert of afrondt.

Sla het resultaat op volgens de instructies op het scherm.
`],
  ["tp-documenten-wat-zijn-dit.md", `---
slug: tp-documenten-wat-zijn-dit
title: Wat zijn TP-documenten?
excerpt: Bibliotheek van trajectplan-PDFs per werknemer.
category_slug: tp-documenten
translation_group_id: 19b36c49-48d4-4444-8fa6-b374b19982a7
locale: nl
---

# TP-documenten

Onder TP Docs vindt u trajectplanbestanden (meestal PDF) gekoppeld aan werknemers. U ziet titel, werknemer, werkgever en datum.

Open een regel om het bestand te downloaden of te bekijken, afhankelijk van uw browser.
`],
  ["tp-documenten-wie-ziet-wat.md", `---
slug: tp-documenten-wie-ziet-wat
title: TP-documenten: wie ziet wat?
excerpt: Verschil tussen beheerder en standaardgebruiker.
category_slug: tp-documenten
translation_group_id: f7057508-a4e6-4d54-b03b-19fda2239385
locale: nl
---

# Zichtbaarheid

Beheerders zien documenten voor alle werknemers.

Standaardgebruikers zien alleen documenten van werknemers waaraan zij zijn gekoppeld.

Ziet u een lege lijst, controleer dan uw koppelingen of vraag een beheerder om toegang.
`],
  ["zoeken-in-helpartikelen.md", `---
slug: zoeken-in-helpartikelen
title: Zoeken in helpartikelen
excerpt: Zoekveld en resultaten op de help-startpagina.
category_slug: helpcentrum
translation_group_id: 7a9c50c4-b844-4d22-b657-88547680e078
locale: nl
---

# Zoeken

Op de help-startpagina vult u minimaal twee tekens in. Na korte tijd verschijnen suggesties met titel en korte tekst.

Klik een resultaat om het volledige artikel te lezen.
`],
  ["help-chat-wanneer-gebruiken.md", `---
slug: help-chat-wanneer-gebruiken
title: Wanneer de helpchat gebruiken?
excerpt: Chat combineert kennisartikelen met een antwoord in eigen woorden.
category_slug: helpcentrum
translation_group_id: 3068d34d-88ca-4514-8e1c-712f4cae7dc8
locale: nl
---

# Helpchat

Open Help en kies de chat. Stel een concrete vraag; het systeem zoekt in de kennisbank en formuleert een antwoord.

De chat is geschikt voor snelle vragen. Voor storingen of toegang tot specifieke data kan een ticket nodig zijn.

Antwoorden kunnen fouten bevatten; controleer kritische stappen altijd in de artikelen.
`],
  ["support-ticket-indienen.md", `---
slug: support-ticket-indienen
title: Supportticket indienen
excerpt: Onderwerp, categorie en beschrijving.
category_slug: helpcentrum
translation_group_id: c19ba2ac-cff4-4d36-9e4e-1a718d094162
locale: nl
---

# Ticket indienen

Ga naar het ticketoverzicht en maak een nieuw ticket. Kies een categorie, geef een duidelijk onderwerp en beschrijf het probleem of de vraag.

Voeg toe wat u al heeft geprobeerd en eventuele foutmeldingen. Dat versnelt de afhandeling.
`],
  ["support-ticket-status-en-berichten.md", `---
slug: support-ticket-status-en-berichten
title: Ticket opvolgen: status en berichten
excerpt: Open, in behandeling, opgelost en berichten lezen.
category_slug: helpcentrum
translation_group_id: ca62b0d4-1765-45bf-ba60-bb9fefef4df9
locale: nl
---

# Opvolging

Open uw ticket om de status te zien (bijvoorbeeld open, in behandeling, opgelost).

Lees berichten van de servicedesk en antwoord indien om extra informatie wordt gevraagd.

Alleen beheerders zien interne notities; die verschijnen niet bij u als aanvrager.
`],
  ["instellingen-tab-overzicht.md", `---
slug: instellingen-tab-overzicht
title: Instellingen: overzicht
excerpt: Profiel, wachtwoord en Mijn Stem tabs.
category_slug: instellingen
translation_group_id: 19602839-3520-48e3-b6dc-81be85c1f37c
locale: nl
---

# Instellingen

Onder Instellingen vindt u tabs voor profiel, wachtwoord wijzigen en Mijn Stem.

Schakel tussen tabs links; de inhoud verschijnt rechts.
`],
  ["profiel-gegevens-wijzigen.md", `---
slug: profiel-gegevens-wijzigen
title: Profielgegevens wijzigen
excerpt: Naam en overige profielvelden.
category_slug: instellingen
translation_group_id: 9a4bbf1e-f8cd-44d7-9034-a223972c6f9f
locale: nl
---

# Profiel

Open de tab Profiel informatie. Wijzig de toegestane velden en sla op.

Sommige velden kunnen alleen door een beheerder worden aangepast.
`],
  ["wachtwoord-wijzigen.md", `---
slug: wachtwoord-wijzigen
title: Wachtwoord wijzigen
excerpt: Huidig wachtwoord en nieuw wachtwoord instellen.
category_slug: instellingen
translation_group_id: 28b56478-c913-4c5a-bf87-af131db06aef
locale: nl
---

# Wachtwoord

Ga naar de tab Wachtwoord wijzigen. Voer uw huidige wachtwoord en het nieuwe wachtwoord tweemaal in.

Kies een sterk wachtwoord en bewaar het veilig.
`],
  ["mijn-stem-functie.md", `---
slug: mijn-stem-functie
title: Mijn Stem
excerpt: Spraak- en audiofuncties in instellingen.
category_slug: instellingen
translation_group_id: 727d8091-e6a7-42be-9621-6d1d211ef338
locale: nl
---

# Mijn Stem

De tab Mijn Stem bevat functies rond spraak en audio binnen de applicatie (microfoon).

Volg de instructies op het scherm en geef microfoontoestemming in de browser als daarom wordt gevraagd.

Bij problemen controleert u de browserinstellingen voor microfoontoegang.
`],
  ["helpbeheer-categorieen-boom.md", `---
slug: helpbeheer-categorieen-boom
title: Helpbeheer: categorieen
excerpt: Bomen, volgorde en subcategorieen beheren.
category_slug: beheer-admin
translation_group_id: 091351d8-8ad0-4600-85ac-48c8abd6f04c
locale: nl
---

# Categorieen

Als beheerder opent u Helpbeheer en dan Categorieen. U kunt items slepen om volgorde en hiërarchie aan te passen.

Elke categorie heeft een unieke slug en een titel zichtbaar voor gebruikers.

Wijzigingen zijn direct zichtbaar in het kenniscentrum na verversen.
`],
  ["helpbeheer-artikelen-publiceren.md", `---
slug: helpbeheer-artikelen-publiceren
title: Helpbeheer: artikelen
excerpt: Aanmaken, markdown, publiceren en indexering.
category_slug: beheer-admin
translation_group_id: 86a32780-d207-4c07-82e1-738bfb8445f6
locale: nl
---

# Artikelen

Maak een nieuw artikel of bewerk een bestaand artikel. Kies de categorie, titel en slug (alleen kleine letters, cijfers en koppeltekens).

De inhoud is Markdown. Na opslaan wordt het artikel opnieuw geindexeerd voor zoeken en chat (embeddings).

Concepten kunt u depubliceren zodat eindgebruikers ze niet zien.
`],
  ["helpbeheer-tickets-behandelen.md", `---
slug: helpbeheer-tickets-behandelen
title: Helpbeheer: supporttickets
excerpt: Tickets bekijken, status en toewijzing.
category_slug: beheer-admin
translation_group_id: 434132bd-d37a-411f-9e42-ad1e7dad5846
locale: nl
---

# Tickets beheren

In Helpbeheer opent u het ticketoverzicht. Filter op status en open een ticket om te antwoorden.

U kunt status, prioriteit en toewijzing wijzigen. Interne notities zijn alleen voor admins zichtbaar.
`],
  ["helpbeheer-inzichten.md", `---
slug: helpbeheer-inzichten
title: Helpbeheer: inzichten
excerpt: Statistieken en overzichten voor het helpdomein.
category_slug: beheer-admin
translation_group_id: ef5b972b-5418-4835-978c-43889f2e25ec
locale: nl
---

# Inzichten

Het inzichtenscherm (indien geconfigureerd) toont samenvattingen over gebruik van help, tickets of zoekgedrag.

Gebruik dit om te zien welke onderwerpen vaak voorkomen en waar extra documentatie nodig is.
`],
  ["gebruikersbeheer-admin.md", `---
slug: gebruikersbeheer-admin
title: Gebruikersbeheer
excerpt: Gebruikers uitnodigen, rollen en toegang.
category_slug: beheer-admin
translation_group_id: c6213a70-52fb-4e4c-9294-3ef2bf9d7ef1
locale: nl
---

# Gebruikers

Onder Gebruikers beheert u accounts: uitnodigen, rollen (admin of standaard) en waar nodig koppeling aan werknemers.

Alleen beheerders zien dit menu.
`],
  ["kb-media-afbeeldingen-in-artikelen.md", `---
slug: kb-media-afbeeldingen-in-artikelen
title: Afbeeldingen in kennisartikelen
excerpt: Upload via de editor en weergave voor lezers.
category_slug: beheer-admin
translation_group_id: 6adf4421-c79c-446f-9269-12e48827de91
locale: nl
---

# Afbeeldingen

In de artikeleditor kunt u afbeeldingen uploaden via de werkbalk. Bestanden gaan naar de beveiligde kb-media opslag.

In het opgeslagen artikel staan paden in Markdown; lezers zien de afbeelding via een tijdelijke signed URL.

Gebruik geen verlopen externe links als permanente bron in de tekst.
`],
  ["vgr-functie-gepland.md", `---
slug: vgr-functie-gepland
title: VGR
excerpt: Module is nog in voorbereiding.
category_slug: vgr
translation_group_id: f3a2c2e1-8f56-4692-9130-030f2b02d897
locale: nl
---

# VGR

De VGR-functionaliteit is **nog niet beschikbaar**. Het menu-item kan al zichtbaar zijn; het scherm toont een geplande melding.

Zodra de module live gaat, wordt dit artikel aangevuld met instructies.
`],
];

fs.mkdirSync(dir, { recursive: true });
for (const [name, body] of articles) {
  const fp = path.join(dir, name);
  fs.writeFileSync(fp, body.trimStart() + "\n", "utf8");
  console.log("wrote", name);
}
