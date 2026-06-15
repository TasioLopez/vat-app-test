/** @deprecated Extraction delegated to intake-sectie7; kept for index compatibility. */
export const AD_ADVIES_CONTENT_PROMPT =
  'See INTAKE_SECTIE7_CONTENT_PROMPT in @/lib/tp/intake-sectie7';

export function buildAdAdviesContextMessage(ctx: Record<string, unknown>): string {
  return `Context (hints — advies from intake Sectie 7):\n${JSON.stringify(ctx, null, 2)}`;
}
