import { INTAKE_LAYOUT_V75_HINT } from './intake-layout-v75';

export const INTAKE_ALGEMENE_INFO_EXTRACTION_PROMPT = `Je analyseert een Nederlands intakeformulier (PDF) — PASS B: sectie 17 Algemene informatie.

${INTAKE_LAYOUT_V75_HINT}

FOCUS ALLEEN OP sectie 17 "Algemene informatie" (Bijzonderheden) en bij V4-layout hetzelfde blok onderaan:
- Tabel "Opleidingen? Afgerond?"
- Tabel "Werkervaring? Van-tot?"
- Digitale vaardigheden / computervaardigheden
- Rijbewijzen
- Vervoer (Auto, Fiets, OV, …)
- Talen (G/R/O → Goed, Gemiddeld, Niet goed)

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

VERVOER / RIJBEWIJS / TALEN / COMPUTER:
- transport_type: array aangevinkte opties
- drivers_license + drivers_license_type (bijv. ["B"])
- dutch_speaking, dutch_writing, dutch_reading: "Goed", "Gemiddeld", "Niet goed"
- has_computer: PC/laptop aangevinkt
- computer_skills: "1" t/m "5" (aangevinkt niveau)

Gebruik null voor ontbrekende velden.`;

export const INTAKE_ALGEMENE_INFO_USER_MESSAGE =
  'Extract alleen sectie 17 Algemene informatie velden uit dit intakeformulier-PDF. Let op checkbox-kolommen en tabellen.';
