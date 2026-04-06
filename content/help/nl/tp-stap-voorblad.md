---
slug: tp-stap-voorblad
title: Stap 1: Voorblad
excerpt: Titelpagina en basis van het trajectplan.
category_slug: tp-part-1
translation_group_id: d8f7e71e-a1ec-4523-96b8-96c122f579c6
locale: nl
---

# Stap 1: Voorblad

Het voorblad vormt de titelpagina van het trajectplan in de **Trajectplan Bouwer**. U controleert hier de zichtbare naam van de werknemer en werkgever en stelt de **rapportagedatum** in; die gegevens verschijnen ook in de live voorvertoning rechts.

## Wat is dit en waarom

Deze stap zorgt dat de eerste pagina van het document professioneel en consistent is met de gegevens uit de applicatie. Naam en werkgever worden waar mogelijk automatisch ingevuld vanuit de werknemer- en werkgeverrecords; de rapportagedatum slaat u expliciet op.

## Voor wie

Iedereen die een trajectplan mag bewerken voor een werknemer (beheerder of standaardgebruiker met toegang tot die werknemer).

## Waar in de app

1. Open de werknemer vanuit het dashboard (zie [Snel naar een werknemer](/dashboard/help/a/dashboard-snel-naar-werknemer)).
2. Start of ga verder met het trajectplan (zie [Trajectplan starten](/dashboard/help/a/trajectplan-starten-vanuit-werknemer) en [Werkwijze bouwer](/dashboard/help/a/trajectplan-bouwer-werkwijze)).
3. U komt op `/dashboard/tp/{werknemer-id}`; bovenaan staat **Trajectplan Bouwer** en **Stap 1 van 5**.

## Stap voor stap

1. Wacht tot het scherm klaar is met laden (eventueel melding **Laden...**).
2. Controleer **Werknemer Naam** en **Werkgever Naam** in de grijze vakken; pas deze niet hier aan als ze fout zijn, maar corrigeer de bron in werknemer/werkgever.
3. Stel **Rapportage Datum** in met de datumkiezer.
4. Klik **Opslaan** om de rapportagedatum in `tp_meta` te bewaren.
5. Controleer rechts de A4-voorvertoning (titel **TRAJECTPLAN 2ᵉ SPOOR**, datumregel, werkgeverblok).
6. Klik **Volgende** om naar stap 2 **Gegevens werknemer** te gaan.

> **Schermafbeelding (nog toe te voegen)**  
> Toon: stap 1 met velden links en A4-preview rechts (geanonimiseerd).  
> **Bestandsnaam:** `tp-stap1-voorblad.png`

## Belangrijke schermen en knoppen

- **Trajectplan Bouwer** — titel in de kopbalk.
- Voortgangsindicator — vijf segmenten voor de stappen.
- **Terug** / **Volgende** — onderaan het scherm (stap 1: Terug is uitgeschakeld).
- **Opslaan** — slaat vooral de rapportagedatum op voor dit scherm.

## Veelvoorkomende problemen

- **Naam of werkgever klopt niet** — wijzig de werknemer of de gekoppelde werkgever buiten de bouwer; het voorblad haalt deze waarden op bij openen.
- **Opslaan lijkt niets te doen** — controleer of er een fout in de browserconsole is; probeer opnieuw na netwerkherstel.
- **Volgende is niet beschikbaar** — zeldzaam; ververs de pagina als de UI vastloopt.

## Tips

> Controleer spelling en datum voordat u verder gaat; later wijzigen kan, maar voorkomt dubbel werk bij afdruk of export.

## Zie ook

- [Stap 2: Gegevens werknemer](/dashboard/help/a/tp-stap-gegevens-werknemer)
- [Trajectplan Bouwer: werkwijze](/dashboard/help/a/trajectplan-bouwer-werkwijze)
- [Stap 5: Eindecontrole](/dashboard/help/a/tp-stap-eindcontrole)
