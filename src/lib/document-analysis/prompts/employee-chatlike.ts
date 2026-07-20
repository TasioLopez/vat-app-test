import { INTAKE_LAYOUT_V75_HINT } from './intake-layout-v75';

/**
 * Chat-like employee profile extract: all docs attached, intake preferred.
 * Soft schema (EMPLOYEE_EXTRACTION_JSON_SCHEMA) — no per-box license/transport booleans.
 */
export const EMPLOYEE_CHATLIKE_PROMPT = `Je analyseert Nederlandse werknemersdocumenten om employee_details te vullen.

DOCUMENTEN:
- Alle geüploade PDF's horen bij dezelfde werknemer (intake, AD, FML/IZP, spreekuurrapportage, CV, extra, …).
- Lees ze als geheel; gebruik checkboxes, tabellen en tekst.

BRONPRIORITEIT (belangrijk):
1. Intakeformulier — primaire bron voor bijna alle werknemersprofiel-velden (functie, uren, geboortedatum, geslacht, telefoon, opleiding, werkervaring, vervoer, rijbewijs, talen, computer, referent/contactpersoon sectie 4).
2. AD-rapport — alleen gebruiken om gaten te vullen of te bevestigen (functie, uren, opleiding, werkervaring, rijbewijs) wanneer het intake die info niet heeft.
3. Spreekuurrapportage / FML/IZP / CV / overig — alleen aanvullen waar intake (en AD) niets geven.

Conflict: als intake iets duidelijk aangeeft (bijv. ☒ Auto ☐ Fiets ☐ OV), volg het intake — niet "verbeteren" met andere documenten.

${INTAKE_LAYOUT_V75_HINT}

REGELS:
- Rapporteer alleen wat aangevinkt of expliciet staat. Geen gokken.
- Ontbrekend → null. NOOIT false/lege arrays/"1" verzinnen.
- transport_type: alleen aangevinkte opties uit "Hoe verplaatst werknemer zich:" → "Auto","Fiets","OV","Lopend". Rijbewijs B ≠ Auto.
- drivers_license_type: alleen aangevinkte categorieën (bijv. ["B"]); leeg laten als onduidelijk.
- dutch_speaking/writing/reading: "Goed", "Gemiddeld", of "Niet goed".
- computer_skills: "1"–"5" (1=Geen … 5=Expert) — aangevinkt niveau; has_computer bij PC/laptop.
- referent_*: ALLEEN uit intake sectie 4 Aanmelding (contactpersoon werkgever), nooit bedrijfsarts/AD/werknemer-naam.
- work_experience: functietitels komma-gescheiden; NIET current_job herhalen.
- education_level: hoogste afgeronde schooling; geen certificaten (VCA/BHV) als level.

Gebruik null voor velden die nergens betrouwbaar staan.`;

export const EMPLOYEE_CHATLIKE_USER_MESSAGE =
  'Extract employee_details uit alle bijgevoegde documenten. Prefer intake; vul gaten met AD/spreek/overig. Vervoer/rijbewijs/talen/computer/referent bij voorkeur uit intake.';
