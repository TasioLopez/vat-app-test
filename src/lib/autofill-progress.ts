type DocLike = { type?: string | null };

function normType(doc: DocLike): string {
  return (doc.type || '').toLowerCase().trim();
}

/** Labels aligned with server-side document order in autofill-employee-info-working. */
export function buildEmployeeAutofillSteps(documents: DocLike[]): string[] {
  const steps: string[] = ['Documenten voorbereiden…'];
  const types = documents.map(normType);

  if (types.some((t) => t.includes('intake'))) {
    steps.push('Intakeformulier analyseren…');
  }
  if (types.some((t) => t.includes('ad') || t.includes('arbeidsdeskundig'))) {
    steps.push('AD-rapport analyseren…');
  }
  if (types.some((t) => t === 'fml' || t === 'izp' || t === 'lab')) {
    steps.push('FML/IZP/LAB analyseren…');
  }
  if (
    types.some(
      (t) =>
        t &&
        !t.includes('intake') &&
        !t.includes('ad') &&
        !t.includes('arbeidsdeskundig') &&
        t !== 'fml' &&
        t !== 'izp' &&
        t !== 'lab' &&
        t !== 'tp' &&
        !t.includes('trajectplan')
    )
  ) {
    steps.push('Overige documenten analyseren…');
  }

  if (steps.length === 1) {
    steps.push('Documenten analyseren met AI…');
  }

  steps.push('Gegevens samenvoegen…');
  steps.push('Profiel bijwerken…');
  return steps;
}

export const TP2026_GEgevens_EMPLOYEE_LABEL = 'Werknemersprofiel analyseren…';
export const TP2026_GEgevens_TP2_LABEL = 'Gegevens traject analyseren…';

export const TP2026_BASIS_FIELD_LABELS: Record<string, string> = {
  inleiding: 'Inleiding',
  sociale_achtergrond: 'Sociale achtergrond',
  visie_werknemer: 'Visie van werknemer',
  visie_loopbaanadviseur: 'Visie van loopbaanadviseur',
  prognose_bedrijfsarts: 'Prognose van de bedrijfsarts',
  persoonlijk_profiel: 'Persoonlijk profiel',
  zoekprofiel: 'Zoekprofiel',
  advies_ad_passende_arbeid: 'AD advies over passende arbeid',
  visie_plaatsbaarheid: 'Visie op plaatsbaarheid',
  pow_meter: 'PoW-meter',
};

export const TP2026_TP3_FIELD_ORDER = [
  'inleiding',
  'sociale_achtergrond',
  'visie_werknemer',
  'visie_loopbaanadviseur',
  'prognose_bedrijfsarts',
  'persoonlijk_profiel',
  'zoekprofiel',
  'advies_ad_passende_arbeid',
  'visie_plaatsbaarheid',
  'pow_meter',
] as const;

export function labelForTp3Field(key: string): string {
  const base = TP2026_BASIS_FIELD_LABELS[key] || key;
  return `${base} invullen…`;
}
