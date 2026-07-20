/** Worker-profile autofill: when intake succeeded, skip AD/FML/extra vision jobs. */

export function hasMeaningfulIntakeMappedPayload(
  mapped: Record<string, unknown> | null | undefined
): boolean {
  if (!mapped) return false;
  return Object.keys(mapped).length > 0;
}

export function shouldSkipSecondaryDocsForWorkerProfile(
  intakeProcessed: boolean,
  mapped: Record<string, unknown> | null | undefined
): boolean {
  return intakeProcessed && hasMeaningfulIntakeMappedPayload(mapped);
}
