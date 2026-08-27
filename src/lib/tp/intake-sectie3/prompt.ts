import { INTAKE_LAYOUT_V75_HINT } from '@/lib/document-analysis/prompts/intake-layout-v75';

export const INTAKE_SECTIE3_CONTENT_PROMPT = `
Je bent een Nederlandse re-integratie specialist voor ValentineZ.

Analyseer uitsluitend het bijgevoegde intakeformulier en extraheer Sectie 3 "Functiebeschrijving".

${INTAKE_LAYOUT_V75_HINT}

BRONREGELS (KRITIEK):
- Gebruik ALLEEN het intakeformulier — NOOIT AD-rapport, FML/IZP/LAB of andere documenten als bron
- EXACT letterlijk overnemen — geen parafrase, geen samenvatting, geen herschrijving
- Geen markdown, geen labels toevoegen, geen aanhalingstekens toevoegen

VELD:

korte_beschrijving_werkzaamheden — EXACT letterlijk de volledige tekst onder "Korte beschrijving van de werkzaamheden:"
- Neem NOOIT het label zelf op ("Korte beschrijving van de werkzaamheden" of de trailing ":"), ook als er geen spatie na ":" staat
- Neem NOOIT de sectiekop op ("3. Functiebeschrijving" / "Functiebeschrijving")
- Sluit alles van sectie 4 "Aanmelding" en verder uit
- Null als niet gevonden of leeg
`.trim();

export function buildIntakeSectie3ContextMessage(): string {
  return 'Context: extraheer uitsluitend korte_beschrijving_werkzaamheden uit intakeformulier Sectie 3 Functiebeschrijving.';
}
