import { INTAKE_LAYOUT_V75_HINT } from './intake-layout-v75';

export const INTAKE_ALGEMENE_INFO_EXTRACTION_PROMPT = `Je analyseert een Nederlands intakeformulier (PDF) — PASS B: sectie 17 Algemene informatie.

${INTAKE_LAYOUT_V75_HINT}

FOCUS ALLEEN OP sectie 17 "Algemene informatie" (Bijzonderheden) en bij V4-layout hetzelfde blok onderaan:
- Tabel "Opleidingen? Afgerond?"
- Tabel "Werkervaring? Van-tot?"
- Digitale vaardigheden / computervaardigheden
- Rijbewijzen (aparte categorieën: B, C, AM, …)
- Vervoer — aparte rij "Hoe verplaatst werknemer zich:" (Auto, Fiets, OV, Lopend)
- Talen (G/R/O → Goed, Gemiddeld, Niet goed)

BELANGRIJK — VISUEEL LEZEN:
- Bekijk de PDF-pagina's als afbeelding. Lees elk vakje apart.
- ☒ / ☑ / ingevuld vierkant / kruisje = aangevinkt (true)
- ☐ / leeg vierkant = NIET aangevinkt (false)

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

RIJBEWIJS ≠ VERVOER (KRITIEK — vaak in hetzelfde kader):
- Rijbewijzen: categorieën zoals "B - Personenauto", C, AM, … → drivers_license / drivers_license_type
- Vervoer: ALLEEN de rij met label "Hoe verplaatst werknemer zich:" met opties Auto | Fiets | OV | Lopend | Anders
- "B - Personenauto" is een RIJBEWIJS, GEEN transport_auto
- transport_auto = true ALLEEN als het vakje naast het woord "Auto" op de Hoe-verplaatst-rij een X/vink heeft

VERVOER (rij "Hoe verplaatst werknemer zich:") — beoordeel ELK vakje apart:
- transport_auto — true alleen bij gevuld Auto-vakje op die rij
- transport_fiets — true alleen bij gevuld Fiets-vakje
- transport_ov — true alleen bij gevuld OV-vakje
- transport_lopend — true alleen bij gevuld Lopend-vakje
- Voorbeeld Hippman-stijl: ☒ Auto ☐ Fiets ☐ OV ☐ Lopend → transport_auto true, rest false
- NOOIT alle vier true tenzij alle vier vakjes echt gevuld zijn
- Negeer "Anders namelijk:"; Bromfiets/Motor horen bij rijbewijs, niet bij vervoer

TALEN / COMPUTER:
- dutch_speaking, dutch_writing, dutch_reading: "Goed", "Gemiddeld", "Niet goed"
- has_computer: PC/laptop aangevinkt
- computer_skills: "1" t/m "5" (aangevinkt niveau)

Gebruik null voor ontbrekende niet-boolean velden.`;

export const INTAKE_ALGEMENE_INFO_USER_MESSAGE =
  'Extract sectie 17. Scheid rijbewijs van vervoer: lees "Hoe verplaatst werknemer zich:" apart (Auto/Fiets/OV/Lopend). Rijbewijs B telt niet als Auto.';

export const INTAKE_TRANSPORT_CORRECTION_HINT =
  'transport_type is leeg — herlees ALLEEN de rij "Hoe verplaatst werknemer zich:" (niet het rijbewijzen-blok). Een ☒ bij Auto op die rij → transport_auto true. "B - Personenauto" is rijbewijs, geen vervoer.';
