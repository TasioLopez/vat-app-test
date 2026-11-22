/**
 * Practical VGR preflight checklist (dossier-mode lite) before Generate-all.
 * Statuses follow the client projectbron vocabulary.
 */
import { detectVgrSourceConflicts } from '@/lib/vgr/ai/collect-context';
import { VGR_AI_SECTION_IDS, VGR_AI_SECTIONS, type VGRAiSectionId } from '@/lib/vgr/ai/sections';
import type { VGRData } from '@/lib/vgr/schema';
import { validateVgr } from '@/lib/vgr/validation';

export type VgrPreflightStatus =
  | 'READY'
  | 'ADDITIONAL_INFORMATION_NEEDED'
  | 'UNKNOWN'
  | 'CONFLICT'
  | 'NOT_YET_RELEVANT'
  | 'NOT_APPLICABLE';

export type VgrPreflightModule = {
  id: string;
  label: string;
  status: VgrPreflightStatus;
  detail: string;
  writable: boolean;
};

export type VgrPreflightResult = {
  modules: VgrPreflightModule[];
  medicalConflicts: string[];
  /** Soft-block Generate-all when true (coach can still acknowledge). */
  blocksGenerateAll: boolean;
};

const MODULES: { id: VGRAiSectionId | 'planning' | 'applications' | 'leernavigator'; label: string }[] = [
  { id: 'benutbare_mogelijkheden', label: 'Benutbare mogelijkheden' },
  { id: 'praktische_belemmeringen', label: 'Praktische belemmeringen' },
  { id: 'doelstelling_traject', label: 'Doelstelling traject' },
  { id: 'persoonlijk_profiel', label: 'Persoonlijk profiel' },
  { id: 'belastbaarheidsprofiel', label: 'Belastbaarheidsprofiel' },
  { id: 'bijstellingen_belastbaarheid', label: 'Bijstellingen belastbaarheid' },
  { id: 'zoekprofiel', label: 'Zoekprofiel' },
  { id: 'inzet_houding', label: 'Inzet en houding' },
  { id: 'interventies_motivatie', label: 'Interventies motivatie' },
  { id: 'kwaliteiten_onderzoek', label: 'Kwaliteiten / testen' },
  { id: 'scholing', label: 'Scholing' },
  { id: 'sollicitatie_vaardigheden', label: 'Sollicitatievaardigheden' },
  { id: 'interventies_activatie', label: 'Activatie / bemiddeling' },
  { id: 'pow', label: 'PoW-meter' },
  { id: 'visie_plaatsbaarheid', label: 'Visie op plaatsbaarheid' },
  { id: 'leernavigator', label: 'Leernavigator' },
  { id: 'planning', label: 'Bijlage 1 planning' },
  { id: 'applications', label: 'Bijlage 2 sollicitaties' },
];

function hasDocs(types: Set<string>, preferred: string[]): boolean {
  return preferred.some((t) => types.has(t));
}

function blank(v: unknown) {
  return String(v ?? '').trim() === '';
}

export function computeVgrPreflight(
  data: VGRData,
  sourceDocTypes: string[] = [],
): VgrPreflightResult {
  const types = new Set(sourceDocTypes);
  const issues = validateVgr(data);
  const conflicts = detectVgrSourceConflicts(data, null);
  const medicalConflicts = conflicts.filter((c) =>
    /fml|izp|belast|ziektedag|bedrijfsarts|medisch/i.test(c),
  );

  const modules: VgrPreflightModule[] = MODULES.map((m) => {
    const sectionIssues = issues.filter((i) => i.sectionId === m.id || (m.id === 'planning' && i.step === 'planning') || (m.id === 'applications' && i.step === 'applications'));
    const hasConflict = sectionIssues.some((i) => /tegenstrijd|conflict|gelijk aan/i.test(i.message))
      || (m.id === 'belastbaarheidsprofiel' && medicalConflicts.length > 0);

    if (m.id === 'applications') {
      const wekelijks = data.body.interventies_activatie.selected.includes('wekelijks_solliciteren');
      if (!wekelijks && data.applications.length === 0) {
        return {
          id: m.id,
          label: m.label,
          status: 'NOT_YET_RELEVANT',
          detail: 'Nog geen wekelijks solliciteren aangevinkt; bijlage mag leeg blijven.',
          writable: false,
        };
      }
      if (wekelijks && data.applications.length === 0) {
        return {
          id: m.id,
          label: m.label,
          status: 'ADDITIONAL_INFORMATION_NEEDED',
          detail: 'Wekelijks solliciteren staat aan zonder sollicitaties in Bijlage 2.',
          writable: true,
        };
      }
      return { id: m.id, label: m.label, status: 'READY', detail: `${data.applications.length} sollicitatie(s).`, writable: true };
    }

    if (m.id === 'planning') {
      const allP = data.planning_phases.every((p) => p.activities.every((a) => a.status === 'P'));
      return {
        id: m.id,
        label: m.label,
        status: allP ? 'ADDITIONAL_INFORMATION_NEEDED' : 'READY',
        detail: allP ? 'Alle activiteiten staan nog op gepland (P).' : 'Planning heeft voortgangsstatussen.',
        writable: true,
      };
    }

    if (m.id === 'leernavigator') {
      const checked = [...data.body.leernavigator.basis, ...data.body.leernavigator.activering].some((i) => i.checked);
      return {
        id: m.id,
        label: m.label,
        status: checked ? 'READY' : 'UNKNOWN',
        detail: checked ? 'Items aangevinkt.' : 'Nog niets aangevinkt (handmatig).',
        writable: true,
      };
    }

    if (m.id === 'kwaliteiten_onderzoek') {
      const hasTestDoc = hasDocs(types, ['extra', 'cv']);
      const selected = data.body.kwaliteiten_onderzoek.selected;
      if (!selected.length && !hasTestDoc) {
        return {
          id: m.id,
          label: m.label,
          status: 'NOT_YET_RELEVANT',
          detail: 'Geen testen geselecteerd en geen testbronnen gekoppeld.',
          writable: false,
        };
      }
      if (selected.includes('persoonlijkheidstest') && Object.values(data.body.kwaliteiten_onderzoek.persoonlijkheid_scores).every(blank)) {
        return {
          id: m.id,
          label: m.label,
          status: 'ADDITIONAL_INFORMATION_NEEDED',
          detail: 'Persoonlijkheidstest aangevinkt zonder scores/testbron.',
          writable: true,
        };
      }
    }

    if (m.id === 'visie_plaatsbaarheid') {
      const hasAd = hasDocs(types, ['ad_rapportage']) || !blank(data.body.visie_plaatsbaarheid.ad.citaat);
      if (!hasAd && blank(data.body.visie_plaatsbaarheid.conclusie)) {
        return {
          id: m.id,
          label: m.label,
          status: 'ADDITIONAL_INFORMATION_NEEDED',
          detail: 'Geen AD-rapport en nog geen conclusie loopbaanadviseur.',
          writable: true,
        };
      }
    }

    if (hasConflict) {
      return {
        id: m.id,
        label: m.label,
        status: 'CONFLICT',
        detail: medicalConflicts[0] || sectionIssues[0]?.message || 'Conflict gesignaleerd.',
        writable: false,
      };
    }

    const aiId = m.id as VGRAiSectionId;
    if (VGR_AI_SECTION_IDS.includes(aiId)) {
      const preferred = VGR_AI_SECTIONS[aiId].preferredDocTypes;
      const readyDocs = !preferred.length || hasDocs(types, preferred) || types.size === 0;
      if (!readyDocs) {
        return {
          id: m.id,
          label: m.label,
          status: 'ADDITIONAL_INFORMATION_NEEDED',
          detail: `Ontbrekende bronnen (verwacht o.a. ${preferred.slice(0, 2).join(', ')}).`,
          writable: true,
        };
      }
    }

    const hardErrors = sectionIssues.filter((i) => i.level === 'error');
    if (hardErrors.length) {
      return {
        id: m.id,
        label: m.label,
        status: 'UNKNOWN',
        detail: hardErrors[0].message,
        writable: true,
      };
    }

    return {
      id: m.id,
      label: m.label,
      status: 'READY',
      detail: 'Voldoende om te schrijven of bij te werken.',
      writable: true,
    };
  });

  return {
    modules,
    medicalConflicts,
    blocksGenerateAll: medicalConflicts.length > 0,
  };
}
