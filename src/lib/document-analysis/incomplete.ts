export type AutofillWarning = { field: string; message: string };

const INTAKE_CRITICAL_FIELDS = [
  'transport_type',
  'dutch_speaking',
  'computer_skills',
] as const;

export function getAutofillCompleteness(
  details: Record<string, unknown>,
  options?: { intakeProcessed?: boolean }
): { incomplete: boolean; warnings: AutofillWarning[] } {
  const warnings: AutofillWarning[] = [];

  if (!options?.intakeProcessed) {
    return { incomplete: false, warnings };
  }

  for (const field of INTAKE_CRITICAL_FIELDS) {
    const value = details[field];
    if (field === 'transport_type') {
      if (!Array.isArray(value) || value.length === 0) {
        warnings.push({
          field,
          message: 'Eigen vervoer kon niet betrouwbaar worden ingevuld — controleer handmatig.',
        });
      }
    } else if (value == null || value === '') {
      warnings.push({
        field,
        message: `${field} kon niet betrouwbaar worden ingevuld — controleer handmatig.`,
      });
    }
  }

  return { incomplete: warnings.length > 0, warnings };
}
