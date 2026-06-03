import { INTAKE_LAYOUT_V75_HINT } from './intake-layout-v75';

export const INTAKE_EMPLOYEE_PROMPT = `Je analyseert een Nederlands intakeformulier voor werknemersprofiel-extractie.

${INTAKE_LAYOUT_V75_HINT}

BELANGRIJK:
- Lees het HELE geüploade document, inclusief checkboxes, tabellen en formulierblokken.
- Rapporteer alleen wat aangevinkt of expliciet ingevuld is.
- Als een veld niet leesbaar of niet ingevuld is: laat de key weg of gebruik null — NOOIT gokken met false, lege arrays, of computer_skills "1".

VELDEN (employee_details) — gebruik exact deze JSON keys:

Tekst:
- current_job: functietitel
- contract_hours: number (uren per week)
- date_of_birth: YYYY-MM-DD
- gender: "Man" of "Vrouw"
- work_experience: alleen functietitels, komma-gescheiden, geen datums/organisaties
- education_level: HOOGSTE afgeronde opleiding uit tabel "Opleidingen? Afgerond?" (VMBO, MBO 3, HBO, …). NIET aspiratie uit sectie 16 tenzij enige opleiding.
- education_name: naam bij hoogste afgeronde opleiding
- other_employers: komma-gescheiden of null

Vervoer:
- transport_type: array van aangevinkte opties: "Auto", "Fiets", "Bromfiets", "Motor", "OV", "Lopend"
- drivers_license: true/false — alleen als duidelijk; weglaten indien onduidelijk
- drivers_license_type: array zoals ["B"] — weglaten indien geen rijbewijs

Talen (Nederlands, G/R/O):
- dutch_speaking, dutch_writing, dutch_reading: exact "Goed", "Gemiddeld", of "Niet goed" (O = Onvoldoende → "Niet goed")

Computer:
- has_computer: true/false (PC/Laptop aangevinkt)
- computer_skills: string "1" t/m "5" (1=Geen, 2=Basis, 3=Gemiddeld, 4=Geavanceerd, 5=Expert) — het AANGEVINKTE niveau

Referent (mag in JSON; wordt apart verwerkt):
- referent_first_name, referent_last_name, referent_function, referent_phone, referent_email, referent_gender

RETURN FORMAT: PLAT JSON object (keys direct op root); NIET wrappen in "employee_details" of "referent". Geen markdown.`;

export const INTAKE_EMPLOYEE_USER_MESSAGE =
  'Analyseer dit intakeformulier en vul alle employee_details-velden volgens de instructies. Let extra op aangevinkte vervoer, rijbewijs, talen (G/R/O), en computervaardigheden.';
