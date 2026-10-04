export {
  INTAKE_LAYOUT_KEY,
  INTAKE_FORM_VERSION,
  INTAKE_SECTION_DEFS,
  INTAKE_DOSSIER_NAV,
  createEmptyIntakeData,
  ensureIntakeShape,
} from '@/lib/intake/schema';
export type {
  IntakeData,
  IntakeLayoutKey,
  IntakeSectionKey,
  IntakeSectionIcon,
} from '@/lib/intake/schema';
export { persistIntakeDraft } from '@/lib/intake/persist-draft';
export { intakeToGegevensFields, intakeToTpNarrativeFields } from '@/lib/intake/project';
export {
  getValidatedIntakeForEmployee,
  tp3DetailsFromValidatedIntake,
  mergeValidatedIntakeIntoTpData,
} from '@/lib/intake/tp-hydrate';
export { formatIntakeDateNl } from '@/lib/intake/format-date';
export {
  getIntakeSourcesSummary,
  intakeDraftHasContent,
  isDossierSourceType,
  isIntakeDocumentType,
} from '@/lib/intake/sources';
export type { IntakeSourcesSummary } from '@/lib/intake/sources';
export { mergeIntakeFillBlanks } from '@/lib/intake/merge-extractions';
export { autofillIntakeFromDocuments } from '@/lib/intake/autofill';
