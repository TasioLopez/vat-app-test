# Aan de slag

Helpcenter-export (NL). Categorie: `aan-de-slag`.

---

## Eerste stappen in de applicatie

**Slug:** `eerste-stappen-in-de-app`

*Sidebar, rollen en waar u trajectplannen vindt.*

# Eerste stappen in de applicatie

Na uw eerste login helpt dit artikel u **oriënteren**: het zijmenu, het verschil tussen **admin** en **standaardgebruiker**, en een **werkvolgorde** van werkgever tot Trajectplan Bouwer en TP Docs.

## Wat leest u hier?

- Overzicht van het **zijmenu** en routes onder `/dashboard/...`.
- **Rollen** en zichtbaarheid van gegevens.
- Aanbevolen **stappenplan** en verwijzingen naar detailartikelen.

## Het zijmenu

Na inloggen ziet u links het menu met onder andere:

- **Dashboard** (`/dashboard`) – startpagina.
- **Gebruikers** (`/dashboard/users`) – alleen **beheerders**.
- **Werkgevers** (`/dashboard/clients`).
- **Werknemers** (`/dashboard/employees`).
- **TP Docs** (`/dashboard/tpdocs`) – PDF-lijst.
- **Help** (`/dashboard/help`).
- **Helpbeheer** (`/dashboard/help/admin`) – alleen **beheerders**.
- **Instellingen** (`/dashboard/settings`).
- **Uitloggen**.

> **Schermafbeelding (nog toe te voegen)**
>
> Toon: zijmenu voor standaardgebruiker en (tweede beeld) voor beheerder met extra items.
>
> **Bestandsnaam:** `zijmenu-rollen.png`

## Admin of standaardgebruiker?

**Beheerder** ziet alle werkgevers, werknemers en TP-documenten en heeft Gebruikers en Helpbeheer. **Standaardgebruiker** ziet alleen gegevens die aan hem of haar zijn **gekoppeld**. Zie [Admin en standaardgebruiker](/dashboard/help/a/admin-vs-standaard-gebruiker).

## Aanbevolen workflow

1. **Werkgever** aanmaken of controleren: [Werkgever toevoegen en beheren](/dashboard/help/a/werkgever-nieuw-beheren).
2. **Werknemer** aanmaken: [Werknemer aanmaken en bewerken](/dashboard/help/a/werknemer-aanmaken-en-bewerken).
3. **Koppeling** collega aan werknemer (door admin): [Werknemer koppelen aan een gebruiker](/dashboard/help/a/werknemer-koppelen-aan-gebruiker).
4. **Trajectplan Bouwer**: [Trajectplan starten vanuit werknemer](/dashboard/help/a/trajectplan-starten-vanuit-werknemer) en [Trajectplan Bouwer: werkwijze](/dashboard/help/a/trajectplan-bouwer-werkwijze).
5. **TP Docs**: [Wat zijn TP-documenten?](/dashboard/help/a/tp-documenten-wat-zijn-dit).

> **Schermafbeelding (nog toe te voegen)**
>
> Toon: werknemerpagina met actie om de Trajectplan Bouwer te openen.
>
> **Bestandsnaam:** `werknemer-open-trajectplan-bouwer.png`

## Problemen?

Geen menu-item Gebruikers of Helpbeheer: geen admin-rechten. Geen werknemers in lijst: ontbrekende koppeling; vraag een admin.

## Zie ook

- [Admin en standaardgebruiker](/dashboard/help/a/admin-vs-standaard-gebruiker)
- [Wat toont het dashboard?](/dashboard/help/a/dashboard-wat-zie-ik)
- [Welkom bij het kenniscentrum](/dashboard/help/a/welcome-knowledge-center)
- [Navigatie en zoeken in het kenniscentrum](/dashboard/help/a/kenniscentrum-navigatie-zoeken)

---

## Navigatie en zoeken in het kenniscentrum

**Slug:** `kenniscentrum-navigatie-zoeken`

*Categorieën doorlopen, zoeken en artikelen openen.*

# Navigatie en zoeken in het kenniscentrum

Dit artikel beschrijft hoe u de help-startpagina gebruikt: **navigeren via categorieën**, **zoeken** en **artikelen openen en delen**. Het sluit aan op de pagina **`/dashboard/help`**.

## Wat leest u hier?

- Waar u het kenniscentrum opent.
- Hoe de structuur (categorieën en subonderwerpen) werkt.
- Hoe zoeken reageert en wat u kunt verwachten.
- Hoe u een vaste link naar een artikel deelt.

## Waar opent u Help?

1. Zorg dat u bent **ingelogd**.
2. Klik in het **linker zijmenu** op **Help**.
3. De browser toont het pad **`/dashboard/help`**.

> **Schermafbeelding (nog toe te voegen)**
>
> Toon: volledige help-hub met **zoekbalk bovenaan** en daaronder de **boom van categorieën** (eventueel ingeklapt/uitgeklapt).
>
> **Bestandsnaam:** `help-hub-overzicht.png`

## De help-startpagina in onderdelen

### Zoekveld

- Staat **bovenaan** de pagina.
- Bedoeld om **artikeltitels en inhoud** te vinden op trefwoord.
- Zie het aparte artikel [Zoeken in helpartikelen](/dashboard/help/a/zoeken-in-helpartikelen) voor gedrag (minimale lengte, vertraging, resultatenlijst).

### Categorieën en artikelen

- **Hoofdcategorieën** zijn de eerste niveaus (bijvoorbeeld *Trajectplan Bouwer*, *Werknemers*).
- Onder een hoofdcategorie kunnen **subcategorieën** of direct **artikelen** staan, afhankelijk van de inrichting.
- Klik op een **categorienaam** om onderliggende items te tonen of te verbergen (indien de interface dat ondersteunt).
- Klik op een **artikeltitel** om naar de volledige tekst te gaan.

> **Schermafbeelding (nog toe te voegen)**
>
> Toon: één categorie **uitgeklapt** met zichtbare artikellijst en pijl of chevron die duidelijk maakt dat u kunt inklappen.
>
> **Bestandsnaam:** `help-categorie-uitgeklapt.png`

## Stap-voor-stap: een onderwerp vinden zonder zoeken

1. Open **Help** in het menu.
2. Scroll door de **categorieën** tot u het onderwerp herkent (bijv. *Instellingen*).
3. Open eventuele **subcategorie** (bijv. een stap van de Trajectplan Bouwer).
4. Klik het **artikel** dat het dichtst bij uw vraag past.

## Stap-voor-stap: zoeken gebruiken

1. Open **`/dashboard/help`**.
2. Klik in het **zoekveld** en typ minimaal **twee tekens**.
3. Wacht kort; resultaten verschijnen meestal na een **debounce** (korte pauze) om de server niet te overbelasten.
4. Klik een **resultaat** om het artikel te openen.

## Artikel-URL’s delen

Elk artikel heeft een vaste URL:

```text
/dashboard/help/a/uw-artikel-slug
```

- U kunt deze URL **kopiëren uit de adresbalk** wanneer het artikel open is.
- Deel de link met **collega’s die ook ingelogd zijn** in dezelfde omgeving; zij moeten **rechten** hebben om de helppagina’s te openen.

> **Schermafbeelding (nog toe te voegen)**
>
> Toon: adresbalk met een voorbeeld-URL `/dashboard/help/a/...` en het artikel eronder.
>
> **Bestandsnaam:** `help-artikel-url-adresbalk.png`

## Veelvoorkomende problemen

| Probleem | Mogelijke oorzaak | Wat te doen |
|----------|-------------------|-------------|
| Geen zoekresultaten | Te weinig tekens of geen match | Typ minstens 2 tekens; probeer synoniemen of blader per categorie |
| Resultaten verdwijnen snel | Pagina ververst of focus weg | Opnieuw typen; opnieuw openen Help |
| Categorie lijkt leeg | Nog niet uitgeklapt of geen artikelen in die tak | Vouw open; probeer een andere categorie |
| 404 op artikel | Verkeerde slug of artikel verwijderd | Ga terug naar Help en zoek opnieuw |

## Tips

> **Tip:** Combineer **zoeken** (als u een concreet woord weet, bijv. “wachtwoord”) met **bladeren** (als u nog oriënteert op het juiste hoofdstuk).

## Zie ook

- [Welkom bij het kenniscentrum](/dashboard/help/a/welcome-knowledge-center)
- [Zoeken in helpartikelen](/dashboard/help/a/zoeken-in-helpartikelen)
- [Eerste stappen in de applicatie](/dashboard/help/a/eerste-stappen-in-de-app)
- [Wanneer de helpchat gebruiken?](/dashboard/help/a/help-chat-wanneer-gebruiken)

---

## Welkom bij het kenniscentrum

**Slug:** `welcome-knowledge-center`

*Aan de slag met zoeken, artikelen en ondersteuning in de app.*

# Welkom bij het kenniscentrum

Dit kenniscentrum helpt u om snel te vinden hoe de applicatie werkt: van inloggen en rollen tot werknemers, de Trajectplan Bouwer, TP-documenten en ondersteuning. Gebruik de onderstaande manieren om antwoorden te vinden of hulp te vragen.

## Wat is het kenniscentrum?

Het kenniscentrum is een **verzameling artikelen** (tekst met koppen, lijsten en later schermafbeeldingen) die stap voor stap uitleggen wat u in de app kunt doen. De inhoud is primair in het **Nederlands** en sluit aan op de knoppen en menu's die u in de interface ziet.

## Voor wie is dit bedoeld?

- **Alle ingelogde gebruikers** kunnen artikelen lezen, zoeken en (waar ingeschakeld) de helpchat gebruiken.
- **Beheerders** zien extra onderwerpen over gebruikersbeheer en helpbeheer.

## Waar vind ik het?

1. Klik in het **zijmenu** op **Help**.
2. U komt op de startpagina van het helpcentrum: **`/dashboard/help`**.

> **Schermafbeelding (nog toe te voegen)**
>
> Toon: zijmenu met het item **Help** gemarkeerd en de help-startpagina ernaast.
>
> **Bestandsnaam:** `help-menu-en-startpagina.png`

## Hoe vind ik informatie?

### Bladeren per onderwerp

Op de help-startpagina staan **categorieën** (bijvoorbeeld Werknemers, Trajectplan Bouwer). Open een categorie om **onderliggende onderwerpen** en **artikelen** te zien. Klik een titel om het volledige artikel te lezen.

### Zoeken

Bovenaan de help-pagina staat een **zoekveld**. Typ minimaal **twee tekens**; na een korte pauze verschijnen suggesties. Zie voor details: [Zoeken in helpartikelen](/dashboard/help/a/zoeken-in-helpartikelen).

### Helpchat

Voor een vraag in eigen woorden kunt u de **helpchat** openen. Het systeem combineert uw vraag met de kennis uit deze artikelen. Zie: [Wanneer de helpchat gebruiken?](/dashboard/help/a/help-chat-wanneer-gebruiken).

### Supportticket

Als u een probleem heeft dat niet in een artikel staat, of u heeft **toegang** of **bugs** nodig, kunt u een **supportticket** indienen. Zie: [Supportticket indienen](/dashboard/help/a/support-ticket-indienen).

## Typische eerste stappen in de app

Als u nieuw bent, lees ook [Eerste stappen in de applicatie](/dashboard/help/a/eerste-stappen-in-de-app) en [Navigatie en zoeken in het kenniscentrum](/dashboard/help/a/kenniscentrum-navigatie-zoeken).

## Veelvoorkomende vragen

**Ik zie geen categorie of artikel.** Controleer of u bent ingelogd. Sommige onderdelen zijn alleen zichtbaar voor beheerders.

**De zoekfunctie geeft niets terug.** Gebruik minstens twee letters en wacht kort; probeer een ander trefwoord of blader handmatig.

**De chat geeft een fout antwoord.** De chat is een hulpmiddel; controleer belangrijke stappen altijd in de artikelen of vraag een ticket aan.

## Tips

> **Tip:** Bewaar vaak gebruikte artikelen via de vaste URL in uw browser (bladwijzer). Elke artikelpagina heeft een pad van de vorm `/dashboard/help/a/uw-artikel-slug`.

## Zie ook

- [Navigatie en zoeken in het kenniscentrum](/dashboard/help/a/kenniscentrum-navigatie-zoeken)
- [Eerste stappen in de applicatie](/dashboard/help/a/eerste-stappen-in-de-app)
- [Zoeken in helpartikelen](/dashboard/help/a/zoeken-in-helpartikelen)
- [Wanneer de helpchat gebruiken?](/dashboard/help/a/help-chat-wanneer-gebruiken)

---
