export type InferDriversLicenseOptions = {
  /**
   * When true (intake PDF was processed / license glyphs decided), never invent B
   * from Auto alone — aligns with intake generate "NOOIT afleiden uit vervoer Auto".
   */
  skip?: boolean;
};

/**
 * Product rule (dossier-only / no intake glyphs): own car / vervoer Auto without a
 * stated license type ⇒ standard B. Does not invent when another license type is
 * already present, or when `skip` is set after intake PDF checkbox detection.
 */
export function inferDriversLicenseFromOwnCar(
  mapped: Record<string, unknown>,
  options?: InferDriversLicenseOptions
): boolean {
  if (options?.skip) return false;

  const transport = mapped.transport_type;
  const hasAuto =
    Array.isArray(transport) &&
    transport.some((t) => typeof t === 'string' && t.trim().toLowerCase() === 'auto');
  if (!hasAuto) return false;

  const types = mapped.drivers_license_type;
  const hasTypes =
    Array.isArray(types) && types.some((t) => typeof t === 'string' && t.trim().length > 0);
  if (hasTypes) return false;

  mapped.drivers_license = true;
  mapped.drivers_license_type = ['B'];
  return true;
}
