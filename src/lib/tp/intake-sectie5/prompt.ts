import { INTAKE_LAYOUT_V75_HINT } from '@/lib/document-analysis/prompts/intake-layout-v75';
import { STANDARD_RUBRIEKEN } from '@/lib/tp/belastbaarheidsprofiel/constants';

export const INTAKE_SECTIE5_CONTENT_PROMPT = `
Je bent een Nederlandse re-integratie specialist voor ValentineZ.

Analyseer uitsluitend het bijgevoegde intakeformulier en extraheer Sectie 5 "Medische situatie".

${INTAKE_LAYOUT_V75_HINT}

BRONREGELS (KRITIEK):
- Gebruik ALLEEN het intakeformulier — NOOIT FML/IZP/LAB, AD-rapport of Spreekuurrapportage als bron
- Voor quotes: EXACT letterlijk overnemen — geen parafrase, geen samenvatting, geen herschrijving
- Geen markdown, geen labels toevoegen, geen aanhalingstekens toevoegen

VELDEN:

1. rubrieken — aangevinkte FML/IZP-beperkingen onder "FML/IZP-beperkingen:"
- Alleen rubrieken die daadwerkelijk zijn aangevinkt/gemarkeerd
- Gebruik exacte categorienamen:
${STANDARD_RUBRIEKEN.map((r) => `  - ${r}`).join('\n')}
- Lege array als geen checkboxes gevonden of geen beperkt

2. quote_prognose_advies_belastbaarheid — EXACT letterlijk de volledige tekst onder "Quote prognose en quote advies belastbaarheid (bedrijfsarts):"
- Neem prognose én advies belastbaarheid over als één geheel (één veld op het formulier)
- Sluit uit: Datum eerste ziekte dag, FML/IZP rubriek checkboxes, reden ziekmelding, overige sectie 5 velden
- Null als niet gevonden of leeg
`.trim();

export function buildIntakeSectie5ContextMessage(): string {
  return 'Context: extraheer rubrieken (aangevinkte FML/IZP-beperkingen) en quote_prognose_advies_belastbaarheid uit intakeformulier Sectie 5.';
}
