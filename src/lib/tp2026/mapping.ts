import { formatEmployeeName, isAbsentText, normalizePersonName, normalizeStringArrayField } from '@/lib/utils';
import { normalizePhoneForStorage } from '@/lib/phone/format-dutch-display';
import { VISIE_LOOPBAANADVISEUR_BASIS, WETTELIJKE_KADERS } from '@/lib/tp/static';
import type {
  TP2026Bijlage1Activity,
  TP2026Bijlage1Phase,
} from './schema';
import { resolveBijlage1PhaseDates } from '@/lib/tp2026/bijlage1-dates';
import { normalizeTp3Activities } from '@/lib/tp/tp_activities';
import {
  normalizeBasisSectionContentHash,
  normalizeBasisSectionReview,
} from '@/lib/tp2026/basis-section-review';
import { repairEmployeeEducationFields } from '@/lib/tp2026/gegevens-field-options';

export const PRACTISCHE_BELEMMERINGEN_DEFAULT =
  'Voor zover bekend zijn er geen praktische belemmeringen die van invloed kunnen zijn op het verloop van het tweede spoortraject.';

const bijlage1PhaseDefaults: TP2026Bijlage1Phase[] = [
  {
    title: 'Oriëntatie',
    period_from: '',
    period_to: '',
    activities: [
      'Verwerking verlies en acceptatie',
      'Empowerment',
      'Webinars',
      'Kwaliteiten en vaardigheden onderzoek',
      'Beroeps-en arbeidsmarktoriëntatie',
      'Scholingsmogelijkheden onderzoeken',
      'Sollicitatietools (brief en cv)',
      'Voortgangsrapportage en evaluatie',
    ].map((name) => ({ name, status: 'P' })),
  },
  {
    title: 'Activering',
    period_from: '',
    period_to: '',
    activities: [
      'Sollicitatievaardigheden vervolg (gesprek)',
      'Netwerken',
      'Webinars',
      'Solliciteren via Social Media',
      'Vacatures zoeken en beoordeling',
      'Wekelijks solliciteren',
      'Activering/ werkervaringsplaats',
      'Voortgangsrapportage en evaluatie',
    ].map((name) => ({ name, status: 'P' })),
  },
  {
    title: 'Betaald werk',
    period_from: '',
    period_to: '',
    activities: [
      'Wekelijks solliciteren vervolg',
      'Sollicitatiegesprek voorbereiden en presenteren',
      'Jobhunten',
      'Detachering onderzoeken',
      'Webinar, gericht op WIA-aanvraag',
      'Begeleiding WIA',
      'Voortgangsrapportage en eindevaluatie',
    ].map((name) => ({ name, status: 'P' })),
  },
];

const BIJLAGE1_ACTIVITY_LEGACY: Record<string, string> = {
  'Solliciteren en/of netwerken via Social Media': 'Solliciteren via Social Media',
};

function canonicalBijlage1ActivityName(name: string): string {
  return BIJLAGE1_ACTIVITY_LEGACY[name] ?? name;
}

function normalizeBijlage1Phases(raw: unknown): TP2026Bijlage1Phase[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((phase) => phase && typeof phase === 'object')
    .map((phase, index) => {
      const typedPhase = phase as Record<string, any>;
      const activities = Array.isArray(typedPhase.activities) ? typedPhase.activities : [];
      return {
        title: String(typedPhase.title || `Planning fase ${index + 1}`),
        period_from: String(typedPhase.period_from || typedPhase.periode?.from || ''),
        period_to: String(typedPhase.period_to || typedPhase.periode?.to || ''),
        activities: activities
          .filter((activity) => activity && typeof activity === 'object' && typeof activity.name === 'string')
          .map((activity) => ({
            name: canonicalBijlage1ActivityName(String(activity.name || '')),
            status:
              activity.status === 'G' || activity.status === 'P' || activity.status === 'N' || activity.status === 'U'
                ? activity.status
                : 'P',
          })),
      };
    });
}

export function ensureTP2026Shape(raw: Record<string, any>): Record<string, any> {
  const next = { ...raw };

  if (typeof next.first_name === 'string') {
    next.first_name = normalizePersonName(next.first_name) ?? '';
  }
  if (typeof next.last_name === 'string') {
    next.last_name = normalizePersonName(next.last_name) ?? '';
  }

  for (const key of ['phone', 'consultant_phone', 'client_referent_phone'] as const) {
    if (typeof next[key] === 'string' && next[key].trim()) {
      next[key] = normalizePhoneForStorage(next[key]) ?? '';
    }
  }

  if (next.first_name && next.last_name) {
    next.employee_name = formatEmployeeName(next.first_name, next.last_name, next.gender);
  } else if (!next.employee_name?.trim()) {
    next.employee_name = [next.first_name, next.last_name].filter(Boolean).join(' ').trim();
  }

  const fromLegacy = normalizeBijlage1Phases(next.bijlage_fases);
  const currentBijlage1 = normalizeBijlage1Phases(next.bijlage1_phases);
  let bijlage1Phases: TP2026Bijlage1Phase[];
  if (!Array.isArray(next.bijlage1_phases) || next.bijlage1_phases.length === 0) {
    bijlage1Phases = (fromLegacy.length > 0 ? fromLegacy : bijlage1PhaseDefaults) as TP2026Bijlage1Phase[];
  } else {
    bijlage1Phases = currentBijlage1.length > 0 ? currentBijlage1 : bijlage1PhaseDefaults;
  }
  const planStart = next.tp_start_date || next.intake_date;
  next.bijlage1_phases = resolveBijlage1PhaseDates(bijlage1Phases, fromLegacy, planStart, next.tp_end_date);

  if (!String(next.wettelijke_kaders || '').trim()) {
    next.wettelijke_kaders = WETTELIJKE_KADERS;
  }
  if (!String(next.visie_loopbaanadviseur || '').trim()) {
    next.visie_loopbaanadviseur = VISIE_LOOPBAANADVISEUR_BASIS;
  }
  if (!String(next.praktische_belemmeringen || '').trim()) {
    next.praktische_belemmeringen = PRACTISCHE_BELEMMERINGEN_DEFAULT;
  }

  const licenseTypes = normalizeStringArrayField(next.drivers_license_type);
  if (licenseTypes.length > 0) {
    next.drivers_license_type = licenseTypes;
  }

  const transport = normalizeStringArrayField(next.transport_type);
  if (transport.length > 0) {
    next.transport_type = transport;
  }

  if (next.tp3_activities !== null && next.tp3_activities !== undefined) {
    next.tp3_activities = normalizeTp3Activities(next.tp3_activities);
  }

  next.basis_section_review = normalizeBasisSectionReview(next.basis_section_review);
  next.basis_section_content_hash = normalizeBasisSectionContentHash(next.basis_section_content_hash);

  const repairedEducation = repairEmployeeEducationFields(next.education_level, next.education_name);
  if (repairedEducation.education_level) {
    next.education_level = repairedEducation.education_level;
  } else if (next.education_level != null) {
    next.education_level = '';
  }
  if (repairedEducation.education_name !== undefined) {
    next.education_name = repairedEducation.education_name;
  }

  if (isAbsentText(next.other_employers)) {
    next.other_employers = '';
  }

  return next;
}

export function mergeAutofillIntoTP2026(
  current: Record<string, any>,
  payload: Record<string, any>
): Record<string, any> {
  return ensureTP2026Shape({
    ...current,
    ...payload,
  });
}

export function flattenBijlage1Activities(phases: TP2026Bijlage1Phase[]): TP2026Bijlage1Activity[] {
  return phases.flatMap((phase) => phase.activities);
}
