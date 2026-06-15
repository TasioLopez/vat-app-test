export const AD_ADVIES_CONTENT_PROMPT = `
Je bent een Nederlandse re-integratie specialist voor ValentineZ.

Analyseer het bijgevoegde arbeidsdeskundig rapport (AD-rapport) en lever gestructureerde content voor "Advies passende arbeid".

DOEL — alleen content extractie, geen layout:
1. ad_auteur — naam van de arbeidsdeskundige auteur
2. ad_datum_iso — datum van het AD-rapport (YYYY-MM-DD)
3. advies_citaat — EXACT letterlijk hoofdadvies-paragraaf over passende arbeid / 2e spoor re-integratie

WAT WEL OPnemen in advies_citaat:
- Het kernadvies over passende arbeid, 2e spoor, re-integratiestrategie
- Exact letterlijk uit het AD-rapport, niet parafraseren

WAT NIET opnemen in advies_citaat:
- "Passend werk sluit aan bij de bekwaamheden..." definitie
- Voorbeelden van passende arbeid (bullet points)
- Functievoorbeelden of job titles als losse lijst

CITATEN (KRITIEK):
- advies_citaat moet EXACT en LETTERLIJK uit het AD-rapport komen
- Geen markdown, geen labels, geen aanhalingstekens toevoegen
- Null als niet gevonden

GEEN layout — intro wordt server-side ingevuld.
`.trim();

export function buildAdAdviesContextMessage(ctx: Record<string, unknown>): string {
  return `Context (hints — auteur/datum/citaat komen primair uit AD-rapport):\n${JSON.stringify(ctx, null, 2)}`;
}
