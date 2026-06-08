/** Shared context for routes that read intake documents via file_search. */
export const INTAKE_LAYOUT_V75_HINT = `
INTAKEFORMULIER LAYOUT (V7.5 / Cordaan / ValentineZ-stijl / Juni V3):
- Sectie 1 Gespreksinformatie: naam werknemer, datum gesprek
- Sectie 2 Persoonsgegevens: leeftijd, geslacht, functietitel, werkgever/organisatie, urenomvang, woonplaats, Telefoonnummer (werknemer → phone)
- Sectie 4 Aanmelding: Naam contactpersoon, Functietitel contactpersoon, Telefoonnummer contactpersoon, Email contactpersoon (enige bron voor referent_*)
- Overige secties 3, 5–17 (o.a. Medische situatie, Re-integratie, Arbeidsdeskundig rapport, Woonsituatie, Werkverleden, Toekomstbeeld)
- Blok "Algemene informatie" onderaan met:
  • Opleidingen/werkervaring tabellen
  • "Hoe verplaatst werknemer zich": Auto, Fiets, OV, Lopend (aangevinkte opties)
  • Rijbewijzen-lijst (AM, A1, A2, B, …)
  • "Werknemer beschikt over een PC/Laptop" en computervaardigheden (Geen t/m Expert)
  • Talen: Spreken/Schrijven/Lezen met G (Goed), R (Redelijk), O (Onvoldoende)
- Oud layout (indien aanwezig): tabel "Vervoer" met Ja/Nee kolommen.
`.trim();
