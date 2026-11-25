/**
 * Practical VGR preflight checklist (dossier-mode lite) before Generate-all.
 * Statuses follow the client projectbron vocabulary.
 * Phase 1 (G6 lite): `writable` gates generation; at most one `question` per gap.
 */
import { detectVgrSourceConflicts } from '@/lib/vgr/ai/collect-context';
import {
  VGR_AI_SECTION_IDS,
  VGR_AI_SECTIONS,
  VGR_MEDICAL_LEAD_DOCS,
  type VGRAiSectionId,
} from '@/lib/vgr/ai/sections';
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
  /** At most one focused question when the module is not READY / needs input. */
  question?: string;
};

export type VgrPreflightResult = {
  modules: VgrPreflightModule[];
  medicalConflicts: string[];
  /** Soft-block Generate-all when true (coach can still acknowledge). */
  blocksGenerateAll: boolean;
  /** Flattened gap questions (one per non-ready module that has one). */
  questions: string[];
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

function hasDocs(types: Set<string>, preferred: readonly string[]): boolean {
  return preferred.some((t) => types.has(t));
}

function blank(v: unknown) {
  return String(v ?? '').trim() === '';
}

function mod(
  base: { id: string; label: string },
  status: VgrPreflightStatus,
  detail: string,
  writable: boolean,
  question?: string,
): VgrPreflightModule {
  return {
    id: base.id,
    label: base.label,
    status,
    detail,
    writable,
    ...(question ? { question } : {}),
  };
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
        return mod(m, 'NOT_YET_RELEVANT', 'Nog geen wekelijks solliciteren aangevinkt; bijlage mag leeg blijven.', false);
      }
      if (wekelijks && data.applications.length === 0) {
        return mod(
          m,
          'ADDITIONAL_INFORMATION_NEEDED',
          'Wekelijks solliciteren staat aan zonder sollicitaties in Bijlage 2.',
          true,
          'Welke sollicitaties zijn in deze periode aantoonbaar verricht?',
        );
      }
      return mod(m, 'READY', `${data.applications.length} sollicitatie(s).`, true);
    }

    if (m.id === 'planning') {
      const allP = data.planning_phases.every((p) => p.activities.every((a) => a.status === 'P'));
      return mod(
        m,
        allP ? 'ADDITIONAL_INFORMATION_NEEDED' : 'READY',
        allP ? 'Alle activiteiten staan nog op gepland (P).' : 'Planning heeft voortgangsstatussen.',
        true,
        allP ? 'Welke geplande activiteiten zijn in deze periode daadwerkelijk gestart of afgerond?' : undefined,
      );
    }

    if (m.id === 'leernavigator') {
      const checked = [...data.body.leernavigator.basis, ...data.body.leernavigator.activering].some((i) => i.checked);
      return mod(
        m,
        checked ? 'READY' : 'UNKNOWN',
        checked ? 'Items aangevinkt.' : 'Nog niets aangevinkt (handmatig).',
        true,
        checked ? undefined : 'Welke Leernavigator-onderdelen zijn in deze periode feitelijk gerealiseerd?',
      );
    }

    // G4: benutbare mogelijkheden need a medical lead source; AD alone is not enough.
    if (m.id === 'benutbare_mogelijkheden') {
      const hasMedical = hasDocs(types, VGR_MEDICAL_LEAD_DOCS) || types.size === 0;
      const onlyAd =
        types.size > 0 &&
        !hasDocs(types, VGR_MEDICAL_LEAD_DOCS) &&
        hasDocs(types, ['ad_rapportage']);
      if (onlyAd) {
        return mod(
          m,
          'ADDITIONAL_INFORMATION_NEEDED',
          'Alleen AD-rapport geselecteerd; AD is geen bron voor benutbare mogelijkheden.',
          false,
          'Is er een spreekuurrapportage of FML/IZP van de bedrijfsarts beschikbaar?',
        );
      }
      if (!hasMedical && types.size > 0) {
        return mod(
          m,
          'ADDITIONAL_INFORMATION_NEEDED',
          'Geen medische bron (spreekuur / FML/IZP) voor benutbare mogelijkheden.',
          false,
          'Welke bedrijfsarts-bron (spreekuur of FML/IZP) onderbouwt de benutbare mogelijkheden?',
        );
      }
    }

    if (m.id === 'kwaliteiten_onderzoek') {
      const hasTestDoc = hasDocs(types, ['extra', 'cv']);
      const selected = data.body.kwaliteiten_onderzoek.selected;
      if (!selected.length && !hasTestDoc) {
        return mod(m, 'NOT_YET_RELEVANT', 'Geen testen geselecteerd en geen testbronnen gekoppeld.', false);
      }
      if (selected.includes('persoonlijkheidstest') && Object.values(data.body.kwaliteiten_onderzoek.persoonlijkheid_scores).every(blank)) {
        return mod(
          m,
          'ADDITIONAL_INFORMATION_NEEDED',
          'Persoonlijkheidstest aangevinkt zonder scores/testbron.',
          true,
          'Welk testrapport bevat de persoonlijkheidsscores?',
        );
      }
    }

    if (m.id === 'visie_plaatsbaarheid') {
      const hasAd = hasDocs(types, ['ad_rapportage']) || !blank(data.body.visie_plaatsbaarheid.ad.citaat);
      if (!hasAd && blank(data.body.visie_plaatsbaarheid.conclusie)) {
        return mod(
          m,
          'ADDITIONAL_INFORMATION_NEEDED',
          'Geen AD-rapport en nog geen conclusie loopbaanadviseur.',
          true,
          'Is er een AD-rapport, of wilt u alleen de conclusie van de loopbaanadviseur laten schrijven?',
        );
      }
    }

    if (hasConflict) {
      return mod(
        m,
        'CONFLICT',
        medicalConflicts[0] || sectionIssues[0]?.message || 'Conflict gesignaleerd.',
        false,
        'Welke bron is leidend voor dit conflict (arts vs AD vs eerdere VGR)?',
      );
    }

    const aiId = m.id as VGRAiSectionId;
    if (VGR_AI_SECTION_IDS.includes(aiId)) {
      const preferred = VGR_AI_SECTIONS[aiId].preferredDocTypes;
      const readyDocs = !preferred.length || hasDocs(types, preferred) || types.size === 0;
      if (!readyDocs) {
        return mod(
          m,
          'ADDITIONAL_INFORMATION_NEEDED',
          `Ontbrekende bronnen (verwacht o.a. ${preferred.slice(0, 2).join(', ')}).`,
          true,
          `Welke bron(nen) ontbreken nog voor ${m.label.toLowerCase()}?`,
        );
      }
    }

    const hardErrors = sectionIssues.filter((i) => i.level === 'error');
    if (hardErrors.length) {
      return mod(m, 'UNKNOWN', hardErrors[0].message, true, hardErrors[0].message);
    }

    return mod(m, 'READY', 'Voldoende om te schrijven of bij te werken.', true);
  });

  const questions = modules
    .filter((m) => m.question && m.status !== 'READY' && m.status !== 'NOT_APPLICABLE')
    .map((m) => m.question as string);

  return {
    modules,
    medicalConflicts,
    blocksGenerateAll: medicalConflicts.length > 0,
    questions,
  };
}

/** AI section ids that preflight marks writable (Generate-all / per-section gate). */
export function writableVgrAiSectionIds(
  preflight: VgrPreflightResult,
  sectionIds: readonly VGRAiSectionId[] = VGR_AI_SECTION_IDS,
): VGRAiSectionId[] {
  const byId = new Map(preflight.modules.map((m) => [m.id, m]));
  return sectionIds.filter((id) => byId.get(id)?.writable !== false);
}
