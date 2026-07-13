import { STANDARD_RUBRIEKEN } from './constants';

export const SPREEKUUR_CONTENT_PROMPT = `
Je bent een Nederlandse re-integratie specialist voor ValentineZ.

Analyseer uitsluitend het bijgevoegde Spreekuurrapportage-document (terugkoppeling medisch spreekuur / bedrijfsarts) en lever gestructureerde content voor het Belastbaarheidsprofiel.

DOEL — alleen content extractie uit dit document:
1. datum — document- of spreekuurdatum (YYYY-MM-DD)
2. arts_org — naam bedrijfsarts/verzekeringsarts; neem supervisie-zin letterlijk over indien aanwezig
3. rubrieken — FML-rubrieken waarin werknemer beperkingen heeft volgens dit document

RUBRIEKEN
- Alleen rubrieken opnemen met daadwerkelijke beperkingen in dit document
- Gebruik exacte categorienamen, bijvoorbeeld:
${STANDARD_RUBRIEKEN.map((r) => `  - ${r}`).join('\n')}
- Geen rubrieken verzinnen

GEEN prognose extracten — prognose komt uit intakeformulier Sectie 5.
`.trim();

export function buildSpreekuurContextMessage(): string {
  return 'Extract datum, arts en rubrieken uitsluitend uit de bijgevoegde Spreekuurrapportage.';
}
