import { INTAKE_LAYOUT_V75_HINT } from '@/lib/document-analysis/prompts/intake-layout-v75';
import {
  MAX_SENTENCES_ALINEA_1,
  MAX_SENTENCES_ALINEA_2,
  MAX_SENTENCES_ALINEA_3,
  MAX_WORDS_ALINEA_1,
  MAX_WORDS_ALINEA_2,
  MAX_WORDS_ALINEA_3,
  MAX_WORDS_TOTAL,
  OPENING_SENTENCE_TEMPLATE,
  STYLE_REFERENCE_EXAMPLE,
} from './constants';

const INTAKE_PROFIEL_SECTIONS_HINT = `
INTAKE SECTIES VOOR PERSOONLIJK PROFIEL:
- Sectie 2 Persoonsgegevens: functietitel (geen werkgevernaam in output)
- Blok "Algemene informatie" onderaan:
  • Opleidingen/werkervaring tabellen
  • Vervoer / rijbewijzen
  • PC/laptop en computervaardigheden
  • Talen: Spreken/Schrijven/Lezen (G/R/O)
Gebruik NIET: sociale/visie/medische secties, privé, spoor 2, motivatie.
`.trim();

/**
 * Content instructions for persoonlijk profiel generation (PDF masterprompt substance).
 * Output is 2-3 short UWV-style synthesized paragraphs.
 */
export const PERSOONLIJK_PROFIEL_CONTENT_PROMPT = `
Je bent een senior re-integratieadviseur gespecialiseerd in Spoor 2, arbeidsdeskundige rapportages en UWV-dossiervorming.

Analyseer uitsluitend het bijgevoegde intakeformulier. Lever een UWV-proof Persoonlijk Profiel voor een 2e spoor rapportage.

${INTAKE_LAYOUT_V75_HINT}

${INTAKE_PROFIEL_SECTIONS_HINT}

DOEL
Schrijf op basis van uitsluitend informatie uit het intakeformulier. Het document is de enige bron voor inhoud.

BRON (strikt)
Gebruik uitsluitend informatie die letterlijk of ondubbelzinnig in het intakeformulier staat.
Niet: aannames, interpretaties, conclusies, eigen aanvullingen.
Niet afleiden: vaardigheden uit functies, opleidingen, werkervaring of hobby's.
Niet afleiden: persoonskenmerken uit uitspraken of functieverleden.
Bij twijfel: niet opnemen. Ontbrekende informatie niet benoemen.

LENGTE EN STIJL (verplicht)
- Maximaal drie alinea's; totaal circa ${MAX_WORDS_TOTAL} woorden
- alinea_1: max ${MAX_SENTENCES_ALINEA_1} zinnen, circa ${MAX_WORDS_ALINEA_1} woorden
- alinea_2: max ${MAX_SENTENCES_ALINEA_2} zinnen, circa ${MAX_WORDS_ALINEA_2} woorden
- alinea_3: max ${MAX_SENTENCES_ALINEA_3} zinnen, circa ${MAX_WORDS_ALINEA_3} woorden (null indien geen kenmerken)
- Zakelijk, objectief, derde persoon ("werknemer"), volledige zinnen, geen opsommingen, geen kopjes

STIJLREFERENTIE (alleen lengte en toon — niet kopiëren):
${STYLE_REFERENCE_EXAMPLE}

OPENINGSZIN (verplicht als eerste zin van alinea_1)
${OPENING_SENTENCE_TEMPLATE}
- Gebruik leeftijd en geslacht uit context JSON
- Duur en functie(s) uitsluitend uit intake; alleen functies die daadwerkelijk in het document staan

ALINEA 1
Na openingszin: compact arbeidsverleden (functiebenamingen, globale duur), opleiding/scholing (feitelijk), vaardigheden alleen indien expliciet als vaardigheid benoemd.
Niet: werkgeversnamen, contracturen, exacte data, werkzaamheden, taken, producten, klanten.

ALINEA 2 (volgorde verplicht)
1. Mobiliteit (rijbewijs, auto, fiets, OV, afhankelijkheid vervoer)
2. Talenkennis
3. Digitale vaardigheden inclusief typvaardigheden

ALINEA 3
Alleen objectief benoemde persoonskenmerken (bijv. zelfstandig, nauwkeurig). Geen zelftyperingen ("geeft aan", "ziet zichzelf als"). Null wanneer geen kenmerken in intake.

NOOIT OPNEMEN
Medisch, belastbaarheid, privé, gezin, sociaal netwerk, hobby's, spoor 2, motivatie, terugkeer-wensen, werkgeversnamen.

JSON OUTPUT
Lever exact: alinea_1, alinea_2, alinea_3. Geen sectiekop. Geen toelichting.
`.trim();

export function buildPersoonlijkProfielContextMessage(context: Record<string, unknown>): string {
  return `Context (gebruik leeftijd en geslacht voor de openingszin; genereer geen andere data uit context):\n${JSON.stringify(context, null, 2)}`;
}
