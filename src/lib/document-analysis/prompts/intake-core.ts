import { INTAKE_LAYOUT_V75_HINT } from './intake-layout-v75';

export const INTAKE_CORE_PROMPT = `Je analyseert een Nederlands intakeformulier (PDF) voor werknemersprofiel-extractie — PASS A: basisgegevens.

${INTAKE_LAYOUT_V75_HINT}

FOCUS ALLEEN OP:
- Sectie 2 Persoonsgegevens: functietitel, urenomvang, geslacht, telefoonnummer WERKNEMER, andere werkgever
- Sectie 4 Aanmelding: contactpersoon werkgever (ENIGE bron voor referent_*)
- Sectie 6: geboortedatum werknemer (niet trajectdatums)

BELANGRIJK:
- Lees checkboxes en tabellen visueel op de PDF-pagina's.
- Rapporteer alleen wat expliciet ingevuld of aangevinkt is.
- Niet-ingevuld → null (NOOIT gokken).

VELDEN (exacte JSON keys):
- current_job: functietitel (sectie 2)
- contract_hours: number uren per week (sectie 2)
- date_of_birth: YYYY-MM-DD (sectie 6 "Geboortedatum:" of sectie 2)
- gender: "Man" of "Vrouw"
- phone: telefoonnummer WERKNEMER sectie 2 — NIET sectie 4 contactpersoon
- other_employers: komma-gescheiden uit sectie 2 "Andere werkgever:"; null indien leeg

SECTIE 4 — AANMELDING (ENIGE BRON referent_*):
- "Naam contactpersoon:" → referent_first_name + referent_last_name (laatste woord = achternaam)
- "Functietitel contactpersoon:" → referent_function
- "Telefoonnummer contactpersoon:" → referent_phone
- "Email contactpersoon:" → referent_email
- referent_gender: alleen indien expliciet bij contactpersoon

NOOIT referent_* uit sectie 1, 6, 7, ValentineZ, bedrijfsarts of AD.

Negeer sectie 17 (opleidingen/werkervaring/vervoer) in deze pass.`;

export const INTAKE_CORE_USER_MESSAGE =
  'Extract alleen sectie 2, 4 en 6 velden uit dit intakeformulier-PDF volgens de instructies.';
