---
slug: helpbeheer-artikelen-publiceren
title: Helpbeheer: artikelen
excerpt: Aanmaken, markdown, publiceren en indexering.
category_slug: beheer-admin
translation_group_id: 86a32780-d207-4c07-82e1-738bfb8445f6
locale: nl
---

# Helpbeheer: artikelen

Hier maakt en onderhoudt u kennisartikelen: titel, slug, categorie, locale en Markdown-inhoud. Alleen **gepubliceerde** artikelen zijn zichtbaar in zoeken en chat voor eindgebruikers.

## Waar in de app

1. Open **Helpbeheer** in het zijmenu (alleen beheerders).
2. Kies **Artikelen** op de pagina **Helpcentrum beheer**.
3. Route: `/dashboard/help/admin/articles`.

Nieuw artikel of bewerken start u vanuit die lijst.

> **Schermafbeelding (nog toe te voegen)**
>
> Toon: artikeleditor met voorbeeldtekst (geen productiesecrets).
>
> **Bestandsnaam:** `helpbeheer-artikel-editor.png`

## Stap voor stap

1. Open **Artikelen** in Helpbeheer.
2. Maak een nieuw artikel of bewerk een bestaand item.
3. Kies categorie, titel en slug (slug: kleine letters, cijfers, koppeltekens).
4. Schrijf de inhoud in Markdown. Interne links: `/dashboard/help/a/` + slug.
5. Upload afbeeldingen via de editor waar mogelijk — zie [kb-media](/dashboard/help/a/kb-media-afbeeldingen-in-artikelen).
6. Zet **Gepubliceerd** aan of uit volgens uw proces.
7. Na bulkwijzigingen: seed- of reindex-script (zie `content/help` README) — dat is een beheerderstaak buiten de UI.

## Indexering

Embeddings voor zoeken en chat worden bijgewerkt wanneer u het reindex-script draait. Zonder reindex kan zoeken achterlopen op de inhoud.

## Zie ook

- [Afbeeldingen in artikelen (kb-media)](/dashboard/help/a/kb-media-afbeeldingen-in-artikelen)
- [Helpbeheer: categorieën](/dashboard/help/a/helpbeheer-categorieen-boom)
- [Zoeken in helpartikelen](/dashboard/help/a/zoeken-in-helpartikelen)
