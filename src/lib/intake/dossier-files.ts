export type DossierFileKind = 'inline-text' | 'document';

/** Plain-text notes must stay text. Renaming them to .pdf would upload raw text as a PDF. */
export function classifyDossierFileName(name: string): DossierFileKind {
  const base = name.includes('/') ? name.split('/').pop()! : name;
  return base.trim().toLowerCase().endsWith('.txt') ? 'inline-text' : 'document';
}
