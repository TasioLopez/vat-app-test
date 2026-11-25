/**
 * Phase 3 / G9: module `manual_lock` (pack `user_locked`).
 * Hand-approved text survives impact regen; collisions become proposals, never silent overwrite.
 */
import type { VGRBody, VGRData, VGRModuleLock } from '@/lib/vgr/schema';
import type { VGRAiSectionId } from '@/lib/vgr/ai/sections';
import type { VgrBodyPatch } from '@/lib/vgr/ai/apply-suggesties';

/** Body modules that support manual_lock in the editor. */
export const VGR_LOCKABLE_MODULE_IDS: readonly (keyof VGRBody | 'planning' | 'applications')[] = [
  'benutbare_mogelijkheden',
  'praktische_belemmeringen',
  'doelstelling_traject',
  'persoonlijk_profiel',
  'belastbaarheidsprofiel',
  'bijstellingen_belastbaarheid',
  'zoekprofiel',
  'inzet_houding',
  'interventies_motivatie',
  'kwaliteiten_onderzoek',
  'scholing',
  'sollicitatie_vaardigheden',
  'interventies_activatie',
  'pow',
  'visie_plaatsbaarheid',
  'leernavigator',
  'planning',
  'applications',
] as const;

export function isModuleLocked(data: VGRData, moduleId: string): boolean {
  return Boolean(data.module_locks?.[moduleId]?.locked);
}

export function lockedModuleIds(data: VGRData): string[] {
  return Object.entries(data.module_locks ?? {})
    .filter(([, lock]) => lock?.locked)
    .map(([id]) => id)
    .sort();
}

export function setModuleLock(
  locks: Record<string, VGRModuleLock>,
  moduleId: string,
  locked: boolean,
  note?: string,
): Record<string, VGRModuleLock> {
  const next = { ...locks };
  if (!locked) {
    delete next[moduleId];
    return next;
  }
  next[moduleId] = {
    locked: true,
    locked_at: new Date().toISOString(),
    ...(note?.trim() ? { note: note.trim() } : {}),
  };
  return next;
}

/**
 * Strip locked body keys from an AI apply patch (T10).
 * Returns the filtered patch plus which locked modules were skipped.
 */
export function filterPatchForLocks(
  data: VGRData,
  patch: VgrBodyPatch,
): { patch: VgrBodyPatch; skippedLocked: string[] } {
  const skippedLocked: string[] = [];
  const out: VgrBodyPatch = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!value) continue;
    if (isModuleLocked(data, key)) {
      skippedLocked.push(key);
      continue;
    }
    (out as Record<string, unknown>)[key] = value;
  }
  return { patch: out, skippedLocked };
}

/** True when Generate-all / impact regen should skip writing this AI section. */
export function shouldSkipAiApplyForLock(data: VGRData, sectionId: VGRAiSectionId): boolean {
  return isModuleLocked(data, sectionId);
}
