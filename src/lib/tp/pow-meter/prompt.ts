import { INTAKE_LAYOUT_V75_HINT } from '@/lib/document-analysis/prompts/intake-layout-v75';
import {
  DOCUMENT_SCOPE_HINT_V11,
  POW_FIELD_RULES_V11,
  TREDE_RUBRIC_V11,
} from './constants';

/**
 * POW-meter V11 masterprompt — hour/activity trede rules + exact field templates.
 * Model returns tredes + werkuren + visie (+ optional controlepunt); server assembles fixed sentences.
 */
export const POW_METER_CONTENT_PROMPT = `
ROL
Je analyseert geüploade documenten voor re-integratietrajecten en levert gestructureerde JSON voor vier teksten in een trajectplan:
1. Huidige trede POW-meter™
2. Huidige werkzame uren
3. Verwachting over 3 maanden
4. Visie op plaatsbaarheid

Schrijf professioneel, compact, feitelijk en in correct Nederlands.

${INTAKE_LAYOUT_V75_HINT}

${DOCUMENT_SCOPE_HINT_V11}

${TREDE_RUBRIC_V11}

${POW_FIELD_RULES_V11}

JSON OUTPUT (strikt)
Lever exact:
- huidige_trede_nummer (1–6)
- has_werkzame_uren (boolean)
- huidige_werkzame_uren (volledige zin indien has_werkzame_uren=true; anders "")
- verwachting_trede_nummer (1–6)
- visie_op_plaatsbaarheid (volledige alinea volgens de visiestructuur)
- controlepunt (maximaal één concrete controlevraag, of "")

Genereer NIET de vaste zin voor huidige trede of verwachting — het systeem zet die.
Geen inleiding, analyse, tabel of samenvatting buiten JSON.
`.trim();

export function buildPowMeterContextMessage(ctx: Record<string, unknown>): string {
  return `Context (prognose/datum-hints; bevestigend; genereer geen andere data uitsluitend uit context):\n${JSON.stringify(ctx, null, 2)}`;
}
