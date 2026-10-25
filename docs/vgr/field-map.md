# VGR (Voortgangsrapportage) — field map

One report = five numbered ValentineZ templates, exported as a single PDF:

| # | Template | App section id | Print component |
|---|----------|----------------|-----------------|
| 01 | Voorblad | `cover` | `CoverA4` |
| 02 | Gegevens (werknemer / opdrachtgever / traject) | `gegevens` | `GegevensA4Pages` |
| 03 | Rapportage voortgang (body, A–E) | `body` | `BodyA4Pages` |
| 04 | Bijlage 1 — Voortgang en planning | `planning` | `PlanningA4Pages` |
| 05 | Bijlage 2 — Sollicitatieoverzicht | `applications` | `ApplicationsA4Pages` |

Storage: `vgr_instances.data_json` (one draft per employee, `status` draft → review → final) and immutable
`vgr_exports.snapshot_json` per PDF. Schema normalizer: `ensureVGRShape()` in `src/lib/vgr/mapping.ts`
(schema version `VGR_SCHEMA_VERSION = 2`). Types: `src/lib/vgr/schema.ts`. Static template text:
`src/lib/vgr/content.ts`. Acceptance checklist: [`docs/vgr/acceptance.md`](acceptance.md).

Legend used below: **E** = employee/TP master record copied as snapshot (fill-blanks), **R** = report-specific
(new in VGR), **C** = conditional block (hidden in PDF when not applicable), **S** = static template text,
**I** = template instruction (editor only, never exported), **AI** = AI proposal available.

## 01 — Voorblad

| Template field | Key | Source |
|---|---|---|
| "Rapportage voortgang" title, "Spoor 2 begeleiding", logo, visual | `VGR_COVER_TITLE`, `VGR_TRAJECTSOORT` | S |
| Werknemer | `first_name`, `last_name` | E (`employees`) |
| Opdrachtgever | `document_employer_name` → `client_name` (profile) | E (`clients` via `employees.client_id`), override R |
| Rapportagedatum | `vgr_meta.report_date` | R (default today; **not** `tp_creation_date`) |
| Rapportageperiode | `vgr_meta.period_start`, `vgr_meta.period_end` | R |
| Versie / vervolgrapportage | `vgr_meta.version`, `vgr_meta.prior_vgr_instance_id` | R |

## 02 — Gegevens

Flat keys, identical to TP 2026 so TP helpers (`getWerkgeverName`, `getReferentDisplayFields`, `FooterIdentity`) work unchanged.

| Block | Keys | Source |
|---|---|---|
| Werknemer | `gender`, `date_of_birth`, `phone`, `email`, `current_job`, `work_experience`, `education_level`, `education_name`, `drivers_license(_type)`, `transport_type`, `dutch_*`, `has_computer`, `computer_skills(_description)`, `contract_hours`, `other_employers` | E (`employee_details`, TP data_json) |
| Opdrachtgever | `client_name`/`employer_name` (live profile), `document_employer_name`, `client_referent_*` (live), `document_referent_*` (override) | E + R |
| Loopbaanadviseur | `consultant_name`, `consultant_user_id`, `consultant_phone`, `consultant_email` | E (`users`) |
| Traject | `first_sick_day`, `registration_date`, `intake_date`, `tp_creation_date`, `tp_start_date`, `tp_end_date`, `tp_lead_time`, `is_ex_werknemer` | E (`tp_meta`, TP) |
| AD / belastbaarheid | `has_ad_report`, `ad_report_concept`, `ad_report_date`, `occupational_doctor_name` (arbeidsdeskundige), `occupational_doctor_org` (bedrijfsarts), `fml_izp_lab_kind`, `fml_izp_lab_date` | E |
| Opdracht & doelstelling, AVG-noot, legenda | `VGR_OPDRACHT_DOELSTELLING`, `VGR_AVG_NOTE`, `VGR_LEGENDA` | S |
| Inhoudsopgave | `VGR_TOC` filtered by selected conditional blocks | S/C |

Validation: `fml_izp_lab_date` must differ from `first_sick_day` (warning in Review step).

## 03 — Rapportage voortgang (body)

All under `body.*`. Prose fields are snapshots (copied once from TP, then edited per report).

### A. Profiel werknemer

| Template | Key | Notes |
|---|---|---|
| Vraagstelling (5 questions) | `VGR_VRAAGSTELLING` | S |
| Benutbare mogelijkheden? ja/nee | `benutbare_mogelijkheden.heeft` | R |
| Prognose / conclusie / advies citaten (bedrijfsarts/AD) | `benutbare_mogelijkheden.{prognose,conclusie,advies}` (`VGRQuoteBlock`: bron_naam, bron_datum, bron_type, citaat) | R, AI (quotes from BA/AD docs only) |
| Eerdere prognose (follow-up) | `benutbare_mogelijkheden.eerdere_prognose` | carried from prior VGR |
| Praktische belemmeringen ja/nee + toelichting | `praktische_belemmeringen.{aanwezig,toelichting}` | E (TP `praktische_belemmeringen`) → R, C |
| Doelstelling traject (huidig / bij intake / historie) | `doelstelling_traject.{huidige,bij_intake,history[],toelichting}` | R; `history` carried forward |
| Persoonlijk profiel | `persoonlijk_profiel.tekst` | E (TP `persoonlijk_profiel`) → R, AI |
| Belastbaarheidsprofiel (FML/IZP/LAB, datum, auteur, rubrieken, toelichting) | `belastbaarheidsprofiel.*` | E (TP `prognose_bedrijfsarts`, `fml_izp_lab_*`, `occupational_doctor_org`) → R, AI |
| Bijstellingen belastbaarheid ja/nee + revisies | `bijstellingen_belastbaarheid.{aanwezig,revisions[],toelichting_geen}` | R, C, carried forward |
| Wijzigingen doelstelling ja/nee | `wijzigingen_doelstelling.{aanwezig,toelichting}` | R, C (auto-true when history has `changed`) |
| Zoekprofiel | `zoekprofiel.tekst` | E (TP `zoekprofiel`) → R, AI |
| Inzet en houding werknemer ja/nee + toelichting | `inzet_houding.{werkt_mee,toelichting}` | R, AI (from gespreksverslagen) |

### B. Fase motivatie

`interventies_motivatie` (`VGRInterventionSection`): `selected[]` of option ids from `VGR_MOTIVATIE_OPTIONS`
(`empowerment`, `rouwproces`, `overig`, `nvt`), per-id `blocks[id] = {toelichting, items[], standaardtekst}`.
Standard text per option is S/C; adviser toelichting is R.

### C. Fase oriëntatie

| Template | Key |
|---|---|
| Kwaliteiten en vaardigheden onderzoek (tests) | `kwaliteiten_onderzoek` (options `VGR_KWALITEITEN_OPTIONS`) + `persoonlijkheid_scores`, `persoonlijkheid_teksten`, `beroepen[]`, `beroepen_conclusie` — AI (test summarizer, from uploaded test reports only) |
| Scholing | `scholing` (options `VGR_SCHOLING_OPTIONS`) |
| Sollicitatievaardigheden | `sollicitatie_vaardigheden` (options `VGR_SOLLICITATIE_OPTIONS`), `vervolg_*` for the next period |

### D. Fase activatie

`interventies_activatie` (options `VGR_ACTIVATIE_OPTIONS`), `vervolg_*`.

### E. Perspectief

| Template | Key | Notes |
|---|---|---|
| POW-meter™ tekst + chart | `VGR_POW_METER_TEKST`, `VGR_POW_CHART_SRC` (`/pow-meter-v2.png`) | S |
| Inschaling bij intake / huidig / doel | `pow.{intake_trede,huidige_trede,doel_trede,doel_onbekend}` | E (TP `pow_meter` `<<<INSCHALING>>>`) → R, adviser confirms (`pow.confirmed`) |
| Werkzame uren | `pow.werkzame_uren`, `pow.werkzame_uren_context` | R |
| Metingen (historie) | `pow.history[] {date, toelichting}` | TP toelichting = intake measurement; carried forward |
| Visie AD (citaat) | `visie_plaatsbaarheid.ad` (`VGRQuoteBlock`) | E (TP `advies_ad_passende_arbeid`) |
| Kansen op de arbeidsmarkt | `visie_plaatsbaarheid.kansen` (`VGR_KANSEN_OPTIONS`) | R |
| Mogelijk passende functies | `visie_plaatsbaarheid.functies[]` | R |
| Conclusie loopbaanadviseur | `visie_plaatsbaarheid.conclusie` | E (TP `visie_loopbaanadviseur`) → R, AI |
| Leernavigator (basis / activering checklists) | `leernavigator.{basis[],activering[]}` (`VGR_LEERNAVIGATOR_*_DEFS`) | R, cumulative across reports; legacy `bijlage2_model` migrated here |

## 04 — Bijlage 1 Voortgang en planning

`planning_phases[]` (`VGRPlanningPhase`: `id,title,goal,period_from,period_to,activities[{id,name,status G/P/N/U,note}]`).
Defaults from `VGR_PLANNING_PHASE_DEFS` (exact 04 labels). Hydrated from TP `bijlage1_phases` with label remap
(`normalizeVgrActivityLabel`). Footnote/legend: `VGR_PLANNING_FOOTNOTE`, `VGR_PLANNING_LEGEND` (S).

## 05 — Bijlage 2 Sollicitatieoverzicht

`applications[]` (`VGRApplication`: `id,date,month_key,type,organisatie,functie,status,note`), grouped per month in print.
Types `VGR_APPLICATION_TYPES`, statuses `VGR_APPLICATION_STATUSES`. Caveats `VGR_APPLICATION_CAVEATS` (S/C).
Never AI-generated; manual entry (or future CSV import) only.

## Editor-only data (stripped from PDF)

`ai_proposals[sectionId]` (`VGRAiProposal`), `test_summaries[]` (`VGRTestSummary`), `vgr_meta.dismissed_warnings`,
`vgr_meta.source_document_ids`. All `instruction` strings in `content.ts` and `VGR_*_INSTRUCTIE` constants are **I**.

## Legacy migration (schema v1 stub → v2)

`ensureVGRShape` removes `bijlage2_model`, `bijlage3_decisions`, `bijlage3_page2`; checked `bijlage2_model` rows are
mapped to `body.leernavigator.basis` by label (`migrateLegacyBijlage2ToLeernavigator`). The old "Bijlage 3 stroomschema"
had no equivalent in the VGR templates and is dropped.
