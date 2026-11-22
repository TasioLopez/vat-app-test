/**
 * Map AI `__suggesties` into a body patch so Overnemen applies ja/nee, rubrieken,
 * PoW tredes, kansen and suggested intervention selections — not only prose fields.
 */
import {
  VGR_ACTIVATIE_OPTIONS,
  VGR_KWALITEITEN_OPTIONS,
  VGR_MOTIVATIE_OPTIONS,
  VGR_SCHOLING_OPTIONS,
  VGR_SOLLICITATIE_OPTIONS,
} from '@/lib/vgr/content';
import {
  VGR_FML_RUBRIEKEN,
  type JaNee,
  type VGRBody,
  type VGRData,
  type VGRFmlRubriek,
  type VGRPowTrede,
} from '@/lib/vgr/schema';
import type { VGRAiSectionId } from '@/lib/vgr/ai/sections';

export type VgrBodyPatch = { [K in keyof VGRBody]?: Partial<VGRBody[K]> };

const ALL_INTERVENTION_IDS = new Set(
  [
    ...VGR_MOTIVATIE_OPTIONS,
    ...VGR_KWALITEITEN_OPTIONS,
    ...VGR_SCHOLING_OPTIONS,
    ...VGR_SOLLICITATIE_OPTIONS,
    ...VGR_ACTIVATIE_OPTIONS,
  ].map((o) => o.id),
);

function parseJaNee(raw: string): JaNee | undefined {
  const v = raw.trim().toLowerCase();
  if (!v) return undefined;
  if (v === 'ja' || v === 'true' || v === 'yes' || v === '1') return true;
  if (v === 'nee' || v === 'no' || v === 'false' || v === '0') return false;
  return undefined;
}

function parseTrede(raw: string): VGRPowTrede | 'onbekend' | undefined {
  const v = raw.trim().toLowerCase();
  if (!v) return undefined;
  if (v === 'onbekend' || v === 'unknown') return 'onbekend';
  const n = Number(v.replace(/[^\d]/g, ''));
  if (n >= 1 && n <= 6) return n as Exclude<VGRPowTrede, null>;
  return undefined;
}

export function parseVgrRubriekenSuggestie(raw: string): VGRFmlRubriek[] {
  if (!raw.trim()) return [];
  const allowed = new Set<string>(VGR_FML_RUBRIEKEN);
  // Prefer exact known labels (handles "en/of" inside rubriek names), then comma/semicolon tokens.
  const found: VGRFmlRubriek[] = [];
  let rest = raw;
  for (const label of VGR_FML_RUBRIEKEN) {
    if (rest.includes(label)) {
      found.push(label);
      rest = rest.split(label).join(' ');
    }
  }
  if (found.length) return found;
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s): s is VGRFmlRubriek => allowed.has(s));
}

export function parseSelectedInterventiesSuggestie(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(/[,;|/]/)
    .map((s) => s.trim().replace(/\s+/g, '_'))
    .filter((id) => ALL_INTERVENTION_IDS.has(id));
}

const KANSEN = new Set(['zeer_onwaarschijnlijk', 'matig', 'voldoende', 'goed']);

function parseKansen(raw: string): VGRBody['visie_plaatsbaarheid']['kansen'] | undefined {
  const v = raw.trim().toLowerCase().replace(/\s+/g, '_');
  if (!v) return undefined;
  if (KANSEN.has(v)) return v as VGRBody['visie_plaatsbaarheid']['kansen'];
  return undefined;
}

/** Body keys that carry a `selected: string[]` intervention list. */
type InterventionSelectedKey =
  | 'interventies_motivatie'
  | 'kwaliteiten_onderzoek'
  | 'scholing'
  | 'sollicitatie_vaardigheden'
  | 'interventies_activatie';

const SECTION_SELECTED_KEY: Partial<Record<VGRAiSectionId, InterventionSelectedKey>> = {
  interventies_motivatie: 'interventies_motivatie',
  kwaliteiten_onderzoek: 'kwaliteiten_onderzoek',
  scholing: 'scholing',
  sollicitatie_vaardigheden: 'sollicitatie_vaardigheden',
  interventies_activatie: 'interventies_activatie',
};

/**
 * Build a body patch from AI suggesties for the given section.
 * Empty / unrecognised values are skipped. Never invents applications.
 */
export function applyVgrAiSuggesties(
  data: VGRData,
  sectionId: VGRAiSectionId,
  suggesties: Record<string, string>,
): VgrBodyPatch {
  const patch: VgrBodyPatch = {};
  const get = (k: string) => String(suggesties[k] ?? '').trim();

  if (sectionId === 'benutbare_mogelijkheden') {
    const jn = parseJaNee(get('heeft_benutbare_mogelijkheden'));
    if (jn !== undefined) patch.benutbare_mogelijkheden = { heeft: jn };
  }

  if (sectionId === 'praktische_belemmeringen') {
    const jn = parseJaNee(get('aanwezig'));
    if (jn !== undefined) patch.praktische_belemmeringen = { aanwezig: jn };
  }

  if (sectionId === 'inzet_houding') {
    const jn = parseJaNee(get('werkt_mee'));
    if (jn !== undefined) patch.inzet_houding = { werkt_mee: jn };
  }

  if (sectionId === 'belastbaarheidsprofiel') {
    const rubrieken = parseVgrRubriekenSuggestie(get('rubrieken'));
    if (rubrieken.length) patch.belastbaarheidsprofiel = { rubrieken };
  }

  if (sectionId === 'bijstellingen_belastbaarheid') {
    const jn = parseJaNee(get('aanwezig'));
    const rubrieken = parseVgrRubriekenSuggestie(get('rubrieken'));
    const cur = data.body.bijstellingen_belastbaarheid;
    const next: Partial<VGRBody['bijstellingen_belastbaarheid']> = {};
    if (jn !== undefined) next.aanwezig = jn;
    if (rubrieken.length && cur.revisions[0]) {
      next.revisions = [{ ...cur.revisions[0], rubrieken }, ...cur.revisions.slice(1)];
    }
    if (Object.keys(next).length) patch.bijstellingen_belastbaarheid = next;
  }

  if (sectionId === 'pow') {
    const huidige = parseTrede(get('huidige_trede'));
    const doel = parseTrede(get('doel_trede'));
    const next: Partial<VGRBody['pow']> = { confirmed: false };
    if (huidige && huidige !== 'onbekend') next.huidige_trede = huidige;
    if (doel === 'onbekend') {
      next.doel_onbekend = true;
      next.doel_trede = null;
    } else if (doel) {
      next.doel_trede = doel;
      next.doel_onbekend = false;
    }
    if (next.huidige_trede !== undefined || next.doel_trede !== undefined || doel === 'onbekend') {
      patch.pow = next;
    }
  }

  if (sectionId === 'visie_plaatsbaarheid') {
    const kansen = parseKansen(get('kansen'));
    if (kansen) patch.visie_plaatsbaarheid = { kansen };
  }

  const selectedKey = SECTION_SELECTED_KEY[sectionId];
  if (selectedKey) {
    const ids = parseSelectedInterventiesSuggestie(get('selected_interventies'));
    if (ids.length) {
      patch[selectedKey] = { selected: ids };
    }
  }

  return patch;
}

/** Shallow-merge section patches (same semantics as VGRInstanceContext.patchBody). */
export function mergeVgrBodyPatches(...patches: VgrBodyPatch[]): VgrBodyPatch {
  const out: VgrBodyPatch = {};
  for (const patch of patches) {
    for (const [k, v] of Object.entries(patch)) {
      if (!v) continue;
      const key = k as keyof VGRBody;
      out[key] = { ...(out[key] as object), ...(v as object) } as never;
    }
  }
  return out;
}

/** Preview body after applying a patch (for chaining suggesties on field patches). */
export function previewVgrDataAfterBodyPatch(data: VGRData, patch: VgrBodyPatch): VGRData {
  const body = { ...data.body } as VGRBody;
  for (const [k, v] of Object.entries(patch)) {
    if (!v) continue;
    const key = k as keyof VGRBody;
    (body as Record<string, unknown>)[key] = { ...(body[key] as object), ...(v as object) };
  }
  return { ...data, body };
}

/**
 * If the field patch wrote toelichting__* blocks, ensure those option ids are
 * included in `selected` (union with any selected_interventies suggestie).
 */
export function ensureInterventionSelectedFromPatch(
  sectionId: VGRAiSectionId,
  data: VGRData,
  fieldPatch: VgrBodyPatch,
  suggesties: Record<string, string>,
): VgrBodyPatch {
  const selectedKey = SECTION_SELECTED_KEY[sectionId];
  if (!selectedKey) return {};
  const sectionPatch = fieldPatch[selectedKey] as { blocks?: Record<string, { toelichting?: string }> } | undefined;
  const fromBlocks = Object.entries(sectionPatch?.blocks ?? {})
    .filter(([, b]) => String(b?.toelichting ?? '').trim())
    .map(([id]) => id);
  const fromSuggest = parseSelectedInterventiesSuggestie(String(suggesties.selected_interventies ?? ''));
  const cur = data.body[selectedKey] as VGRBody['interventies_motivatie'];
  const next = [...new Set([...cur.selected, ...fromSuggest, ...fromBlocks])];
  if (next.length === cur.selected.length && next.every((id) => cur.selected.includes(id))) return {};
  return { [selectedKey]: { selected: next } } as VgrBodyPatch;
}

/** Human-readable lines for the suggesties that will be applied. */
export function describeVgrAiSuggesties(suggesties: Record<string, string>): string[] {
  return Object.entries(suggesties)
    .filter(([, v]) => String(v ?? '').trim())
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v.trim()}`);
}
