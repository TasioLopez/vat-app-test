---
slug: kb-media-afbeeldingen-in-artikelen
title: Afbeeldingen in kennisartikelen
excerpt: Upload via de editor en weergave voor lezers.
category_slug: beheer-admin
translation_group_id: 6adf4421-c79c-446f-9269-12e48827de91
locale: nl
---

# Afbeeldingen in kennisartikelen (kb-media)

Afbeeldingen in Markdown-artikelen worden opgeslagen in de **kb-media** bucket. In de editor uploadt u via de werkbalk; in de opgeslagen tekst staat een **pad** dat bij lezers via een **tijdelijke signed URL** wordt opgehaald.

## Waar in de app

Bij het aanmaken of bewerken van een artikel: **Helpbeheer** → **Artikelen** → editor met afbeeldingsknop (zie [Artikelen publiceren](/dashboard/help/a/helpbeheer-artikelen-publiceren)).

## Stap voor stap

1. Open een artikel in de editor.
2. Gebruik de knop om een afbeelding te uploaden (werkbalk).
3. Voeg indien nodig **alt-tekst** toe voor toegankelijkheid.
4. Sla het artikel op; controleer de lezersweergave op `/dashboard/help/a/{slug}`.
5. Vervang tijdelijke schermafbeelding-placeholders in Markdown door echte plaatjes wanneer assets klaar zijn.

> **Schermafbeelding (nog toe te voegen)**
>
> Toon: editor met image-upload in de werkbalk.
>
> **Bestandsnaam:** `helpbeheer-kb-media-upload.png`

## Veiligheid en privacy

> Upload geen schermafdrukken met wachtwoorden, tokens, TOTP-codes of echte persoonsgegevens. Anonimiseer of maskeer gevoelige velden.

## Veelvoorkomende problemen

- Afbeelding laadt niet: controleer bucketrechten en of het pad in Markdown klopt.
- Externe URL werkt niet meer: vermijd hotlinks; upload liever naar kb-media.

## Zie ook

- [Helpbeheer: artikelen](/dashboard/help/a/helpbeheer-artikelen-publiceren)
- [Welkom bij het kenniscentrum](/dashboard/help/a/welcome-knowledge-center)
