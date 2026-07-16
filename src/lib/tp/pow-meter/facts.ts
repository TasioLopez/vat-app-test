/** Structured facts extracted from documents before ladder scoring. */
export type PowMeterFacts = {
  current_work_hours_per_week: number;
  fml_max_hours_per_week: number | null;
  awaiting_revalidation_or_intensive_treatment: boolean;
  explicitly_not_loadable_at_intake: boolean;
  inactivity_or_limited_daily_structure: boolean;
  outside_deliberate_min_2_per_week: boolean;
  outside_functional_only: boolean;
  regular_social_participation_outside: boolean;
  motivated_toward_work: boolean;
  performs_work_activities: boolean;
  paid_work: boolean;
  duurzaam_passend_min_65: boolean;
};

function coerceNumber(value: unknown, defaultValue = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

function coerceNullableHours(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function coerceBoolean(value: unknown, defaultValue = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'true' || lower === 'ja' || lower === 'yes' || lower === '1') return true;
    if (lower === 'false' || lower === 'nee' || lower === 'no' || lower === '0') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return defaultValue;
}

export function parsePowMeterFacts(o: Record<string, unknown>): PowMeterFacts {
  return {
    current_work_hours_per_week: coerceNumber(o.current_work_hours_per_week),
    fml_max_hours_per_week: coerceNullableHours(o.fml_max_hours_per_week),
    awaiting_revalidation_or_intensive_treatment: coerceBoolean(
      o.awaiting_revalidation_or_intensive_treatment
    ),
    explicitly_not_loadable_at_intake: coerceBoolean(o.explicitly_not_loadable_at_intake),
    inactivity_or_limited_daily_structure: coerceBoolean(o.inactivity_or_limited_daily_structure),
    outside_deliberate_min_2_per_week: coerceBoolean(o.outside_deliberate_min_2_per_week),
    outside_functional_only: coerceBoolean(o.outside_functional_only),
    regular_social_participation_outside: coerceBoolean(o.regular_social_participation_outside),
    motivated_toward_work: coerceBoolean(o.motivated_toward_work),
    performs_work_activities: coerceBoolean(o.performs_work_activities),
    paid_work: coerceBoolean(o.paid_work),
    duurzaam_passend_min_65: coerceBoolean(o.duurzaam_passend_min_65),
  };
}

/** JSON schema property definitions for PowMeterFacts (merged into content schema). */
export const POW_METER_FACTS_JSON_PROPERTIES = {
  current_work_hours_per_week: {
    type: 'number',
    description:
      'Actuele werkuren per week op intake (0 als geen werk). Geen contracturen — alleen feitelijke werkuren.',
  },
  fml_max_hours_per_week: {
    type: ['number', 'null'] as const,
    description:
      'Maximaal belastbare uren per week volgens FML/IZP (null indien onbekend). Gebruik getal, geen string.',
  },
  awaiting_revalidation_or_intensive_treatment: {
    type: 'boolean',
    description:
      'true indien werknemer wacht op of in intensief revalidatie-/behandeltraject staat waarin niet belastbaar is.',
  },
  explicitly_not_loadable_at_intake: {
    type: 'boolean',
    description:
      'true indien bedrijfsarts/AD expliciet aangeeft dat werknemer op intake momenteel niet belastbaar is.',
  },
  inactivity_or_limited_daily_structure: {
    type: 'boolean',
    description:
      'true bij inactiviteit, beperkte daginvulling, of overwegend thuis op bank/TV zonder structurele buitenactiviteiten.',
  },
  outside_deliberate_min_2_per_week: {
    type: 'boolean',
    description:
      'Non-work deliberate outside ≥2×/week (sociaal, sport, club, vaste ontmoetingen buiten). false bij alleen zorgtaken/boodschappen/zorgafspraken. Zet NIET op true alleen vanwege aangepast/on-site werk — dat gaat via performs_work_activities.',
  },
  outside_functional_only: {
    type: 'boolean',
    description:
      'true indien buitenshuis (naast eventueel werk) alleen functionele trips (school/gastouder, boodschappen, afspraken zorg). Functionele trips tellen niet als Q3 sociale participatie.',
  },
  regular_social_participation_outside: {
    type: 'boolean',
    description:
      'Strict Q3: true alleen bij herhaalde, structurele sociale participatie BUITEN de woning (club/sport/vaste sociale afspraak). false bij familiecontact thuis/telefoon, sporadisch, of alleen werk/collega\'s. Werk ≠ Q3.',
  },
  motivated_toward_work: {
    type: 'boolean',
    description: 'true indien werknemer gemotiveerd is richting arbeid (ook wanneer uitgesteld tot na behandeling).',
  },
  performs_work_activities: {
    type: 'boolean',
    description:
      'true bij aangepast werk, WEP, stage, activeringsplek of andere structurele werkzaamheden. false bij 0 uur.',
  },
  paid_work: {
    type: 'boolean',
    description: 'true alleen bij betaald werk. false bij vrijwilligerswerk/stage/WEP/activeringsplek.',
  },
  duurzaam_passend_min_65: {
    type: 'boolean',
    description:
      'Alleen bij betaald werk: true bij duurzaam passend ≥~65% contract/loonwaarde zonder tijdelijke voorzieningen.',
  },
} as const;

export const POW_METER_FACTS_REQUIRED_KEYS = [
  'current_work_hours_per_week',
  'fml_max_hours_per_week',
  'awaiting_revalidation_or_intensive_treatment',
  'explicitly_not_loadable_at_intake',
  'inactivity_or_limited_daily_structure',
  'outside_deliberate_min_2_per_week',
  'outside_functional_only',
  'regular_social_participation_outside',
  'motivated_toward_work',
  'performs_work_activities',
  'paid_work',
  'duurzaam_passend_min_65',
] as const;
