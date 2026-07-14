import { INTAKE_LAYOUT_V75_HINT } from './intake-layout-v75';

/** @deprecated Use INTAKE_CORE_PROMPT + INTAKE_ALGEMENE_INFO_EXTRACTION_PROMPT for Step 2 vision extraction. */
export const INTAKE_EMPLOYEE_PROMPT = `Je analyseert een Nederlands intakeformulier voor werknemersprofiel-extractie.

${INTAKE_LAYOUT_V75_HINT}

BELANGRIJK:
- Lees het HELE geüploade document, inclusief checkboxes, tabellen en formulierblokken.
- Rapporteer alleen wat aangevinkt of expliciet ingevuld is.
- Als een veld niet leesbaar of niet ingevuld is: laat de key weg of gebruik null — NOOIT gokken met false, lege arrays, of computer_skills "1".

VELDEN (employee_details) — gebruik exact deze JSON keys:

Tekst:
- current_job: functietitel (sectie 2)
- contract_hours: number (uren per week, sectie 2)
- date_of_birth: YYYY-MM-DD (sectie 6 "Geboortedatum:" in V5, of sectie 2 indien aanwezig)
- gender: "Man" of "Vrouw" (sectie 2)
- phone: telefoonnummer van de WERKNEMER uit sectie 2 "Telefoonnummer:" — NIET sectie 4 "Telefoonnummer contactpersoon"
- work_experience: ALLE functietitels uit tabel "Werkervaring? Van-tot?" in blok Algemene informatie (sectie 17 V5 of onderaan V4) — komma-gescheiden, geen datums/organisaties/jaren. Sla pure werkgevernamen over zonder functietitel (bijv. alleen bedrijfsnaam). Neem alle ingevulde regels mee (bijv. Teamleider PostNL/PTT, Thuiszorg, Keukenassistent, Winkelmedewerker). NIET sectie 2 functietitel — die hoort bij current_job. FALLBACK: als de tabel alleen werkgever/duur bevat (geen functietitel), lees sectie 13 "Werkverleden" — bijv. "andere functies gedaan passagiers assistent, operationele planner". Sla current_job (huidige functie) NOOIT op in work_experience.
- education_level: HOOGSTE afgeronde basisopleiding uit tabel "Opleidingen? Afgerond?" in blok Algemene informatie — alleen regels met "Afgerond" = Ja. Bij V7/V7.5: aangevinkte checkbox ☒/☑ in Afgerond-kolom = Ja; ☐ of tweede box aangevinkt (☐ ☒) = Nee. Bij meerdere afgeronde opleidingen: kies het hoogste niveau. Geldige niveaus: Praktijkonderwijs, VMBO, Huishoudschool, LTS, LHNO, HAVO, VWO, MBO 1-4, MTS, HBO, WO. Plain "Mbo" zonder cijfer is geldig (tel als MBO). Certificaten (VCA, VCA-VOL, BHV, EHBO, etc.) zijn NOOIT education_level. Onvoltooide opleidingen (Afgerond = Nee) NOOIT als education_level. Geen afgeronde opleiding → laat education_level weg. NOOIT "geen", "nee" of "nei" als education_level invullen. NIET aspiratie uit sectie 16 tenzij enige afgeronde opleiding.
- education_name: richting/naam bij die gekozen basisopleiding; certificaten (VCA, etc.) NOOIT in education_name als er schooling op regel 1 staat
- other_employers: komma-gescheiden werkgeversnamen uit sectie 2 "Andere werkgever:", of laat de key weg als er geen andere werkgevers zijn — NOOIT de tekst "null" invullen

Vervoer:
- transport_type: array van aangevinkte opties: "Auto", "Fiets", "Bromfiets", "Motor", "OV", "Lopend"
- drivers_license: true/false — alleen als duidelijk; weglaten indien onduidelijk
- drivers_license_type: array zoals ["B"] — weglaten indien geen rijbewijs

Talen (Nederlands, G/R/O):
- dutch_speaking, dutch_writing, dutch_reading: exact "Goed", "Gemiddeld", of "Niet goed" (O = Onvoldoende → "Niet goed")

Computer:
- has_computer: true/false (PC/Laptop aangevinkt)
- computer_skills: string "1" t/m "5" (1=Geen, 2=Basis, 3=Gemiddeld, 4=Geavanceerd, 5=Expert) — het AANGEVINKTE niveau

SECTIE 4 — AANMELDING (ENIGE BRON voor referent_*):
Lees ALLEEN deze velden in sectie 4 "Aanmelding":
- "Naam contactpersoon:" → referent_first_name + referent_last_name (split: laatste woord = achternaam, rest = voornaam)
- "Functietitel contactpersoon:" → referent_function
- "Telefoonnummer contactpersoon:" → referent_phone
- "Email contactpersoon:" → referent_email

NOOIT referent_* vullen met namen of contactgegevens uit andere secties, o.a.:
- sectie 1 Naam werknemer
- sectie 6/7 (bedrijfsarts, AD, arbeidsdeskundige, OSV, arts/anios)
- ValentineZ / loopbaanadviseur
- enig ander "Naam …" veld buiten sectie 4

referent_gender: alleen invullen als expliciet bij contactpersoon in sectie 4; anders null.

Gebruik null voor velden die niet in dit document staan of niet ingevuld zijn.`;

export const INTAKE_EMPLOYEE_USER_MESSAGE =
  'Analyseer dit intakeformulier en vul employee_details-velden volgens de instructies. Let op: werknemer telefoon uit sectie 2; contactpersoon werkgever (referent) uitsluitend uit sectie 4 Aanmelding. Let ook op aangevinkte vervoer, rijbewijs, talen (G/R/O), en computervaardigheden.';
