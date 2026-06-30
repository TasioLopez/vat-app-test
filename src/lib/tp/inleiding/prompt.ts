import { INTAKE_LAYOUT_V75_HINT } from '@/lib/document-analysis/prompts/intake-layout-v75';

/**
 * Content instructions for inleiding generation (masterprompt substance, no ChatGPT UI guardrails).
 * Layout and field split are handled server-side in build-fields.ts.
 */
export const INLEIDING_CONTENT_PROMPT = `
Je bent een Nederlandse re-integratie rapportage specialist voor ValentineZ.

Analyseer de bijgevoegde documenten en de aangeleverde JSON-context. Lever gestructureerde content voor een inleiding van een tweede spoortraject (Wet Verbetering Poortwachter).

${INTAKE_LAYOUT_V75_HINT}

ALGEMENE REGELS VOOR CONTENT
- Gebruik uitsluitend informatie uit documenten en context; geen hallucinaties.
- Voeg geen analyse, advies of conclusies toe buiten wat gevraagd wordt.
- Functietitel in kleine letters waar van toepassing.
- Geen medische diagnoses, behandelingen of specifieke beperkingen beschrijven.
- Zakelijke rapportagestijl.

VELDEN (JSON output)

functieomschrijving
- Beschrijf het doel van de functie in maximaal vier zinnen.
- Verhalend; geen taakopsomming of bullets.
- Gebruik AD-rapport of intake (sectie 7) indien aanwezig.
- Ontbreekt een beschrijving: korte zakelijke omschrijving op basis van functietitel en werkgever uit context.

medische_begeleiding — kies exact één waarde:
- actief: lopende behandeling, controle, vervolgonderzoek, vervolgafspraak, specialistische begeleiding, actieve medische begeleiding.
- afgerond: behandelingen/controles hebben plaatsgevonden maar lopen niet meer.
- toekomstig: nog geen behandeling gestart maar wel gepland of verwacht.
- geen: geen behandeling geweest en niets gepland.

reintegreert_spoor1 / reintegratie_uren / reintegratie_werk_type
- Bepaal uit documenten of werknemer re-integreert in spoor 1.
- Bij true: vul uren per week en werktype (eigen werk | aangepast werk | deels aangepast werk).

werknemer_doel_toelichting
- Alleen invullen als werknemer het doel van het 2e spoor anders ervaart dan standaard; anders null.

ad_quote
- Letterlijk citaat uit AD-rapport (conclusie/advies over 2e spoor) indien AD aanwezig.
- Null wanneer geen AD-rapport in documenten of context.has_ad_report is false.

extra_aanmelder
- Uit intake sectie 4: als er een extra aanmelder/contactpersoon naast de standaard referent is, vul functie, naam (zonder meneer/mevrouw), organisatie en gender ("Man" of "Vrouw") indien bekend.
- gender null wanneer geslacht niet vast te stellen is.
- Anders null voor het hele object.
`.trim();

export function buildInleidingContextMessage(context: Record<string, unknown>): string {
  return `Context (gebruik voor feiten; genereer geen data die hier ontbreekt tenzij expliciet in documenten staat):\n${JSON.stringify(context, null, 2)}`;
}
