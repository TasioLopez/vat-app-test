/** Shared context for routes that read intake documents via file_search. */
export const INTAKE_LAYOUT_V75_HINT = `
INTAKEFORMULIER LAYOUT (V7.5 / ValentineZ-stijl / Juni V6, compatibel met V5/V4/V3):
- Sectie 1 Gespreksinformatie: naam werknemer, Datum gesprek
- Sectie 2 Persoonsgegevens: leeftijd, geslacht, functietitel, werkgever/organisatie, urenomvang, woonplaats, Telefoonnummer (werknemer → phone), Andere werkgever
- Sectie 4 Aanmelding: Naam contactpersoon, Functietitel contactpersoon, Telefoonnummer contactpersoon, Email contactpersoon (enige bron voor referent_*)
- Sectie 5 Medische situatie:
  • Datum eerste ziekte dag
  • FML/IZP rubriek checkboxes (beperkingen)
  • Quote prognose en quote advies belastbaarheid (bedrijfsarts): — verbatim quote for TP Belastbaarheidsprofiel prognose block
- Sectie 6 Re-integratie en houding (TWEE-KOLOMS raster):
  • Bovenste rij (V5): Geboortedatum | Weken — geboortedatum werknemer, geen trajectdatum
  • Linker: Aanmelddatum | Rechter: Startdatum
  • Linker: Datum FML/IZP | Rechter: Einddatum
  • Linker: Naam ☐ Arts ☐ Anios ☐ BA ☐ VA (volgende arts) | Rechter: Datum AD-rapport
  • Onder "AD-rapport:" staat checkbox ☐ Concept (Juni V6) — alleen ☒/☑ = concept; ☐ = niet-concept
  • Linker: OSV ☐ Arts ☐ Anios ☐ BA (onder supervisie van — superviserend arts/BA) | Rechter: Naam AD
- Sectie 7 Arbeidsdeskundig rapport:
  • Naam arbeidsdeskundige
  • Quote advies spoor 2 (inleiding) — adviesparagraaf over 2e spoor
  • Quote passende functies — categorieën met "Zoals:" voorbeelden
- Secties 8–12: Woonsituatie, Familie, Huishoudelijke taken, Dagstructuur, Vrije tijd (sociale/visie context)
- Secties 13–16: Werkverleden, Houding t.o.v. spoor 2, Toekomstbeeld (geen sectie 15)
- Sectie 17 Bijzonderheden:
  • "Zijn er bijzonderheden waar ik rekening mee moet houden tijdens de begeleiding:" — algemene vrije tekst
  • "Praktische belemmeringen:" — vrije tekst voor TP-sectie Praktische belemmeringen
  • "Algemene informatie:" — tabellen:
    • "Opleidingen? Afgerond?" — opleidingsniveau per regel met Ja/Nee (afgerond); V7 gebruikt checkbox-kolommen: ☒/☑ in Afgerond = Ja, ☐ of tweede box ☒ = Nee; plain "Mbo" zonder cijfer is geldig
    • "Werkervaring? Van-tot?" — functie/werkgever per regel, periode in tweede kolom; alleen functietitels voor work_experience; bij alleen werkgever/duur: fallback sectie 13 Werkverleden ("andere functies gedaan …")
    • plus vervoer, rijbewijzen, computervaardigheden, talen (was apart blok in V4)
- Oud layout (V3/V4): zelfde secties met vergelijkbare labels; "Algemene informatie" kan onderaan staan i.p.v. onder sectie 17
`.trim();
