/**
 * Phase 4 / G13 — export carriers (D05: PDF-only until official DOCX exists).
 * Pack T17: missing DOCX must surface honest UX; never claim "huisstijl exact".
 */

export type VgrExportFormat = 'pdf' | 'docx';

export type VgrCarrierStatus = 'available' | 'missing';

export type VgrExportCarrier = {
  format: VgrExportFormat;
  status: VgrCarrierStatus;
  /** Human-readable label for UI / audit. */
  label: string;
  /**
   * True only when the official house-style carrier is present and mapped.
   * Always false for DOCX while D05 holds (technical PDF ≠ Word drager).
   */
  house_style_exact: boolean;
  /** Template / layout version stamped for this carrier when available. */
  template_version_key: string | null;
  /** Dutch message when status === 'missing' (T17). */
  missing_message: string | null;
};

/** Official PDF print layout (ValentineZ 01–05 via /vgr/print). */
export const VGR_PDF_CARRIER: VgrExportCarrier = {
  format: 'pdf',
  status: 'available',
  label: 'PDF (technische ValentineZ-layout)',
  house_style_exact: true,
  template_version_key: 'vgr-pdf',
  missing_message: null,
};

/**
 * Pack expects editable Word carriers; they are not provisioned yet (D05).
 * Requests must get an explicit missing-carrier response — never a fake DOCX.
 */
export const VGR_DOCX_CARRIER: VgrExportCarrier = {
  format: 'docx',
  status: 'missing',
  label: 'DOCX (officiële Word-dragers)',
  house_style_exact: false,
  template_version_key: null,
  missing_message:
    'Officiële bewerkbare DOCX-dragers ontbreken. Export naar Word is niet beschikbaar; ' +
    'gebruik PDF. Er wordt geen vals “huisstijl exact”-label geleverd (T17 / D05).',
};

export const VGR_EXPORT_CARRIERS: Record<VgrExportFormat, VgrExportCarrier> = {
  pdf: VGR_PDF_CARRIER,
  docx: VGR_DOCX_CARRIER,
};

export function getVgrExportCarrier(format: VgrExportFormat): VgrExportCarrier {
  return VGR_EXPORT_CARRIERS[format];
}

export function isVgrExportFormat(v: unknown): v is VgrExportFormat {
  return v === 'pdf' || v === 'docx';
}
