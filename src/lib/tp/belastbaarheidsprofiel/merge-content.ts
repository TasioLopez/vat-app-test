import type { BelastbaarheidsprofielContentResult, SpreekuurMeta } from './schema';
import type { SpreekuurContentResult } from './spreekuur-schema';
import { hasSpreekuurContent } from './spreekuur-schema';

export function buildSpreekuurMeta(
  spreekuur: SpreekuurContentResult | null | undefined
): SpreekuurMeta | null {
  if (!hasSpreekuurContent(spreekuur)) return null;
  return {
    datum: spreekuur!.datum,
    // arts_org is cleaned again in buildArtsPhrase; keep raw here for role enrichment.
    arts_org: spreekuur!.arts_org,
  };
}

/** Intake checkboxes > FML/AD main extract > Spreekuur (never override fuller upstream lists). */
export function resolveRubrieken(
  intakeRubrieken: string[] | null | undefined,
  mainRubrieken: string[] | null | undefined,
  spreekuurRubrieken: string[] | null | undefined
): string[] {
  const intake = (intakeRubrieken ?? []).map((r) => r.trim()).filter(Boolean);
  if (intake.length > 0) return intake;

  const main = (mainRubrieken ?? []).map((r) => r.trim()).filter(Boolean);
  if (main.length > 0) return main;

  return (spreekuurRubrieken ?? []).map((r) => r.trim()).filter(Boolean);
}

export function mergeBelastbaarheidsprofielContent(
  main: BelastbaarheidsprofielContentResult,
  spreekuur: SpreekuurContentResult | null | undefined,
  hasSpreekuurDoc: boolean,
  intakeRubrieken: string[] | null | undefined = []
): BelastbaarheidsprofielContentResult {
  const spreekuurMeta = buildSpreekuurMeta(spreekuur);

  if (!hasSpreekuurDoc || !spreekuur) {
    return {
      ...main,
      rubrieken: resolveRubrieken(intakeRubrieken, main.rubrieken, []),
      spreekuur_meta: null,
    };
  }

  if (hasSpreekuurDoc && !hasSpreekuurContent(spreekuur)) {
    console.warn(
      '⚠️ Belastbaarheidsprofiel: Spreekuurrapportage aanwezig maar extractie leeg — fallback naar intake/FML/AD'
    );
    return {
      ...main,
      rubrieken: resolveRubrieken(intakeRubrieken, main.rubrieken, []),
      spreekuur_meta: null,
    };
  }

  const rubrieken = resolveRubrieken(intakeRubrieken, main.rubrieken, spreekuur.rubrieken);

  if (hasSpreekuurDoc && spreekuurMeta && !spreekuurMeta.datum && !spreekuurMeta.arts_org) {
    console.warn(
      '⚠️ Belastbaarheidsprofiel: Spreekuurrapportage zonder datum/arts — fallback naar tp_meta voor intro'
    );
  }

  return {
    rubrieken,
    prognose_citaat: main.prognose_citaat,
    spreekuur_meta: spreekuurMeta,
  };
}
