import type { BelastbaarheidsprofielContentResult, SpreekuurMeta } from './schema';
import type { SpreekuurContentResult } from './spreekuur-schema';
import { hasSpreekuurContent } from './spreekuur-schema';

export function buildSpreekuurMeta(
  spreekuur: SpreekuurContentResult | null | undefined
): SpreekuurMeta | null {
  if (!hasSpreekuurContent(spreekuur)) return null;
  return {
    datum: spreekuur!.datum,
    arts_org: spreekuur!.arts_org,
  };
}

export function mergeBelastbaarheidsprofielContent(
  main: BelastbaarheidsprofielContentResult,
  spreekuur: SpreekuurContentResult | null | undefined,
  hasSpreekuurDoc: boolean
): BelastbaarheidsprofielContentResult {
  const spreekuurMeta = buildSpreekuurMeta(spreekuur);

  if (!hasSpreekuurDoc || !spreekuur) {
    return { ...main, spreekuur_meta: null };
  }

  if (hasSpreekuurDoc && !hasSpreekuurContent(spreekuur)) {
    console.warn(
      '⚠️ Belastbaarheidsprofiel: Spreekuurrapportage aanwezig maar extractie leeg — fallback naar FML/AD'
    );
    return { ...main, spreekuur_meta: null };
  }

  const rubrieken =
    spreekuur.rubrieken.length > 0 ? spreekuur.rubrieken : main.rubrieken;
  const prognose_citaat = spreekuur.prognose_citaat ?? main.prognose_citaat;

  if (hasSpreekuurDoc && spreekuurMeta && !spreekuurMeta.datum && !spreekuurMeta.arts_org) {
    console.warn(
      '⚠️ Belastbaarheidsprofiel: Spreekuurrapportage zonder datum/arts — fallback naar tp_meta voor intro'
    );
  }

  return {
    rubrieken,
    prognose_citaat,
    reintegratieadvies_citaat: main.reintegratieadvies_citaat,
    spreekuur_meta: spreekuurMeta,
  };
}
