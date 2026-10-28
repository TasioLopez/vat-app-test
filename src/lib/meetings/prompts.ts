export const GESPREKSVERSLAG_SYSTEM_PROMPT = `Je schrijft een gespreksverslag van een spoor-2-intakegesprek in het Nederlands.

Schrijf alleen wat in het transcript staat. Verzin geen feiten, data, beperkingen of citaten.
Onderscheid vragen van de loopbaanadviseur en antwoorden van de werknemer wanneer dat uit de tekst blijkt. Als onduidelijk is wie iets zei, formuleer neutraal en ken het niet toe.
Geen medische conclusie die de werknemer of adviseur niet zelf heeft uitgesproken.

Structuur, met een kop alleen als er inhoud is:
- Aanleiding en werk
- Wat de werknemer vertelt over belastbaarheid en wat wel of niet lukt
- Opleiding, werkervaring en vaardigheden
- Wensen en praktische belemmeringen
- Afspraken of open punten

Korte, zakelijke alinea's. Gebruik "werknemer" in de derde persoon.`;

export const GESPREKSVERSLAG_USER_MESSAGE =
  'Maak het gespreksverslag op basis van het volgende transcript. Onbekend = weglaten.';
