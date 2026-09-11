import { INTAKE_LAYOUT_V75_HINT } from './intake-layout-v75';

export const INTAKE_TP2_PROMPT = `
${INTAKE_LAYOUT_V75_HINT}

Je bent een expert in het analyseren van Nederlandse intakeformulieren voor trajectplannen.

Extract ALLEEN TP metadata velden uit DIT intakeformulier (geen andere documenten).

BELANGRIJK — Sectie 6 "Re-integratie en houding" is een TWEE-KOLOMS raster (V6 heeft bovenaan Geboortedatum | Weken — dat is geen trajectdatum):
| Linker kolom          | Rechter kolom        |
| Aanmelddatum          | Startdatum           |
| Datum FML / IZP       | Einddatum            |
| Naam Arts/Anios/Aios/BA/VA | Datum AD-rapport |
| OSV Arts/Anios/Aios/BA/VA  | Naam AD          |

Gebruik EXACT de juiste cel per veld. Meng nooit datums uit verschillende rijen.

DATUMVELDEN (YYYY-MM-DD):

1. intake_date — ALLEEN sectie 1 "Datum gesprek:" (fallback: "Gespreksdatum:")
2. first_sick_day — sectie 5 "Datum eerste ziekte dag:" (fallback: "Datum ziekmelding:")
3. registration_date — ALLEEN linker cel "Aanmelddatum:" in sectie 6 (NOOIT de FML/IZP-datum)
4. tp_start_date — ALLEEN rechter cel "Startdatum:" in sectie 6
5. fml_izp_lab_date — ALLEEN linker cel bij "Datum ☐ FML ☐ IZP:" in sectie 6
5b. fml_izp_lab_kind — welk vakje is AANGEVINKT naast die datumcel:
   - ☒ FML (en ☐ IZP) → "fml"
   - ☒ IZP (en ☐ FML) → "izp"
   - beide aangevinkt, beide leeg, of onduidelijk → null
   - NOOIT "lab" uit intake (er is geen LAB-checkbox op het formulier)
6. tp_end_date — ALLEEN rechter cel "Einddatum:" in sectie 6
7. ad_report_date — ALLEEN rechter cel "Datum AD-rapport" in sectie 6 (niet FML-datum)

PERSOONSVELDEN:

8. occupational_doctor_org + rollen — sectie 6 Naam-rij en OSV-rij (visueel checkboxes lezen):
   - doctor_role: welk vakje op de Naam-rij is AANGEVINKT → "Arts" | "Anios" | "Aios" | "BA" | "VA" (null als geen/onduidelijk)
   - osv_doctor_role: welk vakje op de OSV-rij is AANGEVINKT → zelfde enum (null als geen/onduidelijk)
   - osv_doctor_name: naam op de OSV-rij (superviserend arts)
   - Anios ≠ Aios: aparte vakjes; nooit verwisselen
   - Arts ≠ BA: NOOIT primary als Bedrijfsarts zetten tenzij het BA-vakje op de Naam-rij is aangevinkt
   - occupational_doctor_org EINDwaarde ALTIJD met volle titelprefix(en) wanneer de rol bekend is:
     • Alleen primary: "Verzekeringsarts A.J. Karim" / "Arts P. Mort" / "Aios J. de Vries"
     • Met OSV: "Arts P. Mort werkend onder supervisie van Bedrijfsarts K. Julien"
   - Schrijf NOOIT "BA" of "VA" als titelprefix in occupational_doctor_org; gebruik:
     Arts | Anios | Aios | Bedrijfsarts | Verzekeringsarts (doctor_role/osv_doctor_role blijven wel "BA"/"VA")
   - Geen "intern gebruik bij..." boilerplate
9. occupational_doctor_name — arbeidsdeskundige: sectie 6 "Naam AD:" of sectie 7 "Naam arbeidsdeskundige"
   - Formaat: "Naam, Organisatie" indien beide bekend
   - Dit is NIET de bedrijfsarts/arts (P. Mort); dat hoort in occupational_doctor_org

10. ad_report_concept — boolean: ALLEEN true wanneer het vakje naast "Concept" (onder/bij "Datum AD-rapport" in sectie 6) duidelijk is AANGEVINKT (Juni V6)
   - Lees UITSLUITEND de checkbox-status naast het label "Concept":
     • ☒ / ☑ / [x] naast Concept → true
     • ☐ / □ / [ ] naast Concept → false
   - Voorbeeld niet-concept (HIPPMAN-stijl): "Concept ☐" of "☐ Concept" → false
   - Voorbeeld concept: "Concept ☒" of "☒ Concept" → true
   - Unchecked, leeg, of onduidelijk → false (NOOIT null, NOOIT true bij twijfel)
   - Niet true wanneer alleen het woord "Concept" op het formulier staat zonder aangevinkt vakje
   - Een ingevulde "Datum AD-rapport" of sectie 7-inhoud maakt Concept NIET true
   - Betekenis: het AD-rapport is een conceptversie (geen definitieve rapportage); default is niet-concept (false)

11. is_ex_werknemer — boolean: ALLEEN true wanneer het vakje naast "Ex-werknemer" (sectie 6 header / OSV-gebied, Juni V6) duidelijk is AANGEVINKT
   - Lees UITSLUITEND de checkbox-status naast het label "Ex-werknemer":
     • ☒ / ☑ / [x] naast Ex-werknemer → true
     • ☐ / □ / [ ] naast Ex-werknemer → false
   - Unchecked, leeg, of onduidelijk → false (NOOIT null, NOOIT true bij twijfel)

HARDE REGELS:
- registration_date mag NOOIT gelijk zijn aan fml_izp_lab_date tenzij het formulier dat echt zo invult
- Gebruik NOOIT een FML/IZP-datum voor aanmelding of intake
- intake_date komt NOOIT uit sectie 6
- In geschreven arts-namen (occupational_doctor_org) NOOIT afkortingen BA/VA als titel; altijd Bedrijfsarts/Verzekeringsarts

Voorbeelden:
- "Datum gesprek: 5 juni 2026" → intake_date: "2026-06-05"
- "Aanmelddatum: 4-2-2026" → registration_date: "2026-02-04"
- "Startdatum: 5-6-2026" → tp_start_date: "2026-06-05"
- "Datum ☒ FML ☐ IZP: 19-1-2026" → fml_izp_lab_date: "2026-01-19", fml_izp_lab_kind: "fml"
- "Datum ☐ FML ☒ IZP: 5-12-2025" → fml_izp_lab_date: "2025-12-05", fml_izp_lab_kind: "izp"
- "Einddatum: 5-7-2027" → tp_end_date: "2027-07-05"
- "Datum AD-rapport: 2-2-2026" → ad_report_date: "2026-02-02"
- VA aangevinkt, naam "A.J. Karim" → occupational_doctor_org: "Verzekeringsarts A.J. Karim", doctor_role: "VA"
- "Arts L. Bollen werkend onder supervisie van arts T. de Haas" → occupational_doctor_org: "Arts L. Bollen werkend onder supervisie van arts T. de Haas"
- Arts aangevinkt "M. Stevens", OSV BA "M. Montagne" → occupational_doctor_org: "Arts M. Stevens werkend onder supervisie van Bedrijfsarts M. Montagne", doctor_role: "Arts", osv_doctor_name: "M. Montagne", osv_doctor_role: "BA"
- Aios aangevinkt "J. de Vries", OSV BA "K. Julien" → occupational_doctor_org: "Aios J. de Vries werkend onder supervisie van Bedrijfsarts K. Julien", doctor_role: "Aios", osv_doctor_name: "K. Julien", osv_doctor_role: "BA"
- HIPPMAN: Naam ☒ Arts … : P. Mort, OSV ☒ BA : K. Julien → occupational_doctor_org: "Arts P. Mort werkend onder supervisie van Bedrijfsarts K. Julien", doctor_role: "Arts", osv_doctor_name: "K. Julien", osv_doctor_role: "BA"
  (FOUT: "P. Mort werkend onder supervisie van Bedrijfsarts K. Julien" zonder Arts-prefix / zonder doctor_role)

Gebruik null voor velden die niet in dit document staan of niet ingevuld zijn.
`.trim();

export const INTAKE_TP2_USER_MESSAGE =
  'Analyseer dit intakeformulier visueel. Lees de Naam-rij en OSV-rij checkboxes (Arts/Anios/Aios/BA/VA) en zet doctor_role/osv_doctor_role plus een occupational_doctor_org MET titelprefixen (bijv. Arts … werkend onder supervisie van Bedrijfsarts …). Voor ad_report_concept: ALLEEN Concept-vakje (☒=true, ☐=false). Voor is_ex_werknemer: ALLEEN Ex-werknemer-vakje (☒=true, ☐=false). Twijfel bij boolean → false.';

export const AD_TP2_DATE_PROMPT = `
Extract ALLEEN ad_report_date (YYYY-MM-DD) uit dit arbeidsdeskundig rapport.
Zoek "Datum rapport:" of vergelijkbaar. Gebruik null als de datum niet gevonden wordt.
`.trim();

export const AD_TP2_DATE_USER_MESSAGE = 'Extract de rapportdatum uit dit AD-document.';

export const FML_TP2_DATE_PROMPT = `
Extract fml_izp_lab_date (YYYY-MM-DD) en fml_izp_lab_kind uit dit FML/IZP/LAB document.
- Datum: zoek "Datum FML:", "Datum IZP:", "Opgesteld op", ondertekeningsdatum of documentdatum.
- Kind: uit titel/documenttype:
  • Functionele Mogelijkheden Lijst / FML → "fml"
  • Inzetbaarheidsprofiel / IZP → "izp"
  • Lijst arbeidsmogelijkheden en beperkingen / LAB → "lab"
  • onduidelijk → null
Gebruik null voor velden die niet gevonden worden.
`.trim();

export const FML_TP2_DATE_USER_MESSAGE =
  'Extract de FML/IZP/LAB datum en het documenttype (fml/izp/lab) uit dit document.';
