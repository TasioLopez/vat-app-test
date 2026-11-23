-- Optional one-time data fix (run manually on staging/prod after code deploy).
-- Remaps known empty-state boilerplate for praktische_belemmeringen to the TP default.
-- Does NOT invent barriers; only replaces known "geen belemmeringen" stock sentences.
--
-- Review with the SELECTs first, then run the UPDATEs in a transaction.

-- Default sentence (must match PRACTISCHE_BELEMMERINGEN_DEFAULT in src/lib/tp2026/mapping.ts)
-- Voor zover bekend zijn er geen praktische belemmeringen die van invloed kunnen zijn op het verloop van het tweede spoortraject.

-- Preview: tp_meta
-- SELECT employee_id, praktische_belemmeringen
-- FROM tp_meta
-- WHERE trim(praktische_belemmeringen) ~* '^(er zijn geen praktische belemmeringen ten aanzien van werk( en/of re-integratie)?\.?|er zijn,? voor zover bekend,? geen praktische belemmeringen die mogelijk van invloed (kunnen )?zijn op het verloop van het tweede spoortraject\.?|geen praktische belemmeringen( bekend| van toepassing)?\.?|er zijn geen praktische belemmeringen( bekend)?\.?)$';

-- Preview: intake_instances s17 field
-- SELECT id, employee_id, data_json #>> '{s17,praktische_belemmeringen}' AS pb
-- FROM intake_instances
-- WHERE trim(coalesce(data_json #>> '{s17,praktische_belemmeringen}', '')) ~* '^(er zijn geen praktische belemmeringen ten aanzien van werk( en/of re-integratie)?\.?|er zijn,? voor zover bekend,? geen praktische belemmeringen die mogelijk van invloed (kunnen )?zijn op het verloop van het tweede spoortraject\.?|geen praktische belemmeringen( bekend| van toepassing)?\.?|er zijn geen praktische belemmeringen( bekend)?\.?)$';

BEGIN;

UPDATE tp_meta
SET praktische_belemmeringen =
  'Voor zover bekend zijn er geen praktische belemmeringen die van invloed kunnen zijn op het verloop van het tweede spoortraject.'
WHERE trim(praktische_belemmeringen) ~* '^(er zijn geen praktische belemmeringen ten aanzien van werk( en/of re-integratie)?\.?|er zijn,? voor zover bekend,? geen praktische belemmeringen die mogelijk van invloed (kunnen )?zijn op het verloop van het tweede spoortraject\.?|geen praktische belemmeringen( bekend| van toepassing)?\.?|er zijn geen praktische belemmeringen( bekend)?\.?)$';

UPDATE intake_instances
SET data_json = jsonb_set(
  data_json,
  '{s17,praktische_belemmeringen}',
  to_jsonb(''::text),
  true
)
WHERE trim(coalesce(data_json #>> '{s17,praktische_belemmeringen}', '')) ~* '^(er zijn geen praktische belemmeringen ten aanzien van werk( en/of re-integratie)?\.?|er zijn,? voor zover bekend,? geen praktische belemmeringen die mogelijk van invloed (kunnen )?zijn op het verloop van het tweede spoortraject\.?|geen praktische belemmeringen( bekend| van toepassing)?\.?|er zijn geen praktische belemmeringen( bekend)?\.?)$';

-- Optional: normalize markdown list markers in prognose_bedrijfsarts to canonical • lines.
-- Preview first:
-- SELECT employee_id, left(prognose_bedrijfsarts, 200)
-- FROM tp_meta
-- WHERE prognose_bedrijfsarts ~ '(^|\n)[-*] ';
--
-- UPDATE tp_meta
-- SET prognose_bedrijfsarts = regexp_replace(prognose_bedrijfsarts, '(?m)^([-★*☑✓])\s+', '• ', 'g')
-- WHERE prognose_bedrijfsarts ~ '(^|\n)[-*☑✓] ';
-- (Prefer re-save via the editor after deploy; the code normalizes on save.)

COMMIT;
