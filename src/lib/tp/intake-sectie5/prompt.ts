import { INTAKE_LAYOUT_V75_HINT } from '@/lib/document-analysis/prompts/intake-layout-v75';

export const INTAKE_SECTIE5_CONTENT_PROMPT = `
Je bent een Nederlandse re-integratie specialist voor ValentineZ.

Analyseer uitsluitend het bijgevoegde intakeformulier en extraheer Sectie 5 "Medische situatie".

${INTAKE_LAYOUT_V75_HINT}

BRONREGELS (KRITIEK):
- Gebruik ALLEEN het intakeformulier — NOOIT FML/IZP/LAB, AD-rapport of Spreekuurrapportage als bron
- EXACT letterlijk overnemen — geen parafrase, geen samenvatting, geen herschrijving
- Geen markdown, geen labels toevoegen, geen aanhalingstekens toevoegen

VELD:

quote_prognose_advies_belastbaarheid — EXACT letterlijk de volledige tekst onder "Quote prognose en quote advies belastbaarheid (bedrijfsarts):"
- Neem prognose én advies belastbaarheid over als één geheel (één veld op het formulier)
- Sluit uit: Datum eerste ziekte dag, FML/IZP rubriek checkboxes, reden ziekmelding, overige sectie 5 velden
- Null als niet gevonden of leeg
`.trim();

export function buildIntakeSectie5ContextMessage(): string {
  return 'Context: extraheer uitsluitend quote_prognose_advies_belastbaarheid uit intakeformulier Sectie 5.';
}
