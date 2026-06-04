# Trajectplan basis — reference document

Place the Word/PDF template here for audits:

- **File name:** `03_Trajectplan_basis_document.pdf` (or the current export you use for parity checks).

## Section coverage (builder preview ≈ pages 2 → signature)

Order implemented in `Basis2026A4Pages` (`src/components/tp2026/sections/Basis2026Section.tsx`):

1. **Inleiding** — `inleiding`; optional **NB (AVG)** when there is no toelichting and `has_ad_report === false`; optional **Toelichting** — `inleiding_sub` (delimiter block or Markdown).
2. **Wettelijke kaders en terminologie** — `wettelijke_kaders` with default from `WETTELIJKE_KADERS` when empty.
3. Sociale achtergrond; Visie werknemer; Visie loopbaanadviseur; Prognose bedrijfsarts; Persoonlijk profiel; Zoekprofiel; Praktische belemmeringen; AD-advies block; PoW-meter; Visie plaatsbaarheid.
4. **Onderdelen Spoor 2 begeleiding** — static template from `src/lib/tp2026/basis-spoor2-begeleiding.ts` (Toelichting + 12 subsections; always rendered, not driven by `tp3_activities`).
5. **Met ondertekening van trajectplan…** — shared copy in `src/lib/tp2026/basis-document-agreement.ts`.
6. **Handtekeningen** — `BasisSignatureBlock` (employee, adviseur, opdrachtgever).

After adding the PDF, walk this list page by page and adjust titles or copy only when product confirms a template change.
