# Zoekprofiel V3 — reference prompt

Source: contact masterprompt (Zoekprofiel V3 PDF).  
Runtime implementation: `src/lib/tp/zoekprofiel/prompt.ts` (`ZOEKPROFIEL_CONTENT_PROMPT`).

## Key V3 rules (summary)

- **Opening (V3):** “Op basis van de hoogst afgeronde opleiding(en) en de werkervaring…”
- **Two paragraphs**; preferred 150–225 words total; completeness over limit.
- **Paragraph 1 closing** (FML/IZP/LAB/belastbaarheidsprofiel + optional actualisatie) is **server-built**, not model-generated.
- **Actualisaties:** spreekuurrapportage / artsenverduidelijking chronologically appended when relevant.
- **Scenarios:** insufficient → N.B. only; separate belast doc → closing; AD-only → no FML closing, para 2 from AD.
- **Clarification loop:** model may return `verduidelijkingsvraag`; advisor answers via `ZoekprofielEditor` POST flow.
- **Paragraph 2:** translate afwijkende beperkingen; formulate conditions about **work**, not the person (werk vs werknemer).

## Standard lines

- **N.B. (no AD / no belast source):** `N.B.: Tijdens het opstellen van dit trajectplan is er nog geen AD-rapport opgesteld.`
- **FML closing:** … vastgelegd in de Functionele Mogelijkheden Lijst van [datum].
- **IZP closing:** … vastgelegd in het Inzetbaarheidsprofiel van [datum].
- **Actualisatie suffix:** ` en geactualiseerd in de [spreekuurrapportage/artsenverduidelijking] van [datum]`

See `src/lib/tp/zoekprofiel/constants.ts` for exact templates.
