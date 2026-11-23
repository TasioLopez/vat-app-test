---
slug: helpbeheer-categorieen-boom
title: Helpbeheer: categorieën
excerpt: Bomen, volgorde en subcategorieën beheren.
category_slug: beheer-admin
translation_group_id: 091351d8-8ad0-4600-85ac-48c8abd6f04c
locale: nl
---

# Helpbeheer: categorieën

Beheerders structureren het kenniscentrum via een **categorieboom**: volgorde, bovenliggende en onderliggende items, en titels die gebruikers in Help zien onder **Onderwerpen**.

## Waar in de app

1. Zijbalk: **Helpbeheer** (alleen admin).
2. Open **Categorieën**: `/dashboard/help/admin/categories`.

## Stap voor stap

1. Ga naar Helpbeheer en kies **Categorieën**.
2. Sleep items om volgorde of hiërarchie te wijzigen waar de UI dat toestaat.
3. Controleer per categorie de **slug** (technische sleutel) en de **titel** (zichtbare naam).
4. Sla op of bevestig wijzigingen volgens de knoppen op het scherm.
5. Ververs het publieke Help-hub (`/dashboard/help`) om het resultaat te zien.

> **Schermafbeelding (nog toe te voegen)**
>
> Toon: categorieboom met sleephandles (geen gevoelige data).
>
> **Bestandsnaam:** `helpbeheer-categorieen.png`

## Veelvoorkomende problemen

- Artikel verdwijnt uit navigatie: controleer of de `category_slug` van het artikel nog bestaat.
- Slug conflict: slugs moeten uniek blijven binnen de afgesproken structuur.

## Zie ook

- [Helpbeheer: artikelen](/dashboard/help/a/helpbeheer-artikelen-publiceren)
- [Kenniscentrum: navigatie en zoeken](/dashboard/help/a/kenniscentrum-navigatie-zoeken)
