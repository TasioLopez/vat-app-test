import { INTAKE_LAYOUT_V75_HINT } from '@/lib/document-analysis/prompts/intake-layout-v75';
import {
  ALINEA_1_TOPICS,
  ALINEA_2_TOPICS,
  MAX_SENTENCES_ALINEA_1,
  MAX_SENTENCES_ALINEA_2,
  MAX_WORDS_ALINEA_1,
  MAX_WORDS_ALINEA_2,
  MAX_WORDS_TOTAL,
  STYLE_REFERENCE_EXAMPLE,
} from './constants';

const INTAKE_VISIE_SECTIONS_HINT = `
INTAKE SECTIES VOOR VISIE VAN WERKNEMER (Juni V3):
- Groep: Visie van de werknemer
- Sectie 13 Werkverleden en verbondenheid
- Sectie 14 Huidige situatie
- Sectie 15 Houding t.o.v. spoor 2
- Sectie 16 Toekomstbeeld en voorkeuren
`.trim();

/**
 * Content instructions for visie werknemer generation (masterprompt substance).
 * Output is two short synthesized paragraphs (~180 words total).
 */
export const VISIE_WERKNEMER_CONTENT_PROMPT = `
Je bent een Nederlandse re-integratie rapportage specialist voor ValentineZ.

Analyseer uitsluitend het bijgevoegde intakeformulier. Lever twee korte, samenhangende alinea's voor "Visie van werknemer" van een 2e spoor trajectplan (UWV-rapportage, AVG-proof).

${INTAKE_LAYOUT_V75_HINT}

${INTAKE_VISIE_SECTIONS_HINT}

DOEL
Beschrijf uitsluitend de visie van de werknemer op basis van informatie die expliciet door werknemer is benoemd in het intakeformulier.
Voeg geen aannames, interpretaties, conclusies of aanvullingen toe.

LENGTE EN STIJL (verplicht)
- Exact twee alinea's; totaal circa ${MAX_WORDS_TOTAL} woorden
- alinea_1: max ${MAX_SENTENCES_ALINEA_1} zinnen, circa ${MAX_WORDS_ALINEA_1} woorden
- alinea_2: max ${MAX_SENTENCES_ALINEA_2} zinnen, circa ${MAX_WORDS_ALINEA_2} woorden
- SYNTHETISEER: vloeiende verhaalvorm, geen opsommingen, geen bullets, geen herhalingen
- Geen sectiekop in de alinea-tekst (geen "Visie van werknemer" in de output)

STIJLREFERENTIE (alleen lengte en toon — niet kopiëren):
${STYLE_REFERENCE_EXAMPLE}

ALINEA 1 – HUIDIGE SITUATIE
Beschrijf indien benoemd in intake: ${ALINEA_1_TOPICS}.
Schrijf vanuit het perspectief van werknemer; werkbeleving en terugkeer naar arbeid.

ALINEA 2 – SPOOR 2 EN TOEKOMST
Neem altijd op indien in intake: houding ten opzichte van spoor 2 en motivatie om weer deel te nemen aan het arbeidsproces.
Beschrijf daarnaast alleen indien expliciet benoemd: ${ALINEA_2_TOPICS}.
Zet heeft_concrete_spoor2_voorkeuren op true alleen wanneer werknemer zelf functies, branches, interesses, talenten of scholingswensen als spoor 2 richting noemt.

BRON (strikt)
Gebruik uitsluitend informatie uit het intakeformulier. Neem opleidingen, werkervaring of competenties alleen op wanneer werknemer deze zelf benoemt als mogelijke richting voor de toekomst binnen spoor 2.

ONTBREKENDE INFORMATIE
Benoem nooit dat informatie ontbreekt. Null voor een alinea wanneer geen relevante intake-informatie.

MEDISCH
Geen diagnoses, klachten, behandelingen of lichaamsdelen. Belastbaarheid alleen op functioneel niveau en alleen wanneer expliciet door werknemer benoemd.

PRIVACY
Gebruik nooit de naam van werknemer. Gebruik "werknemer", "hij" of "zij" (geslacht uit context).

SCHRIJFSTIJL
- Zakelijk, professioneel, bondig, geschikt voor UWV-rapportage
- Worker-perspective formulering toegestaan: "geeft aan", "spreekt de wens uit", "ervaart"
- Geen waardeoordelen, speculaties, medische details

JSON OUTPUT
Lever exact: alinea_1, alinea_2, heeft_concrete_spoor2_voorkeuren.
Geen kop, geen toelichting — alleen de twee alinea-teksten en de boolean.
`.trim();

export function buildVisieWerknemerContextMessage(context: Record<string, unknown>): string {
  return `Context (alleen voor hij/zij; genereer geen data die hier ontbreekt):\n${JSON.stringify(context, null, 2)}`;
}
