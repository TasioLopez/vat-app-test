export {
  VGR_DOCX_CARRIER,
  VGR_EXPORT_CARRIERS,
  VGR_PDF_CARRIER,
  getVgrExportCarrier,
  isVgrExportFormat,
  type VgrCarrierStatus,
  type VgrExportCarrier,
  type VgrExportFormat,
} from './carriers';

export {
  resolveVgrExportFormat,
  vgrExportFormatSummary,
  type ResolveVgrExportResult,
} from './resolve-format';

export {
  applyWiaFinalScaffold,
  buildVgrReportTimeline,
  detectUnfoundedWiaConsult,
  formatVgrTimelineText,
  scaffoldWiaFinalConcept,
  vgrCoverTitleForType,
  type VgrTimelineEntry,
  type WiaScaffoldResult,
} from './wia-scaffold';
