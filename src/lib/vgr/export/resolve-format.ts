/**
 * Phase 4 export format resolution — PDF path vs honest DOCX refusal (T17 / D05).
 */
import {
  getVgrExportCarrier,
  isVgrExportFormat,
  type VgrExportCarrier,
  type VgrExportFormat,
} from './carriers';
import { VGR_TEMPLATE_VERSION } from '@/lib/vgr/lifecycle/finalize-audit';

export type ResolveVgrExportResult =
  | {
      ok: true;
      format: 'pdf';
      carrier: VgrExportCarrier;
      template_version: string;
      house_style_exact: true;
    }
  | {
      ok: false;
      format: VgrExportFormat;
      carrier: VgrExportCarrier;
      code: 'missing_carrier' | 'unsupported_format';
      message: string;
      /** Pack T17: never true when DOCX carriers are missing. */
      house_style_exact: false;
    };

/**
 * Resolve a requested export format.
 * Defaults to PDF. DOCX always refuses with missing-carrier UX while D05 holds.
 */
export function resolveVgrExportFormat(requested: unknown): ResolveVgrExportResult {
  const raw = typeof requested === 'string' ? requested.trim().toLowerCase() : 'pdf';
  const format: VgrExportFormat = isVgrExportFormat(raw) ? raw : (raw ? 'docx' : 'pdf');

  // Unknown non-empty string → treat as unsupported (still no fake house-style claim).
  if (!isVgrExportFormat(raw) && raw !== '' && raw !== 'pdf') {
    return {
      ok: false,
      format: 'docx',
      carrier: getVgrExportCarrier('docx'),
      code: 'unsupported_format',
      message: `Onbekend exportformaat “${String(requested)}”. Alleen PDF wordt ondersteund (D05).`,
      house_style_exact: false,
    };
  }

  const carrier = getVgrExportCarrier(format === 'docx' ? 'docx' : 'pdf');

  if (carrier.status === 'missing' || format === 'docx') {
    return {
      ok: false,
      format: 'docx',
      carrier: getVgrExportCarrier('docx'),
      code: 'missing_carrier',
      message: getVgrExportCarrier('docx').missing_message!,
      house_style_exact: false,
    };
  }

  return {
    ok: true,
    format: 'pdf',
    carrier,
    template_version: VGR_TEMPLATE_VERSION,
    house_style_exact: true,
  };
}

/** Compact UI copy for Review / Setup (always PDF-first). */
export function vgrExportFormatSummary(): string {
  const pdf = getVgrExportCarrier('pdf');
  const docx = getVgrExportCarrier('docx');
  return `${pdf.label} beschikbaar. ${docx.missing_message}`;
}
