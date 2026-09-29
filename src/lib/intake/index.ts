export {
  INTAKE_LAYOUT_KEY,
  INTAKE_FORM_VERSION,
  INTAKE_SECTION_DEFS,
  createEmptyIntakeData,
  ensureIntakeShape,
} from '@/lib/intake/schema';
export type { IntakeData, IntakeLayoutKey, IntakeSectionKey } from '@/lib/intake/schema';
export { persistIntakeDraft } from '@/lib/intake/persist-draft';
export { intakeToGegevensFields, intakeToTpNarrativeFields } from '@/lib/intake/project';
export {
  getValidatedIntakeForEmployee,
  tp3DetailsFromValidatedIntake,
  mergeValidatedIntakeIntoTpData,
} from '@/lib/intake/tp-hydrate';
