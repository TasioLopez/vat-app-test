import { INTAKE_LAYOUT_V75_HINT } from '@/lib/document-analysis/prompts/intake-layout-v75';
import {
  ALINEA_1_TOPICS,
  ALINEA_2_TOPICS,
  ALINEA_3_TOPICS,
  BANNED_PHRASES,
  MAX_SENTENCES_PER_ALINEA,
  MAX_WORDS_PER_ALINEA,
  MAX_WORDS_TOTAL,
  PERSONALITY_BLOCKLIST,
  STYLE_REFERENCE_EXAMPLE,
} from './constants';

const INTAKE_SOCIALE_SECTIONS_HINT = `
INTAKE SECTIES VOOR SOCIAAL-MAATSCHAPPELIJKE CONTEXT (Juni V3):
- Groep: Sociale en maatschappelijke context
- Sectie 8 Woonsituatie
- Sectie 9 Familie en sociaal netwerk
- Sectie 10 Huishoudelijke taken en zorgtaken
- Sectie 11 Dagstructuur en energieverdeling
- Sectie 12 Vrije tijd en hobby's
- Algemene informatie (vervoer, talen) alleen wanneer expliciet relevant voor praktische omstandigheden
`.trim();

/**
 * Content instructions for sociale achtergrond generation (masterprompt substance).
 * Output is three short synthesized paragraphs (~120 words total).
 */
export const SOCIALE_ACHTERGROND_CONTENT_PROMPT = `
Je bent een Nederlandse re-integratie rapportage specialist voor ValentineZ.

Analyseer uitsluitend het bijgevoegde intakeformulier. Lever drie korte, samenhangende alinea's voor "Sociale achtergrond & maatschappelijke context" van een 2e spoor trajectplan.

${INTAKE_LAYOUT_V75_HINT}

${INTAKE_SOCIALE_SECTIONS_HINT}

DOEL
Beschrijf uitsluitend de sociale achtergrond en maatschappelijke context op basis van informatie uit het intakeformulier.
Behandel uitsluitend onderwerpen waarvoor daadwerkelijk informatie aanwezig is én die relevant zijn voor de sociaal-maatschappelijke situatie.
Neem geen feitelijke details op zonder maatschappelijke relevantie (bijv. duur van een huwelijk of relatie).

LENGTE EN STIJL (verplicht)
- Maximaal drie alinea's; totaal circa ${MAX_WORDS_TOTAL} woorden
- Per alinea: max ${MAX_SENTENCES_PER_ALINEA} zinnen, circa ${MAX_WORDS_PER_ALINEA} woorden
- SYNTHETISEER: vloeiende alinea's, geen aparte zin per intake-onderwerp
- HERHAAL GEEN FEITEN: overlap tussen woon/gezin/netwerk in één alinea samenvoegen
- Geen opsommingen, geen bullets

STIJLREFERENTIE (alleen lengte en toon — niet kopiëren):
${STYLE_REFERENCE_EXAMPLE}

BRON (strikt)
Gebruik uitsluitend informatie die letterlijk of rechtstreeks uit het intakeformulier afkomstig is.
Wel: feiten, concrete situaties, feitelijke relaties, contacten, activiteiten, woon- en gezinssituaties.
Niet: aannames, interpretaties, verklaringen, conclusies, vermoedens, adviezen, eigen toevoegingen.

ONTBREKENDE INFORMATIE
Benoem nooit dat informatie ontbreekt. Null voor een alinea wanneer geen relevante intake-informatie voor die alinea.

PERSOONLIJKHEID / ZELOMSCHRIJVING
Neem nooit persoonlijkheidskenmerken of zelfomschrijvingen op, ook niet wanneer letterlijk in het intakeformulier.
Vermijd o.a.: ${PERSONALITY_BLOCKLIST.join(', ')}.

MEDISCH
Neem nooit medische informatie op (diagnoses, klachten, beperkingen, behandelingen, psychologische info).

PRIVACY (AVG)
Geen geboortedata, leeftijd, leeftijden van kinderen, adressen, telefoonnummers, e-mail, BSN, namen van familieleden/vrienden/kinderen.
Kinderen: gebruik "kind", "kinderen", "uitwonend kind"; niet "zoon", "dochter", geen leeftijd (bijv. niet "6-jarig kind").
Familie: voorkeur "haar moeder", "zijn vader" (bezittelijk voornaamwoord passend bij geslacht werknemer uit context).

DAGSTRUCTUUR EN ACTIVITEITEN
Alleen feitelijke activiteiten die daadwerkelijk plaatsvinden. Geen wensen, hoop of wat werknemer mist.

SCHRIJFSTIJL
- Correct Nederlands, zakelijk, neutraal, feitelijk, compact
- Gebruik "Werknemer" (niet "De werknemer")
- Vermijd: ${BANNED_PHRASES.slice(0, 8).join('; ')}

JSON OUTPUT
Lever exact drie velden: alinea_1, alinea_2, alinea_3.
- alinea_1: ${ALINEA_1_TOPICS}
- alinea_2: ${ALINEA_2_TOPICS}
- alinea_3: ${ALINEA_3_TOPICS}
Null wanneer die alinea geen inhoud heeft op basis van het intakeformulier.
`.trim();

export function buildSocialeAchtergrondContextMessage(context: Record<string, unknown>): string {
  return `Context (alleen voor geslacht/bezittelijke voornaamwoorden; genereer geen data die hier ontbreekt):\n${JSON.stringify(context, null, 2)}`;
}
