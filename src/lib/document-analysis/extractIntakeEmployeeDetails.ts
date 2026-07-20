import type OpenAI from 'openai';
import { normalizeForAnalysis } from './normalizeForAnalysis';
import {
  INTAKE_ALGEMENE_INFO_EXTRACTION_PROMPT,
  INTAKE_ALGEMENE_INFO_USER_MESSAGE,
} from './prompts/intake-algemene-info-extraction';
import { INTAKE_CORE_PROMPT, INTAKE_CORE_USER_MESSAGE } from './prompts/intake-core';
import {
  INTAKE_ALGEMENE_INFO_JSON_SCHEMA,
  parseIntakeAlgemeneInfoExtractionResult,
} from './schemas/intake-algemene-info-schema';
import {
  INTAKE_CORE_JSON_SCHEMA,
  parseIntakeCoreExtractionResult,
} from './schemas/intake-core-schema';
import { runMultiPassExtraction } from './runStructuredExtraction';
import {
  stripCurrentJobFromWorkExperience,
  validateIntakeAlgemeneInfoExtraction,
  validateIntakeCoreExtraction,
} from './validateEmployeeExtraction';

export type IntakeVisionExtractionResult = {
  raw: Record<string, unknown>;
  referentFields: Record<string, unknown>;
};

export async function extractIntakeEmployeeDetailsFromVision(
  openai: OpenAI,
  buffer: Buffer,
  filename: string
): Promise<IntakeVisionExtractionResult> {
  const { pdfBuffer, analysisFilename, wasConverted } = await normalizeForAnalysis(buffer, filename);
  if (wasConverted) {
    console.log(`✅ Intake normalized to PDF for vision extraction (${analysisFilename})`);
  }

  const merged = await runMultiPassExtraction({
    openai,
    pdfBuffer,
    analysisFilename,
    passes: [
      {
        instructions: INTAKE_CORE_PROMPT,
        userMessage: INTAKE_CORE_USER_MESSAGE,
        schemaName: 'intake_core_extraction',
        schema: INTAKE_CORE_JSON_SCHEMA as Record<string, unknown>,
        parse: parseIntakeCoreExtractionResult,
        validate: (result) => validateIntakeCoreExtraction(result),
        logLabel: 'Intake pass A (sectie 2/4/6)',
      },
      {
        instructions: INTAKE_ALGEMENE_INFO_EXTRACTION_PROMPT,
        userMessage: INTAKE_ALGEMENE_INFO_USER_MESSAGE,
        schemaName: 'intake_algemene_info_extraction',
        schema: INTAKE_ALGEMENE_INFO_JSON_SCHEMA as Record<string, unknown>,
        parse: parseIntakeAlgemeneInfoExtractionResult,
        validate: (result, context) =>
          validateIntakeAlgemeneInfoExtraction(result, { currentJob: context.current_job }),
        logLabel: 'Intake pass B (sectie 17)',
      },
    ],
  });

  const level = merged.education_level;
  const strippedWork = stripCurrentJobFromWorkExperience(
    merged.work_experience,
    merged.current_job
  );
  if (strippedWork != null) {
    merged.work_experience = strippedWork;
  } else {
    delete merged.work_experience;
  }
  const work = merged.work_experience;
  console.log(
    `✅ Intake pass B (sectie 17): education_level=${level ?? '—'}, work_experience=${work ? String(work).slice(0, 80) : '—'}`
  );

  const referentFields: Record<string, unknown> = {};
  for (const key of [
    'referent_first_name',
    'referent_last_name',
    'referent_function',
    'referent_phone',
    'referent_email',
    'referent_gender',
  ]) {
    if (merged[key] != null && merged[key] !== '') {
      referentFields[key] = merged[key];
    }
  }

  return { raw: merged, referentFields };
}
