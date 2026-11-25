# VGR acceptance scenarios (synthetic employees only)

Never use the filled ValentineZ example reports as fixture data. They contain real PII.

## Composition + data

- [ ] Export is one PDF in order 01 cover → 02 gegevens → 03 body → 04 Bijlage 1 → 05 Bijlage 2.
- [ ] Cover shows the selected employee (name) and report-specific `vgr_meta.report_date`, not the historic sample date.
- [ ] Opdrachtgever maps to the selected employee’s client / document override.
- [ ] `fml_izp_lab_date` is independent of `first_sick_day`. Setting them equal surfaces warning `gegevens:_:fml-eq-ezd`.
- [ ] No Word merge placeholders (`«…»`), yellow instruction highlights, or “Onderstaande legenda/tekst verwijderen” in the PDF.
- [ ] Document 02 does not force a blank third page.
- [ ] Footer shows name + date of birth + recalculated page numbers.

## First VGR

- [ ] Employee has a TP 2026 and no prior final VGR.
- [ ] Draft hydrates gegevens + body prose + planning from TP; `applications` stays empty.
- [ ] No invented prior-period narrative, historic PoW “current” distinct from intake, or fabricated tests.
- [ ] Unselected intervention blocks are omitted from the PDF.

## Follow-up VGR

- [ ] Prior VGR is `status=final` with an export snapshot.
- [ ] New draft `version` increments; `prior_vgr_instance_id` / `prior_vgr_export_id` are set.
- [ ] Goal history, capacity revisions, PoW history and Leernavigator checks carry forward (newest first).
- [ ] Period-specific applications and inzet start empty / unselected.
- [ ] Finalizing the new report does not mutate the previous export `snapshot_json`.
- [ ] AI uses past tense for the prior period and present tense for the current period.

## Activation-only employee

- [ ] Low activity, zero applications is valid. Bijlage 2 renders the empty state honestly.
- [ ] Checking “Wekelijks solliciteren” without applications shows `applications:_:wekelijks-zonder-apps`.
- [ ] PoW doel can be marked unknown; no automatic forecast to a higher trede.

## Active job-search employee

- [ ] Multiple month groups, 1–20+ activities, mixed types/statuses (`te zwaar` allowed with note).
- [ ] Narrative, Bijlage 1 statuses and Bijlage 2 stay consistent (Review warnings if not).
- [ ] Caveats render; editor legend is not exported.

## Conflicts & missing data

- [ ] Conflicting FML dates, hours vs PoW, goal vs applications produce visible warnings.
- [ ] Warnings are dismissible with a stored rationale; errors are not.
- [ ] Missing optional test does not appear in the VGR or test summary.
- [ ] Missing AD quote stays empty — no generic fabricated advice.

## Test summarizer

- [ ] Thresholds: 0 and 49 → `lager` + low-side source text; 50 → `gemiddeld` + high-side; 51 and 100 → `hoger` + high-side.
- [ ] Exact percentages preserved; no invented occupations; list ≤ supplied (never pad to 15).
- [ ] Advertising / call-to-action stripped.
- [ ] Upload does not auto-overwrite the VGR; adviser must generate then insert.
- [ ] Neutral “werknemer” unless gender is set.

## Printing, UI & security

- [ ] Visual check vs blank templates: cover Z, gegevens tables, body cards, PoW chart, phase table, month list.
- [ ] Long paragraphs paginate without stranded headings or clipped checkboxes.
- [ ] RLS: adviser sees only employees they can access; admin all.
- [ ] Autosave draft; regenerate a section without wiping other edits; one approved final + signed download.
- [ ] TP 2026 and Intake builders still open, save and export.

## Autofill honesty (Phase 1 — synth)

- [x] G4: Benutbare mogelijkheden uses arts/FML sources only; AD alone is non-writable; apply refuses AD-as-lead quotes.
- [x] G10: Style prompt carries SYSTEM_VGR_CORE status vocabulary; proposals stamp `approved_rules_version`.
- [x] G6 lite: Generate-all / per-section skip non-`writable` modules; one question per gap in preflight UI.
- [x] T05: Exact quotes preserved (no silent spelling “fixes”); invented/empty quotes refused on Overnemen.
- [x] T01/T06/T13: Heuristic detectors + style rules for invented tests/apps, opgesteld≠verzonden, gepland≠uitgevoerd.
- [x] D10: Zoekprofiel AI remains concept until deskundige confirm on apply.

## Dossier spine (Phase 2 — synth)

- [x] Pack-shaped `vgr_dossiers` (`source_documents` / `assertions` / `activities` / `issues`) beside instances.
- [x] CLASSIFY → EXTRACT → MERGE via `/api/vgr/dossier/sync` (Setup “Dossier synchroniseren”); D01: no auto Overnemen.
- [x] WRITE context prefers verified facts (`collect-context`); PDFs remain optional evidence; PDF export only.
- [x] G3 lite: EMAIL / MOTIVATIEBRIEF / TEST / WERKBOEK filename heuristics; G8 quarantine on mismatch.
- [x] G5 lite: application_status chain + Bijlage 2 proposals helper (not auto-applied).
- [ ] Full pack T01–T22 end-to-end + rich OCR extract (later).

## Commands

```
npm run test:vgr
```
