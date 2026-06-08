import { ALINEA_1_KEYS, ALINEA_2_KEYS, ALINEA_3_KEYS } from './constants';

export type SocialeAchtergrondTopicKey =
  | (typeof ALINEA_1_KEYS)[number]
  | (typeof ALINEA_2_KEYS)[number]
  | (typeof ALINEA_3_KEYS)[number];

/** Structured factual clauses from the model (one nullable field per intake topic). */
export type SocialeAchtergrondContentResult = Record<SocialeAchtergrondTopicKey, string | null>;

const ALL_KEYS: SocialeAchtergrondTopicKey[] = [
  ...ALINEA_1_KEYS,
  ...ALINEA_2_KEYS,
  ...ALINEA_3_KEYS,
];

function nullableStringProperty(description: string) {
  return {
    type: ['string', 'null'] as const,
    description,
  };
}

const TOPIC_DESCRIPTIONS: Record<SocialeAchtergrondTopicKey, string> = {
  woonsituatie: 'Feitelijke woonsituatie uit intake; null wanneer niet vermeld.',
  gezinssituatie: 'Feitelijke gezinssituatie uit intake; null wanneer niet vermeld.',
  familiecontacten: 'Feitelijke familiecontacten uit intake; null wanneer niet vermeld.',
  sociaal_netwerk: 'Feitelijk sociaal netwerk uit intake; null wanneer niet vermeld.',
  sociale_contacten: 'Feitelijke sociale contacten uit intake; null wanneer niet vermeld.',
  sociale_steun: 'Feitelijke sociale steun uit intake; null wanneer niet vermeld.',
  praktische_omstandigheden:
    'Feitelijke praktische omstandigheden relevant voor re-integratie (vervoer, taal, etc.); null wanneer niet vermeld.',
  huishoudelijke_taken: 'Feitelijke huishoudelijke taken uit intake; null wanneer niet vermeld.',
  zorgtaken: 'Feitelijke zorgtaken uit intake; null wanneer niet vermeld.',
  dagelijkse_bezigheden: 'Feitelijke dagelijkse bezigheden uit intake; null wanneer niet vermeld.',
  dagstructuur: 'Feitelijke dagstructuur uit intake; null wanneer niet vermeld.',
  activiteiten_buitenshuis: 'Feitelijke activiteiten buitenshuis uit intake; null wanneer niet vermeld.',
  vrije_tijd: 'Feitelijke vrije tijd uit intake; null wanneer niet vermeld.',
  hobby: 'Feitelijke hobby\'s uit intake; null wanneer niet vermeld.',
  sport: 'Feitelijke sportactiviteiten uit intake; null wanneer niet vermeld.',
  vrijwilligerswerk: 'Feitelijk vrijwilligerswerk uit intake; null wanneer niet vermeld.',
  maatschappelijke_activiteiten:
    'Feitelijke maatschappelijke activiteiten uit intake; null wanneer niet vermeld.',
};

/** JSON schema for OpenAI Structured Outputs (strict). */
export const SOCIALE_ACHTERGROND_CONTENT_JSON_SCHEMA = {
  type: 'object',
  properties: Object.fromEntries(
    ALL_KEYS.map((key) => [key, nullableStringProperty(TOPIC_DESCRIPTIONS[key])])
  ),
  required: [...ALL_KEYS],
  additionalProperties: false,
} as const;

function coerceNullableString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

export function parseSocialeAchtergrondContentResult(raw: unknown): SocialeAchtergrondContentResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const result = {} as SocialeAchtergrondContentResult;
  for (const key of ALL_KEYS) {
    result[key] = coerceNullableString(o[key]);
  }
  return result;
}
