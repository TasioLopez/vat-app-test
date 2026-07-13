import { STANDARD_RUBRIEKEN } from './constants';

export const BELASTBAARHEID_CONTENT_PROMPT = `
Je bent een Nederlandse re-integratie specialist voor ValentineZ.

Analyseer de bijgevoegde documenten (FML/IZP/LAB, AD-rapport, intakeformulier) en lever gestructureerde content voor het Belastbaarheidsprofiel.

BELANGRIJK: Spreekuurrapportage wordt apart verwerkt. Gebruik NOOIT een Spreekuurrapportage-document als bron in deze extractie.

DOEL — alleen rubrieken extractie, geen layout:
1. rubrieken — lijst van FML-rubrieken waarin werknemer beperkingen heeft (fallback wanneer context.has_spreekuurrapportage true is)

BRONVOLGORDE
- Gebruik primair de meest recente FML/IZP/LAB voor rubrieken
- Indien geen losse FML: haal rubrieken uit het AD-rapport
- Intakeformulier sectie 5 FML/IZP checkboxes als aanvulling

RUBRIEKEN
- Alleen rubrieken opnemen met daadwerkelijke beperkingen
- Gebruik exacte categorienamen, bijvoorbeeld:
${STANDARD_RUBRIEKEN.map((r) => `  - ${r}`).join('\n')}
- Geen rubrieken verzinnen

GEEN prognose, re-integratieadvies, datums, artsnamen of layout — die worden server-side ingevuld.
`.trim();

export function buildBelastbaarheidsprofielContextMessage(ctx: Record<string, unknown>): string {
  return `Context (voor referentie — rubrieken komen uit documenten):\n${JSON.stringify(ctx, null, 2)}`;
}
