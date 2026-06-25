import { INTAKE_LAYOUT_V75_HINT } from './intake-layout-v75';

export const INTAKE_TP2_PROMPT = `
${INTAKE_LAYOUT_V75_HINT}

Je bent een expert in het analyseren van Nederlandse intakeformulieren voor trajectplannen.

Extract ALLEEN TP metadata velden uit DIT intakeformulier (geen andere documenten).

BELANGRIJK — Sectie 6 "Re-integratie en houding" is een TWEE-KOLOMS raster (V5 heeft bovenaan Geboortedatum | Weken — dat is geen trajectdatum):
| Linker kolom          | Rechter kolom        |
| Aanmelddatum          | Startdatum           |
| Datum FML / IZP       | Einddatum            |
| Naam Arts/Anios/BA/VA | Datum AD-rapport     |
| OSV Arts/Anios/BA     | Naam AD              |

Gebruik EXACT de juiste cel per veld. Meng nooit datums uit verschillende rijen.

DATUMVELDEN (YYYY-MM-DD):

1. intake_date — ALLEEN sectie 1 "Datum gesprek:" (fallback: "Gespreksdatum:")
2. first_sick_day — sectie 5 "Datum eerste ziekte dag:" (fallback: "Datum ziekmelding:")
3. registration_date — ALLEEN linker cel "Aanmelddatum:" in sectie 6 (NOOIT de FML/IZP-datum)
4. tp_start_date — ALLEEN rechter cel "Startdatum:" in sectie 6
5. fml_izp_lab_date — ALLEEN linker cel bij "Datum ☐ FML ☐ IZP:" in sectie 6
6. tp_end_date — ALLEEN rechter cel "Einddatum:" in sectie 6
7. ad_report_date — ALLEEN rechter cel "Datum AD-rapport" in sectie 6 (niet FML-datum)

PERSOONSVELDEN:

8. occupational_doctor_org — bedrijfsarts: sectie 6 rij "Naam ☐ Arts ☐ Anios ☐ BA ☐ VA:"
   - Geef ook doctor_role: "Arts" | "Anios" | "BA" | "VA" (welke checkbox is aangevinkt)
   - Alleen de ingevulde naam, geen "intern gebruik bij..." tenzij supervisie-zin aanwezig
9. occupational_doctor_name — arbeidsdeskundige: sectie 6 "Naam AD:" of sectie 7 "Naam arbeidsdeskundige"
   - Formaat: "Naam, Organisatie" indien beide bekend

HARDE REGELS:
- registration_date mag NOOIT gelijk zijn aan fml_izp_lab_date tenzij het formulier dat echt zo invult
- Gebruik NOOIT een FML/IZP-datum voor aanmelding of intake
- intake_date komt NOOIT uit sectie 6

Voorbeelden:
- "Datum gesprek: 5 juni 2026" → intake_date: "2026-06-05"
- "Aanmelddatum: 4-2-2026" → registration_date: "2026-02-04"
- "Startdatum: 5-6-2026" → tp_start_date: "2026-06-05"
- "Datum FML: 19-1-2026" → fml_izp_lab_date: "2026-01-19"
- "Einddatum: 5-7-2027" → tp_end_date: "2027-07-05"
- "Datum AD-rapport: 2-2-2026" → ad_report_date: "2026-02-02"
- VA aangevinkt, naam "A.J. Karim" → occupational_doctor_org: "A.J. Karim", doctor_role: "VA"
- "Arts L. Bollen werkend onder supervisie van arts T. de Haas" → occupational_doctor_org: "Arts L. Bollen werkend onder supervisie van arts T. de Haas"

Return ONLY a JSON object met de gevonden velden.
`.trim();

export const INTAKE_TP2_USER_MESSAGE =
  'Analyseer dit intakeformulier en extract de trajectplan metadata velden.';

export const AD_TP2_DATE_PROMPT = `
Extract ALLEEN ad_report_date (YYYY-MM-DD) uit dit arbeidsdeskundig rapport.
Zoek "Datum rapport:" of vergelijkbaar. Return JSON: { "ad_report_date": "YYYY-MM-DD" } of {}.
`.trim();

export const AD_TP2_DATE_USER_MESSAGE = 'Extract de rapportdatum uit dit AD-document.';

export const FML_TP2_DATE_PROMPT = `
Extract ALLEEN fml_izp_lab_date (YYYY-MM-DD) uit dit FML/IZP/LAB document.
Zoek "Datum FML:", "Datum IZP:" of documentdatum. Return JSON: { "fml_izp_lab_date": "YYYY-MM-DD" } of {}.
`.trim();

export const FML_TP2_DATE_USER_MESSAGE = 'Extract de FML/IZP datum uit dit document.';
