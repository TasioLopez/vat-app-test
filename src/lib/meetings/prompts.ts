export const GESPREKSVERSLAG_SYSTEM_PROMPT = `Je schrijft een gespreksverslag van een spoor-2-intakegesprek in het Nederlands.

Schrijf alleen wat in het transcript staat. Verzin geen feiten, data, beperkingen of citaten.
Een dossierblok mag alleen de schrijfwijze van de naam van deze werknemer en deze werkgever corrigeren. Andere organisaties en alle overige feiten blijven zoals in het transcript.
Voor DEZE werkgever: gebruik altijd de canonieke spelling uit het dossier, ook bij kleine transcriptfouten (bijv. eHub / Ihub / IHUB → iHub wanneer Werkgever: iHub).
Onderscheid vragen van de loopbaanadviseur en antwoorden van de werknemer wanneer dat uit de tekst blijkt. Als onduidelijk is wie iets zei, formuleer neutraal en ken het niet toe.
Geen medische conclusie die de werknemer of adviseur niet zelf heeft uitgesproken.

Structuur in markdown. Gebruik een kop alleen als er inhoud is, exact in deze vorm:
## Aanleiding en werk
## Wat de werknemer vertelt over belastbaarheid en wat wel of niet lukt
## Opleiding, werkervaring en vaardigheden
## Wensen en praktische belemmeringen
## Afspraken of open punten

Korte, zakelijke alinea's onder de kop. Geen kop zonder tekst eronder. Gebruik "werknemer" in de derde persoon.`;

export const GESPREKSVERSLAG_USER_MESSAGE =
  'Maak het gespreksverslag op basis van het volgende transcript. Onbekend = weglaten. Schrijf markdown met ## koppen.';

export type GesprekDossierContext = {
  employeeName?: string | null;
  employerName?: string | null;
  currentJob?: string | null;
};

/** Spelling context only. Empty when the dossier has no name, employer, or job. */
export function buildGesprekDossierContext(input: GesprekDossierContext): string {
  const name = input.employeeName?.trim() ?? '';
  const employer = input.employerName?.trim() ?? '';
  const job = input.currentJob?.trim() ?? '';
  if (!name && !employer && !job) return '';
  const lines = ['DOSSIER (alleen voor schrijfwijze, geen nieuwe feiten)'];
  if (name) lines.push(`Werknemer: ${name}`);
  if (employer) lines.push(`Werkgever: ${employer}`);
  if (job) lines.push(`Huidige functie: ${job}`);
  lines.push(
    'Gebruik deze schrijfwijze voor de naam van deze werknemer en deze werkgever als het transcript een duidelijke verschrijving heeft (inclusief eHub↔iHub-achtige homofonen van DEZE werkgever). Andere organisaties blijven zoals ze in het transcript staan. De functie is context voor wie de werknemer is; verzin geen taken die het transcript niet noemt.'
  );
  return lines.join('\n');
}

/**
 * Deterministic post-pass: replace near-homophone spellings of THIS employer with the canonical form.
 * Allows case differences and a leading i/e swap (eHub ↔ iHub). Does not touch other organizations.
 */
export function applyCanonicalEmployerSpelling(
  text: string,
  employerName: string | null | undefined
): string {
  const canonical = employerName?.trim();
  if (!canonical || !text) return text;

  const canonLower = canonical.toLowerCase();
  const variants = new Set<string>([canonLower]);
  const first = canonLower[0];
  if (first === 'i') variants.add(`e${canonLower.slice(1)}`);
  if (first === 'e') variants.add(`i${canonLower.slice(1)}`);

  return text.replace(/\b[\w.-]+\b/g, (word) => {
    if (variants.has(word.toLowerCase())) return canonical;
    return word;
  });
}
