---
slug: helpbeheer-artikelen-publiceren
title: Helpbeheer: artikelen
excerpt: Aanmaken, markdown, publiceren en indexering.
category_slug: beheer-admin
translation_group_id: 86a32780-d207-4c07-82e1-738bfb8445f6
locale: nl
---

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
