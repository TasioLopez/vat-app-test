export {
  VGR_LOCKABLE_MODULE_IDS,
  filterPatchForLocks,
  isModuleLocked,
  lockedModuleIds,
  setModuleLock,
  shouldSkipAiApplyForLock,
} from './manual-lock';

export {
  collisionModuleIds,
  computeImpactedModules,
  regenerableModuleIds,
  type ComputeImpactInput,
} from './impact-regen';

export { classifyModuleFeedback, type VgrFeedbackGateResult, type VgrFeedbackKind } from './feedback-gate';

export {
  VGR_TEMPLATE_VERSION,
  applyStatusWithAudit,
  buildFinalizeAudit,
  evaluateFinalizeGates,
  finalizeIssueCounts,
  type FinalizeGateResult,
} from './finalize-audit';

export {
  applyConceptVgrDefaults,
  conceptVgrReportTypeLabel,
  resolveConceptVgrDefaults,
  type ConceptVgrDefaults,
} from './concept-entry';
