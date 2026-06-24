import { ensureVGRShape } from '@/lib/vgr/mapping';

const BIJLAGE_KEYS = ['bijlage2_model', 'bijlage3_decisions', 'bijlage3_page2'] as const;

export function extractBijlagenFromTp2026(tpData: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of BIJLAGE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(tpData, key) && tpData[key] !== undefined) {
      out[key] = tpData[key];
    }
  }
  return out;
}

export function hydrateVgrEmployeeFields(
  employee: Record<string, unknown> | null | undefined,
  details: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (employee?.first_name) out.first_name = employee.first_name;
  if (employee?.last_name) out.last_name = employee.last_name;
  if (details?.date_of_birth) out.date_of_birth = details.date_of_birth;
  return out;
}

export function mergeVgrInitialData(
  existing: Record<string, unknown>,
  tpData: Record<string, unknown> | null | undefined,
  employee: Record<string, unknown> | null | undefined,
  details: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const merged = {
    ...hydrateVgrEmployeeFields(employee, details),
    ...existing,
  };
  if (tpData) {
    const bijlagen = extractBijlagenFromTp2026(tpData);
    for (const key of BIJLAGE_KEYS) {
      if (
        bijlagen[key] !== undefined &&
        (merged[key] === undefined || merged[key] === null)
      ) {
        merged[key] = bijlagen[key];
      }
    }
  }
  return ensureVGRShape(merged as Record<string, any>);
}
