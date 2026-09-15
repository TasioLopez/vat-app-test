import { INTAKE_LAYOUT_V75_HINT } from '@/lib/document-analysis/prompts/intake-layout-v75';

export const INTAKE_NARRATIVE_PROMPT = `Je analyseert een Nederlands intakeformulier (PDF) en extraheert vrije-tekstvelden en checkboxes die nog niet in andere passes zitten.

${INTAKE_LAYOUT_V75_HINT}

FOCUS:
- Sectie 5: reden_ziekmelding, behandeling, FML/IZP-beperkingen checkboxes
- Sectie 6 narrative: actief_spoor1, eigen_of_aangepast_werk, uren_werkzaam, opbouwschema_aanwezig, wat_lukt_wel_niet, ervaart_belastbaarheid, andere_werkgever, weken
- Secties 8–14 en 16: alle open vragen verbatim
- Sectie 17: bijzonderheden, praktische_belemmeringen

REGELS:
- Alleen expliciet ingevulde tekst; niet-ingevuld → null/lege string/false.
- Checkboxes: true alleen bij ☒/☑/X; ☐ = false.
- Geen samenvatting of herschrijving van quotes (quotes komen uit andere passes).
`;

export const INTAKE_NARRATIVE_USER_MESSAGE =
  'Extract narrative and checkbox fields for sections 5–6 and 8–17 from this intake PDF.';

function nullableString(description: string) {
  return { type: ['string', 'null'] as const, description };
}

function boolField(description: string) {
  return { type: 'boolean' as const, description };
}

export const INTAKE_NARRATIVE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    reden_ziekmelding: nullableString('Sectie 5 reden ziekmelding'),
    behandeling: nullableString('Sectie 5 behandeling'),
    fml_beperkingen: {
      type: 'object',
      properties: {
        persoonlijk_functioneren: boolField('Persoonlijk functioneren aangevinkt'),
        sociaal_functioneren: boolField('Sociaal functioneren aangevinkt'),
        dynamische_handelingen: boolField('Dynamische handelingen aangevinkt'),
        statische_houdingen: boolField('Statische houdingen aangevinkt'),
        aanpassingen_fysieke_omgevingseisen: boolField(
          'Aanpassingen fysieke omgevingseisen aangevinkt'
        ),
        werktijden: boolField('Werktijden aangevinkt'),
      },
      required: [
        'persoonlijk_functioneren',
        'sociaal_functioneren',
        'dynamische_handelingen',
        'statische_houdingen',
        'aanpassingen_fysieke_omgevingseisen',
        'werktijden',
      ],
      additionalProperties: false,
    },
    weken: nullableString('Sectie 6 Weken'),
    actief_spoor1: nullableString('Actief binnen Spoor 1'),
    eigen_of_aangepast_werk: nullableString('In eigen of aangepast werk'),
    uren_werkzaam: nullableString('Hoeveel uur per week werkzaam'),
    opbouwschema_aanwezig: nullableString('Opbouwschema aanwezig'),
    wat_lukt_wel_niet: nullableString('Wat lukt wel/niet qua werkbelasting'),
    ervaart_belastbaarheid: nullableString('Hoe ervaart werknemer belastbaarheid'),
    andere_werkgever: nullableString('Heeft werknemer nog een andere werkgever'),
    s8: {
      type: 'object',
      properties: {
        woonplaats: nullableString('Woonplaats'),
        woonsituatie: nullableString('Woonsituatie'),
        uitwonende_kinderen: nullableString('Uitwonende kinderen'),
      },
      required: ['woonplaats', 'woonsituatie', 'uitwonende_kinderen'],
      additionalProperties: false,
    },
    s9: {
      type: 'object',
      properties: {
        contact_familie: nullableString('Contact familieleden'),
        hoe_vaak_contact: nullableString('Hoe vaak contact'),
        ondersteuning_familie: nullableString('Ondersteuning familie/vrienden'),
        mantelzorg: nullableString('Mantelzorg of wederzijdse hulp'),
      },
      required: ['contact_familie', 'hoe_vaak_contact', 'ondersteuning_familie', 'mantelzorg'],
      additionalProperties: false,
    },
    s10: {
      type: 'object',
      properties: {
        zelfstandig_huishouden: nullableString('Zelfstandig huishouden'),
        hulp_huishouden: nullableString('Hulp huishouden'),
        taken_verdeeld: nullableString('Taken verdeeld'),
      },
      required: ['zelfstandig_huishouden', 'hulp_huishouden', 'taken_verdeeld'],
      additionalProperties: false,
    },
    s11: {
      type: 'object',
      properties: {
        gemiddelde_dag: nullableString('Gemiddelde dag'),
        activiteiten_buitenshuis: nullableString('Activiteiten buitenshuis'),
        energie_belastbaarheid: nullableString('Energie/belastbaarheid'),
      },
      required: ['gemiddelde_dag', 'activiteiten_buitenshuis', 'energie_belastbaarheid'],
      additionalProperties: false,
    },
    s12: {
      type: 'object',
      properties: {
        hobbies: nullableString("Hobby's"),
        leest_of_muziek: nullableString('Leest of muziek'),
        kan_uitvoeren: nullableString('Kan uitvoeren'),
        graag_oppakken: nullableString('Graag oppakken'),
      },
      required: ['hobbies', 'leest_of_muziek', 'kan_uitvoeren', 'graag_oppakken'],
      additionalProperties: false,
    },
    s13: {
      type: 'object',
      properties: {
        hoe_lang_werkzaam: nullableString('Hoe lang werkzaam'),
        verbonden_organisatie: nullableString('Verbonden met organisatie'),
        wens_terugkeer: nullableString('Wens terugkeer eigen functie'),
      },
      required: ['hoe_lang_werkzaam', 'verbonden_organisatie', 'wens_terugkeer'],
      additionalProperties: false,
    },
    s14: {
      type: 'object',
      properties: {
        houding_spoor2: nullableString('Houding t.o.v. spoor 2'),
      },
      required: ['houding_spoor2'],
      additionalProperties: false,
    },
    s16: {
      type: 'object',
      properties: {
        interesses_voorkeuren: nullableString('Interesses/voorkeuren'),
        ideeen_passend_werk: nullableString('Ideeën passend werk'),
        bereid_scholing: nullableString('Bereid tot scholing'),
        graag_ontdekken: nullableString('Graag ontdekken/leren'),
      },
      required: [
        'interesses_voorkeuren',
        'ideeen_passend_werk',
        'bereid_scholing',
        'graag_ontdekken',
      ],
      additionalProperties: false,
    },
    bijzonderheden: nullableString('Sectie 17 bijzonderheden'),
    praktische_belemmeringen: nullableString('Sectie 17 praktische belemmeringen'),
  },
  required: [
    'reden_ziekmelding',
    'behandeling',
    'fml_beperkingen',
    'weken',
    'actief_spoor1',
    'eigen_of_aangepast_werk',
    'uren_werkzaam',
    'opbouwschema_aanwezig',
    'wat_lukt_wel_niet',
    'ervaart_belastbaarheid',
    'andere_werkgever',
    's8',
    's9',
    's10',
    's11',
    's12',
    's13',
    's14',
    's16',
    'bijzonderheden',
    'praktische_belemmeringen',
  ],
  additionalProperties: false,
} as const;

export function parseIntakeNarrativeResult(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  return raw as Record<string, unknown>;
}
