/**
 * Phase 3 / G9: REGENERATE_IMPACTED_MODULES (deterministic app layer).
 * Maps changed dossier claims / doc types → impacted VGR modules.
 * Never mutates published VGR; respects manual_lock via collision flags (T10).
 */
import type { VgrAssertion, VgrDossierDocType } from '@/lib/vgr/dossier/types';
import type { VGRData, VGRImpactModuleHit, VGRImpactRegenResult } from '@/lib/vgr/schema';
import { isModuleLocked } from './manual-lock';

/** field_key prefix / exact → body module ids. */
const FIELD_KEY_TO_MODULES: Array<{ match: RegExp | string; modules: string[] }> = [
  { match: /^benutbare_mogelijkheden/, modules: ['benutbare_mogelijkheden'] },
  { match: /^praktische_belemmeringen/, modules: ['praktische_belemmeringen'] },
  { match: /^doelstelling/, modules: ['doelstelling_traject', 'wijzigingen_doelstelling'] },
  { match: /^persoonlijk_profiel/, modules: ['persoonlijk_profiel'] },
  { match: /^belastbaarheidsprofiel|^fml|^izp|^lab/, modules: ['belastbaarheidsprofiel', 'bijstellingen_belastbaarheid', 'zoekprofiel'] },
  { match: /^bijstellingen/, modules: ['bijstellingen_belastbaarheid', 'zoekprofiel'] },
  { match: /^zoekprofiel/, modules: ['zoekprofiel'] },
  { match: /^inzet|^houding/, modules: ['inzet_houding'] },
  { match: /^motivatie|^interventies_motivatie/, modules: ['interventies_motivatie'] },
  { match: /^kwaliteiten|^test|^persoonlijkheid/, modules: ['kwaliteiten_onderzoek'] },
  { match: /^scholing/, modules: ['scholing'] },
  { match: /^sollicitatie_vaardigheden|^cv|^motivatiebrief/, modules: ['sollicitatie_vaardigheden', 'applications'] },
  { match: /^activatie|^jobhunt|^detachering|^werkervaring|^track/, modules: ['interventies_activatie'] },
  { match: /^pow/, modules: ['pow'] },
  { match: /^visie_plaatsbaarheid|^ad_/, modules: ['visie_plaatsbaarheid'] },
  { match: /^leernavigator/, modules: ['leernavigator'] },
  { match: /^planning|^bijlage_?1/, modules: ['planning'] },
  { match: /^application|^sollicitatie|^bijlage_?2/, modules: ['applications'] },
];

const DOC_TYPE_TO_MODULES: Partial<Record<VgrDossierDocType, string[]>> = {
  AD: ['visie_plaatsbaarheid'],
  FML: ['belastbaarheidsprofiel', 'bijstellingen_belastbaarheid', 'zoekprofiel', 'benutbare_mogelijkheden'],
  IZP: ['belastbaarheidsprofiel', 'bijstellingen_belastbaarheid', 'zoekprofiel', 'benutbare_mogelijkheden'],
  LAB: ['belastbaarheidsprofiel', 'bijstellingen_belastbaarheid', 'zoekprofiel'],
  BA_CONSULT: ['benutbare_mogelijkheden', 'bijstellingen_belastbaarheid'],
  ACTUEEL_OORDEEL: ['benutbare_mogelijkheden'],
  TEST: ['kwaliteiten_onderzoek'],
  GESPREKSAANTEKENINGEN: ['inzet_houding', 'interventies_motivatie', 'interventies_activatie', 'planning', 'applications'],
  WERKBOEK: ['interventies_motivatie', 'scholing', 'sollicitatie_vaardigheden'],
  EMAIL: ['applications', 'sollicitatie_vaardigheden', 'interventies_activatie'],
  CV: ['persoonlijk_profiel', 'sollicitatie_vaardigheden'],
  MOTIVATIEBRIEF: ['sollicitatie_vaardigheden', 'applications'],
  SOLLICITATIEBEWIJS: ['applications', 'interventies_activatie'],
  VGR: ['pow', 'doelstelling_traject', 'leernavigator', 'planning'],
  VGR_BIJLAGE_1: ['planning'],
  VGR_BIJLAGE_2: ['applications'],
};

function modulesForFieldKey(fieldKey: string): string[] {
  const key = fieldKey.trim();
  if (!key) return [];
  const found = new Set<string>();
  for (const rule of FIELD_KEY_TO_MODULES) {
    const hit =
      typeof rule.match === 'string' ? key === rule.match || key.startsWith(rule.match) : rule.match.test(key);
    if (hit) rule.modules.forEach((m) => found.add(m));
  }
  return [...found];
}

function modulesForDocType(docType: VgrDossierDocType | string | undefined): string[] {
  if (!docType) return [];
  return DOC_TYPE_TO_MODULES[docType as VgrDossierDocType] ?? [];
}

export type ComputeImpactInput = {
  data: VGRData;
  /** Claims that changed since the last concept (or new proposed claims). */
  changedClaims?: Array<Pick<VgrAssertion, 'claim_id' | 'field_key'> & { source_ids?: string[] }>;
  /** Newly classified / uploaded dossier doc types. */
  newDocTypes?: Array<{ doc_type: VgrDossierDocType | string; source_id?: string }>;
  /** Explicit claim ids when only ids are known. */
  changedClaimIds?: string[];
};

/**
 * Deterministic impact list. Locked modules are flagged as collisions (never auto-overwritten).
 */
export function computeImpactedModules(input: ComputeImpactInput): VGRImpactRegenResult {
  const { data } = input;
  const byModule = new Map<string, { reasons: Set<string>; sourceIds: Set<string> }>();

  const add = (moduleId: string, reason: string, sourceIds: string[] = []) => {
    if (!moduleId) return;
    let entry = byModule.get(moduleId);
    if (!entry) {
      entry = { reasons: new Set(), sourceIds: new Set() };
      byModule.set(moduleId, entry);
    }
    entry.reasons.add(reason);
    for (const s of sourceIds) if (s) entry.sourceIds.add(s);
  };

  const claimIds: string[] = [...(input.changedClaimIds ?? [])];

  for (const claim of input.changedClaims ?? []) {
    if (claim.claim_id && !claimIds.includes(claim.claim_id)) claimIds.push(claim.claim_id);
    const modules = modulesForFieldKey(claim.field_key);
    const sources = claim.source_ids ?? [];
    if (!modules.length) {
      // Unknown field → require human review on zoekprofiel/visie as soft catch-all? Skip silent.
      continue;
    }
    for (const m of modules) {
      add(m, `Claim ${claim.field_key}`, sources);
    }
  }

  for (const doc of input.newDocTypes ?? []) {
    for (const m of modulesForDocType(doc.doc_type)) {
      add(m, `Nieuwe bron (${doc.doc_type})`, doc.source_id ? [doc.source_id] : []);
    }
  }

  const hits: VGRImpactModuleHit[] = [...byModule.entries()]
    .map(([module_id, entry]) => {
      const locked = isModuleLocked(data, module_id);
      return {
        module_id,
        reason: [...entry.reasons].join('; '),
        source_ids: [...entry.sourceIds],
        manual_override_collision: locked,
        required_human_review: locked || module_id === 'zoekprofiel' || module_id === 'benutbare_mogelijkheden',
      };
    })
    .sort((a, b) => a.module_id.localeCompare(b.module_id));

  return {
    computed_at: new Date().toISOString(),
    changed_claim_ids: claimIds,
    impacted_module_ids: hits.map((h) => h.module_id),
    hits,
  };
}

/** Modules that may safely receive AI proposals from impact regen (unlocked only). */
export function regenerableModuleIds(result: VGRImpactRegenResult): string[] {
  return result.hits.filter((h) => !h.manual_override_collision).map((h) => h.module_id);
}

export function collisionModuleIds(result: VGRImpactRegenResult): string[] {
  return result.hits.filter((h) => h.manual_override_collision).map((h) => h.module_id);
}
