# Beheer (administrators)

Helpcenter-export (NL). Categorie: `beheer-admin`.

---

## Afbeeldingen in kennisartikelen

**Slug:** `kb-media-afbeeldingen-in-artikelen`

*Upload via de editor en weergave voor lezers.*

# Afbeeldingen in kennisartikelen (kb-media)

Afbeeldingen in Markdown-artikelen worden opgeslagen in de **kb-media** bucket. De editor biedt een **upload** via de werkbalk; in de opgeslagen tekst staat een **pad** dat bij lezers via een **tijdelijke signed URL** wordt opgehaald.

## Waar in de app

Bij het aanmaken of bewerken van een artikel: Helpbeheer, artikelen, editor met afbeeldingsknop (zie [Artikelen publiceren](/dashboard/help/a/helpbeheer-artikelen-publiceren)).

## Stap voor stap

1. Open een artikel in de editor.
2. Gebruik de functie om een afbeelding te uploaden (afhankelijk van de toolbar).
3. Voeg indien nodig **alt-tekst** toe voor toegankelijkheid.
4. Sla het artikel op; controleer het artikel in de lezersweergave op /dashboard/help/a/{slug}.
5. Vervang tijdelijke schermafbeelding-placeholders in Markdown door echte plaatjes wanneer assets klaar zijn.

> **Schermafbeelding (nog toe te voegen)**  
> Toon: editor met image-upload in werkbalk.  
> **Bestandsnaam:** helpbeheer-kb-media-upload.png

## Veelvoorkomende problemen

- Afbeelding laadt niet: controleer bucketrechten en of het pad in Markdown klopt.
- Externe URL werkt niet meer: vermijd hotlinks; upload liever naar kb-media.

## Zie ook

- [Artikelen publiceren](/dashboard/help/a/helpbeheer-artikelen-publiceren)
- [Welkom bij het kenniscentrum](/dashboard/help/a/welcome-knowledge-center)

---

## Gebruikersbeheer

**Slug:** `gebruikersbeheer-admin`

*Gebruikers uitnodigen, rollen en toegang.*

# Gebruikersbeheer

Beheerders beheren accounts: uitnodigen, rollen (admin of standaard) en koppeling aan werknemers voor juiste zichtbaarheid op dossiers en TP Docs.

## Waar in de app

Menu Gebruikers, route /dashboard/users (alleen voor admins).

## Stap voor stap

1. Open Gebruikers in de zijbalk.
2. Nodig iemand uit of zoek een bestaand account.
3. Stel de rol in.
4. Koppel aan werknemers waar uw proces dat vereist.
5. Informeer over eerste login.

> **Schermafbeelding (nog toe te voegen)**  
> Toon: gebruikerslijst (geanonimiseerd).  
> **Bestandsnaam:** gebruikersbeheer-overzicht.png

## Zie ook

- [Admin versus standaardgebruiker](/dashboard/help/a/admin-vs-standaard-gebruiker)
- [Werknemer koppelen aan gebruiker](/dashboard/help/a/werknemer-koppelen-aan-gebruiker)
- [TP-documenten: wie ziet wat](/dashboard/help/a/tp-documenten-wie-ziet-wat)

---

## Helpbeheer: artikelen

**Slug:** `helpbeheer-artikelen-publiceren`

*Aanmaken, markdown, publiceren en indexering.*

# Helpbeheer: artikelen

Hier maakt en onderhoudt u kennisartikelen: titel, slug, categorie, locale en Markdown-inhoud. Alleen gepubliceerde stukken zijn zichtbaar voor eindgebruikers (afhankelijk van uw publicatievlag).

## Waar in de app

Helpbeheer onder het pad /dashboard/help/admin/articles. Nieuw en bewerken start u vanuit die lijst.

## Stap voor stap

1. Open Artikelen in Helpbeheer.
2. Maak een nieuw artikel of bewerk een bestaand item.
3. Kies categorie, titel en slug (slug: kleine letters, cijfers, koppeltekens).
4. Schrijf de inhoud in Markdown. Gebruik interne links naar andere artikelen met het patroon /dashboard/help/a/ en daarachter de slug.
5. Upload afbeeldingen via de editor waar mogelijk.
6. Publiceer of depubliceer volgens uw proces.
7. Draai na bulkwijzigingen het seed- of reindex-script (zie content/help README).

> **Schermafbeelding (nog toe te voegen)**  
> Toon: artikeleditor met voorbeeldtekst.  
> **Bestandsnaam:** helpbeheer-artikel-editor.png

## Indexering

Embeddings voor zoeken en chat worden bijgewerkt wanneer u het reindex-script draait; zonder reindex kan zoeken achterlopen op de inhoud.

## Zie ook

- [Afbeeldingen in artikelen (kb-media)](/dashboard/help/a/kb-media-afbeeldingen-in-artikelen)
- [Categorieen](/dashboard/help/a/helpbeheer-categorieen-boom)
- [Zoeken in helpartikelen](/dashboard/help/a/zoeken-in-helpartikelen)

---

## Helpbeheer: categorieen

**Slug:** `helpbeheer-categorieen-boom`

*Bomen, volgorde en subcategorieen beheren.*

# Helpbeheer: categorieen

Beheerders structureren het kenniscentrum via een **categorieboom**: volgorde, bovenliggende en onderliggende items, en titels die gebruikers in Help zien.

## Waar in de app

Zijbalk: **Helpbeheer** (alleen admin). Open **Categorieen**: /dashboard/help/admin/categories

## Stap voor stap

1. Ga naar Helpbeheer en kies Categorieen.
2. Sleep items om volgorde of hiërarchie te wijzigen waar de UI dat toestaat.
3. Controleer per categorie de **slug** (technische sleutel) en de **titel** (zichtbare naam).
4. Sla op of bevestig wijzigingen volgens de knoppen op het scherm.
5. Ververs het publieke Help-hub (/dashboard/help) om het resultaat te zien.

> **Schermafbeelding (nog toe te voegen)**  
> Toon: categorieboom met sleephandles (geen gevoelige data).  
> **Bestandsnaam:** helpbeheer-categorieen.png

## Veelvoorkomende problemen

- Artikel verdwijnt uit navigatie: controleer of de category_slug van het artikel nog bestaat.
- Slug conflict: slugs moeten uniek blijven binnen de afgesproken structuur.

## Zie ook

- [Helpbeheer: artikelen publiceren](/dashboard/help/a/helpbeheer-artikelen-publiceren)
- [Kenniscentrum: navigatie en zoeken](/dashboard/help/a/kenniscentrum-navigatie-zoeken)

---

## Helpbeheer: inzichten

**Slug:** `helpbeheer-inzichten`

*Statistieken en overzichten voor het helpdomein.*

# Helpbeheer: inzichten

Inzichten geeft admins een samenvatting van gebruik rond help, zoals trends in tickets of zoekgedrag. Exacte widgets hangen van de configuratie af.

## Waar in de app

/dashboard/help/admin/insights

## Gebruik

1. Open Helpbeheer en kies Inzichten.
2. Bekijk de beschikbare kaarten of grafieken.
3. Herken terugkerende vragen en onderwerpen met pieken.
4. Verbeter documentatie of artikelen op basis van die signalen.

> **Schermafbeelding (nog toe te voegen)**  
> Toon: inzichten-dashboard met geaggregeerde cijfers.  
> **Bestandsnaam:** helpbeheer-inzichten.png

## Zie ook

- [Artikelen publiceren](/dashboard/help/a/helpbeheer-artikelen-publiceren)
- [Tickets behandelen](/dashboard/help/a/helpbeheer-tickets-behandelen)
- [Zoeken in helpartikelen](/dashboard/help/a/zoeken-in-helpartikelen)

---

## Helpbeheer: supporttickets

**Slug:** `helpbeheer-tickets-behandelen`

*Tickets bekijken, status en toewijzing.*

# Helpbeheer: supporttickets

Admins beheren supporttickets: filteren, openen, beantwoorden en status bijwerken.

## Waar in de app

Overzicht: /dashboard/help/admin/tickets. Open een regel voor het detail van dat ticket.

## Stap voor stap

1. Open het ticketoverzicht in Helpbeheer.
2. Filter op status of prioriteit indien beschikbaar.
3. Open een ticket om de conversatie te lezen.
4. Antwoord naar de aanvrager of wijzig status, prioriteit en toewijzing.
5. Gebruik interne notities alleen voor het team; die zijn niet bedoeld voor de indiener.

> **Schermafbeelding (nog toe te voegen)**  
> Toon: ticketlijst en detail (geanonimiseerd).  
> **Bestandsnaam:** helpbeheer-tickets.png

## Zie ook

- [Supportticket indienen](/dashboard/help/a/support-ticket-indienen)
- [Ticketstatus en berichten](/dashboard/help/a/support-ticket-status-en-berichten)
- [Helpbeheer: inzichten](/dashboard/help/a/helpbeheer-inzichten)

---
