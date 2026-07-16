import { INTAKE_LAYOUT_V75_HINT } from './intake-layout-v75';

export const INTAKE_ALGEMENE_INFO_EXTRACTION_PROMPT = `Je analyseert een Nederlands intakeformulier (PDF) — PASS B: sectie 17 Algemene informatie.

${INTAKE_LAYOUT_V75_HINT}

FOCUS ALLEEN OP sectie 17 "Algemene informatie" (Bijzonderheden) en bij V4-layout hetzelfde blok onderaan:
- Tabel "Opleidingen? Afgerond?"
- Tabel "Werkervaring? Van-tot?"
- Digitale vaardigheden / computervaardigheden
- Rijbewijzen
- Vervoer ("Hoe verplaatst werknemer zich:" — Auto, Fiets, OV, Lopend)
- Talen (G/R/O → Goed, Gemiddeld, Niet goed)

BELANGRIJK — VISUEEL LEZEN:
- Bekijk de PDF-pagina's als afbeelding. Lees elk vakje apart.
- ☒ / ☑ / ingevuld vierkant / kruisje = aangevinkt (true)
- ☐ / leeg vierkant = NIET aangevinkt (false)
- Labels zonder zichtbaar gevuld vakje zijn NOOIT true
- Als je twijfelt of een vakje gevuld is → false (niet gokken)

OPLEIDINGEN (sectie 17):
- ☒/☑ in Afgerond-kolom = Ja (afgerond); ☐ ☒ = Nee (niet afgerond)
- Plain "Mbo" zonder cijfer is geldig (tel als MBO 4)
- Kies HOOGSTE afgeronde basisopleiding bij meerdere Ja-regels
- Certificaten (VCA, BHV, EHBO) zijn NOOIT education_level
- education_name: richting bij gekozen opleiding; geen certificaten

WERKERVARING:
- Primary: functietitels uit tabel "Werkervaring? Van-tot?" — komma-gescheiden
- Sla pure werkgevernamen/duratie over (bijv. alleen "Axxicom 13+ jaar")
- FALLBACK sectie 13 "Werkverleden": "andere functies gedaan …" wanneer tabel geen titels heeft
- NOOIT sectie 2 functietitel (current_job) in work_experience

VERVOER (rij "Hoe verplaatst werknemer zich:") — beoordeel ELK vakje apart:
- transport_auto — true alleen als Auto-vakje gevuld is
- transport_fiets — true alleen als Fiets-vakje gevuld is
- transport_ov — true alleen als OV-vakje gevuld is
- transport_lopend — true alleen als Lopend-vakje gevuld is
- Voorbeeld: alleen Auto aangevinkt → transport_auto true, overige false
- NOOIT alle vier true tenzij alle vier vakjes echt gevuld zijn
- Negeer "Anders namelijk:"; Bromfiets/Motor horen bij rijbewijs, niet bij vervoer

RIJBEWIJS / TALEN / COMPUTER:
- drivers_license + drivers_license_type (bijv. ["B"])
- dutch_speaking, dutch_writing, dutch_reading: "Goed", "Gemiddeld", "Niet goed"
- has_computer: PC/laptop aangevinkt
- computer_skills: "1" t/m "5" (aangevinkt niveau)

Gebruik null voor ontbrekende niet-boolean velden.`;

export const INTAKE_ALGEMENE_INFO_USER_MESSAGE =
  'Extract alleen sectie 17. Voor vervoer: bekijk elk checkbox-vakje (Auto/Fiets/OV/Lopend) apart en zet true/false — geen array gokken.';
