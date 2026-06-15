/** Shared context for routes that read intake documents via file_search. */
export const INTAKE_LAYOUT_V75_HINT = `
INTAKEFORMULIER LAYOUT (V7.5 / ValentineZ-stijl / Juni V4, compatibel met V3):
- Sectie 1 Gespreksinformatie: naam werknemer, Datum gesprek
- Sectie 2 Persoonsgegevens: leeftijd, geslacht, functietitel, werkgever/organisatie, urenomvang, woonplaats, Telefoonnummer (werknemer → phone)
- Sectie 4 Aanmelding: Naam contactpersoon, Functietitel contactpersoon, Telefoonnummer contactpersoon, Email contactpersoon (enige bron voor referent_*)
- Sectie 5 Medische situatie: Datum eerste ziekte dag
- Sectie 6 Re-integratie en houding (TWEE-KOLOMS raster):
  • Linker: Aanmelddatum | Rechter: Startdatum
  • Linker: Datum FML/IZP | Rechter: Einddatum
  • Linker: Naam ☐ Arts ☐ Anios ☐ BA ☐ VA | Rechter: Datum AD-rapport
  • Linker: OSV ☐ Arts ☐ Anios ☐ BA | Rechter: Naam AD
- Sectie 7 Arbeidsdeskundig rapport: Naam arbeidsdeskundige
- Overige secties 3, 8–17 (Woonsituatie, Werkverleden, Toekomstbeeld, …)
- Blok "Algemene informatie" onderaan met opleidingen, vervoer, rijbewijzen, computervaardigheden, talen
- Oud layout (V3/indien aanwezig): zelfde secties met vergelijkbare labels
`.trim();
