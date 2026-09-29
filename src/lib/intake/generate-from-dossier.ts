import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractStoragePath } from '@/lib/document-analysis/storage';
import { isAdDocumentType, isFmlDocumentType } from '@/lib/document-analysis/doc-type-matchers';
import { isSpreekReportageDocType } from '@/lib/documents/employee-doc-types';
import { normalizeForAnalysis } from '@/lib/document-analysis/normalizeForAnalysis';
import { runStructuredMultiFileExtraction } from '@/lib/document-analysis/runStructuredExtraction';
import { INTAKE_GENERATE_SYSTEM_PROMPT, INTAKE_GENERATE_USER_MESSAGE } from '@/lib/intake/generate-prompt';
import { ensureIntakeShape, createEmptyIntakeData, type IntakeData } from '@/lib/intake/schema';

function nullableString(description: string) {
  return { type: ['string', 'null'] as const, description };
}

function boolField(description: string) {
  return { type: 'boolean' as const, description };
}

/** Compact generation schema — parsed then passed through ensureIntakeShape. */
export const INTAKE_GENERATE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    meta: {
      type: 'object',
      properties: {
        conflicts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              message: { type: 'string' },
            },
            required: ['field', 'message'],
            additionalProperties: false,
          },
        },
        generation_notes: { type: 'array', items: { type: 'string' } },
      },
      required: ['conflicts', 'generation_notes'],
      additionalProperties: false,
    },
    s1: {
      type: 'object',
      properties: {
        employee_name: nullableString('Naam werknemer'),
        intake_date: nullableString('Datum gesprek YYYY-MM-DD'),
      },
      required: ['employee_name', 'intake_date'],
      additionalProperties: false,
    },
    s2: {
      type: 'object',
      properties: {
        age: nullableString('Leeftijd'),
        gender: nullableString('Man/Vrouw'),
        current_job: nullableString('Functietitel'),
        employer: nullableString('Werkgever'),
        contract_hours: nullableString('Uren per week'),
        city: nullableString('Woonplaats'),
        phone: nullableString('Telefoon'),
        email: nullableString('Email'),
        other_employers: nullableString('Andere werkgever'),
      },
      required: [
        'age',
        'gender',
        'current_job',
        'employer',
        'contract_hours',
        'city',
        'phone',
        'email',
        'other_employers',
      ],
      additionalProperties: false,
    },
    s3: {
      type: 'object',
      properties: {
        korte_beschrijving_werkzaamheden: nullableString('Functieomschrijving max 5 zinnen'),
      },
      required: ['korte_beschrijving_werkzaamheden'],
      additionalProperties: false,
    },
    s4: {
      type: 'object',
      properties: {
        referent_name: nullableString('Contactpersoon'),
        referent_function: nullableString('Functie contactpersoon'),
        referent_phone: nullableString('Tel contactpersoon'),
        referent_email: nullableString('Email contactpersoon'),
        extra_referent_name: nullableString('Extra contact'),
        extra_referent_function: nullableString('Functie extra contact'),
      },
      required: [
        'referent_name',
        'referent_function',
        'referent_phone',
        'referent_email',
        'extra_referent_name',
        'extra_referent_function',
      ],
      additionalProperties: false,
    },
    s5: {
      type: 'object',
      properties: {
        first_sick_day: nullableString('Eerste ziektedag YYYY-MM-DD'),
        reden_ziekmelding: nullableString('Reden ziekmelding'),
        fml_beperkingen: {
          type: 'object',
          properties: {
            persoonlijk_functioneren: boolField('PF'),
            sociaal_functioneren: boolField('SF'),
            dynamische_handelingen: boolField('DH'),
            statische_houdingen: boolField('SH'),
            aanpassingen_fysieke_omgevingseisen: boolField('AO'),
            werktijden: boolField('WT'),
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
        quote_prognose_advies_belastbaarheid: nullableString('Quote prognose/advies'),
        behandeling: nullableString('Behandeling'),
      },
      required: [
        'first_sick_day',
        'reden_ziekmelding',
        'fml_beperkingen',
        'quote_prognose_advies_belastbaarheid',
        'behandeling',
      ],
      additionalProperties: false,
    },
    s6: {
      type: 'object',
      properties: {
        date_of_birth: nullableString('Geboortedatum YYYY-MM-DD'),
        weken: nullableString('Weken'),
        registration_date: nullableString('Aanmelddatum'),
        tp_start_date: nullableString('Startdatum'),
        fml_izp_lab_date: nullableString('Datum FML/IZP'),
        fml_izp_lab_kind: { type: ['string', 'null'], enum: ['fml', 'izp', null] },
        tp_end_date: nullableString('Einddatum'),
        doctor_role: nullableString('Arts/Anios/Aios/BA/VA'),
        occupational_doctor_name: nullableString('Naam arts'),
        ad_report_date: nullableString('Datum AD-rapport'),
        ad_report_concept: boolField('Concept'),
        osv_doctor_role: nullableString('OSV rol'),
        osv_doctor_name: nullableString('OSV naam'),
        occupational_doctor_ad_name: nullableString('Naam AD'),
        is_ex_werknemer: boolField('Ex-werknemer'),
        actief_spoor1: nullableString('Actief spoor 1'),
        eigen_of_aangepast_werk: nullableString('Eigen/aangepast'),
        uren_werkzaam: nullableString('Uren werkzaam'),
        opbouwschema_aanwezig: nullableString('Opbouwschema'),
        wat_lukt_wel_niet: nullableString('Wat lukt wel/niet'),
        ervaart_belastbaarheid: nullableString('Ervaart belastbaarheid'),
        andere_werkgever: nullableString('Andere werkgever'),
      },
      required: [
        'date_of_birth',
        'weken',
        'registration_date',
        'tp_start_date',
        'fml_izp_lab_date',
        'fml_izp_lab_kind',
        'tp_end_date',
        'doctor_role',
        'occupational_doctor_name',
        'ad_report_date',
        'ad_report_concept',
        'osv_doctor_role',
        'osv_doctor_name',
        'occupational_doctor_ad_name',
        'is_ex_werknemer',
        'actief_spoor1',
        'eigen_of_aangepast_werk',
        'uren_werkzaam',
        'opbouwschema_aanwezig',
        'wat_lukt_wel_niet',
        'ervaart_belastbaarheid',
        'andere_werkgever',
      ],
      additionalProperties: false,
    },
    s7: {
      type: 'object',
      properties: {
        ad_auteur: nullableString('Naam AD'),
        quote_advies_spoor2: nullableString('Quote advies spoor 2'),
        quote_passende_functies: nullableString('Quote passende functies'),
        functie_categorien: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              naam: { type: 'string' },
              toelichting: { type: 'string' },
            },
            required: ['naam', 'toelichting'],
            additionalProperties: false,
          },
        },
      },
      required: [
        'ad_auteur',
        'quote_advies_spoor2',
        'quote_passende_functies',
        'functie_categorien',
      ],
      additionalProperties: false,
    },
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
        contact_familie: nullableString('Contact familie'),
        hoe_vaak_contact: nullableString('Hoe vaak'),
        ondersteuning_familie: nullableString('Ondersteuning'),
        mantelzorg: nullableString('Mantelzorg'),
      },
      required: ['contact_familie', 'hoe_vaak_contact', 'ondersteuning_familie', 'mantelzorg'],
      additionalProperties: false,
    },
    s10: {
      type: 'object',
      properties: {
        zelfstandig_huishouden: nullableString('Zelfstandig huishouden'),
        hulp_huishouden: nullableString('Hulp'),
        taken_verdeeld: nullableString('Taken verdeeld'),
      },
      required: ['zelfstandig_huishouden', 'hulp_huishouden', 'taken_verdeeld'],
      additionalProperties: false,
    },
    s11: {
      type: 'object',
      properties: {
        gemiddelde_dag: nullableString('Gemiddelde dag'),
        activiteiten_buitenshuis: nullableString('Buitenshuis'),
        energie_belastbaarheid: nullableString('Energie'),
      },
      required: ['gemiddelde_dag', 'activiteiten_buitenshuis', 'energie_belastbaarheid'],
      additionalProperties: false,
    },
    s12: {
      type: 'object',
      properties: {
        hobbies: nullableString("Hobby's"),
        leest_of_muziek: nullableString('Leest/muziek'),
        kan_uitvoeren: nullableString('Kan uitvoeren'),
        graag_oppakken: nullableString('Oppakken'),
      },
      required: ['hobbies', 'leest_of_muziek', 'kan_uitvoeren', 'graag_oppakken'],
      additionalProperties: false,
    },
    s13: {
      type: 'object',
      properties: {
        hoe_lang_werkzaam: nullableString('Hoe lang'),
        verbonden_organisatie: nullableString('Verbonden'),
        wens_terugkeer: nullableString('Terugkeer'),
      },
      required: ['hoe_lang_werkzaam', 'verbonden_organisatie', 'wens_terugkeer'],
      additionalProperties: false,
    },
    s14: {
      type: 'object',
      properties: { houding_spoor2: nullableString('Houding spoor 2') },
      required: ['houding_spoor2'],
      additionalProperties: false,
    },
    s16: {
      type: 'object',
      properties: {
        interesses_voorkeuren: nullableString('Interesses'),
        ideeen_passend_werk: nullableString('Ideeën'),
        bereid_scholing: nullableString('Scholing'),
        graag_ontdekken: nullableString('Ontdekken'),
      },
      required: [
        'interesses_voorkeuren',
        'ideeen_passend_werk',
        'bereid_scholing',
        'graag_ontdekken',
      ],
      additionalProperties: false,
    },
    s17: {
      type: 'object',
      properties: {
        bijzonderheden: nullableString('Bijzonderheden'),
        praktische_belemmeringen: nullableString('Praktische belemmeringen'),
        opleidingen: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              opleiding: { type: 'string' },
              afgerond: { type: ['string', 'null'], enum: ['ja', 'nee', null] },
            },
            required: ['opleiding', 'afgerond'],
            additionalProperties: false,
          },
        },
        werkervaring: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              functie: { type: 'string' },
              van_tot: { type: 'string' },
            },
            required: ['functie', 'van_tot'],
            additionalProperties: false,
          },
        },
        education_level: nullableString('Hoogste opleiding'),
        education_name: nullableString('Richting'),
        work_experience: nullableString('Functietitels komma'),
        has_pc: boolField('PC/laptop'),
        has_smartphone: boolField('Smartphone'),
        has_tablet: boolField('Tablet'),
        computer_skills: nullableString('Computerniveau'),
        computer_skills_extra: nullableString('Extra programma’s'),
        typing_skills: nullableString('Typvaardigheid'),
        drivers_license_types: { type: 'array', items: { type: 'string' } },
        transport_types: { type: 'array', items: { type: 'string' } },
        dutch_speaking: nullableString('NL spreken'),
        dutch_writing: nullableString('NL schrijven'),
        other_languages: nullableString('Andere talen'),
      },
      required: [
        'bijzonderheden',
        'praktische_belemmeringen',
        'opleidingen',
        'werkervaring',
        'education_level',
        'education_name',
        'work_experience',
        'has_pc',
        'has_smartphone',
        'has_tablet',
        'computer_skills',
        'computer_skills_extra',
        'typing_skills',
        'drivers_license_types',
        'transport_types',
        'dutch_speaking',
        'dutch_writing',
        'other_languages',
      ],
      additionalProperties: false,
    },
  },
  required: [
    'meta',
    's1',
    's2',
    's3',
    's4',
    's5',
    's6',
    's7',
    's8',
    's9',
    's10',
    's11',
    's12',
    's13',
    's14',
    's16',
    's17',
  ],
  additionalProperties: false,
} as const;

function isDossierSourceType(type: string | null | undefined): boolean {
  const t = (type || '').toLowerCase();
  if (t.includes('intake')) return false;
  return (
    isAdDocumentType(type) ||
    isFmlDocumentType(type) ||
    isSpreekReportageDocType(type) ||
    t === 'extra' ||
    t.includes('extra')
  );
}

export type GenerateIntakeFromDossierResult = {
  data: IntakeData;
  error?: string;
};

export async function generateIntakeFromDossier(params: {
  openai: OpenAI;
  supabase: SupabaseClient;
  employeeId: string;
}): Promise<GenerateIntakeFromDossierResult> {
  const { openai, supabase, employeeId } = params;

  const { data: docs } = await supabase
    .from('documents')
    .select('type, url, name, uploaded_at')
    .eq('employee_id', employeeId)
    .order('uploaded_at', { ascending: false });

  const sources = (docs || []).filter((d) => isDossierSourceType(d.type) && d.url);
  if (sources.length === 0) {
    return {
      data: createEmptyIntakeData(),
      error: 'Geen AD/FML/spreekuur/overige documenten gevonden om te genereren.',
    };
  }

  const files: { pdfBuffer: Buffer; analysisFilename: string; label?: string }[] = [];
  const notes: string[] = [];

  for (const doc of sources.slice(0, 8)) {
    const path = extractStoragePath(doc.url || '');
    if (!path) continue;
    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    const name = doc.name || path;
    try {
      const { pdfBuffer, analysisFilename } = await normalizeForAnalysis(buffer, name);
      files.push({
        pdfBuffer,
        analysisFilename,
        label: `${doc.type || 'doc'}: ${name}`,
      });
      notes.push(`${doc.type || 'doc'}: ${name}`);
    } catch (e) {
      console.warn('Skip dossier doc for intake generate', name, e);
    }
  }

  if (files.length === 0) {
    return {
      data: createEmptyIntakeData(),
      error: 'Kon geen dossierdocumenten lezen voor generatie.',
    };
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('first_name, last_name')
    .eq('id', employeeId)
    .maybeSingle();

  const employeeName = [employee?.first_name, employee?.last_name].filter(Boolean).join(' ');

  const raw = await runStructuredMultiFileExtraction({
    openai,
    files,
    instructions: INTAKE_GENERATE_SYSTEM_PROMPT,
    userMessage: `${INTAKE_GENERATE_USER_MESSAGE}\nWerknemer: ${employeeName || 'onbekend'}`,
    schemaName: 'intake_generate_full',
    schema: INTAKE_GENERATE_JSON_SCHEMA as Record<string, unknown>,
    parse: (r) => r as Record<string, unknown>,
  });

  const shaped = ensureIntakeShape(raw);
  shaped.meta.generation_notes = [
    ...shaped.meta.generation_notes,
    ...notes.map((n) => `Bron: ${n}`),
  ];
  if (!shaped.s1.employee_name && employeeName) {
    shaped.s1.employee_name = employeeName;
  }

  return { data: shaped };
}
