import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractStoragePath } from '@/lib/document-analysis/storage';
import { buildOpenAIFile } from '@/lib/openai-file-upload';
import { hasDefinitiveAdReport, isAdReportConcept } from '@/lib/tp/ad-report-wording';
import {
  buildVisieLoopbaanadviseurFields,
  type VisieLoopbaanadviseurBuildContext,
  type VisieLoopbaanadviseurFields,
} from './build-fields';
import {
  FUNCTIE_SUGGESTION_BATCH_SIZE,
  type DocumentScenario,
} from './constants';
import { DEFAULT_VISIE_LOOPBAANADVISEUR_MODEL } from './constants';
import {
  draftFromGeneratedBatch,
  type VisieLaFunctieDraft,
} from './draft';
import {
  assessFunctieQuality,
  buildRegenerateFeedbackMessage,
  buildRepairFeedbackMessage,
  extractAdExclusionPhrases,
} from './functie-quality';
import {
  VISIE_LOOPBAANADVISEUR_CONTENT_PROMPT,
  buildVisieLoopbaanadviseurContextMessage,
} from './prompt';
import {
  VISIE_LOOPBAANADVISEUR_SUGGESTION_JSON_SCHEMA,
  parseVisieLoopbaanadviseurSuggestionResult,
  type VisieLoopbaanadviseurContentResult,
  type VisieLoopbaanFunctie,
} from './schema';

const MAX_UPLOAD_BYTES = 45 * 1024 * 1024;

export type EmployeeDoc = {
  type: string | null;
  url: string | null;
  uploaded_at?: string | null;
};

type DocCategory = 'belastbaarheid' | 'ad' | 'intake';

const CATEGORY_PRIORITY: Record<DocCategory, number> = {
  belastbaarheid: 1,
  ad: 2,
  intake: 3,
};

export function getVisieLoopbaanadviseurDocCategory(
  type: string | null | undefined
): DocCategory | null {
  const t = (type || '').toLowerCase();
  if (
    t.includes('fml') ||
    t.includes('izp') ||
    t.includes('lab') ||
    t.includes('functiemogelijkhedenlijst') ||
    t.includes('inzetbaarheidsprofiel') ||
    t.includes('lijst arbeidsmogelijkheden')
  ) {
    return 'belastbaarheid';
  }
  if (t.includes('ad_rapport') || t.includes('ad_rapportage') || t.includes('arbeidsdeskundig')) {
    return 'ad';
  }
  if (t.includes('intakeformulier') || t.includes('intake-formulier') || t.includes('intake')) {
    return 'intake';
  }
  return null;
}

export function filterVisieLoopbaanadviseurDocs(
  docs: EmployeeDoc[],
  options?: { excludeAd?: boolean }
): EmployeeDoc[] {
  let filtered = docs
    .map((doc) => ({
      doc,
      category: getVisieLoopbaanadviseurDocCategory(doc.type),
    }))
    .filter((entry): entry is { doc: EmployeeDoc; category: DocCategory } => entry.category !== null)
    .sort((a, b) => CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category])
    .map((entry) => entry.doc);

  if (options?.excludeAd) {
    filtered = filtered.filter(
      (doc) => getVisieLoopbaanadviseurDocCategory(doc.type) !== 'ad'
    );
  }

  return filtered;
}

export function hasIntakeDoc(docs: EmployeeDoc[]): boolean {
  return docs.some((d) => getVisieLoopbaanadviseurDocCategory(d.type) === 'intake');
}

export function detectDocumentScenario(
  docs: EmployeeDoc[],
  meta?: VisieLoopbaanadviseurBuildContext['meta'] | null
): DocumentScenario {
  const categories = new Set(
    filterVisieLoopbaanadviseurDocs(docs)
      .map((d) => getVisieLoopbaanadviseurDocCategory(d.type))
      .filter((c): c is DocCategory => c != null)
  );

  const isConcept = isAdReportConcept(meta ?? undefined);
  const hasAdDoc = categories.has('ad');
  const hasFuncties = extractAdExclusionPhrases(meta?.advies_ad_passende_arbeid).length > 0;
  const hasDefinitiveAd = hasDefinitiveAdReport(meta ?? undefined) || (hasAdDoc && !isConcept);
  const hasBelastbaarheid = categories.has('belastbaarheid');

  if (isConcept) {
    return hasFuncties ? 'concept_ad_with_functies' : 'concept_ad_no_functies';
  }
  if (hasDefinitiveAd) {
    return hasFuncties ? 'ad_with_functies' : 'ad_no_functies';
  }
  if (hasBelastbaarheid) return 'belastbaarheid_only';
  return 'intake_only';
}

function getVisieLoopbaanadviseurModel(): string {
  return (
    process.env.OPENAI_VISIE_LOOPBAANADVISEUR_MODEL?.trim() ||
    DEFAULT_VISIE_LOOPBAANADVISEUR_MODEL
  );
}

function getReasoningEffort(): 'low' | 'medium' | 'high' | undefined {
  const raw = process.env.OPENAI_VISIE_LOOPBAANADVISEUR_REASONING?.trim().toLowerCase();
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return undefined;
}

async function uploadVisieLoopbaanadviseurDocs(
  openai: OpenAI,
  supabase: SupabaseClient,
  docs: EmployeeDoc[],
  options?: { excludeAd?: boolean }
): Promise<string[]> {
  const fileIds: string[] = [];
  let totalBytes = 0;

  for (const doc of filterVisieLoopbaanadviseurDocs(docs, options)) {
    if (!doc.url) continue;
    const path = extractStoragePath(doc.url);
    if (!path) continue;

    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    if (totalBytes + buffer.length > MAX_UPLOAD_BYTES) {
      console.warn('⚠️ Visie loopbaanadviseur: skipping document (combined size limit)', path);
      continue;
    }

    totalBytes += buffer.length;
    const uploadFile = buildOpenAIFile(buffer, path);
    const uploaded = await openai.files.create({
      file: uploadFile,
      purpose: 'assistants',
    });
    fileIds.push(uploaded.id);
  }

  return fileIds;
}

async function deleteUploadedFiles(openai: OpenAI, fileIds: string[]): Promise<void> {
  await Promise.all(fileIds.map((id) => openai.files.delete(id).catch(() => {})));
}

function buildApiContext(ctx: VisieLoopbaanadviseurBuildContext): Record<string, unknown> {
  const adUitsluiting = extractAdExclusionPhrases(ctx.meta.advies_ad_passende_arbeid);
  return {
    details: { gender: ctx.details.gender },
    meta: {
      fml_izp_lab_date: ctx.meta.fml_izp_lab_date,
      intake_date: ctx.meta.intake_date,
      occupational_doctor_org: ctx.meta.occupational_doctor_org,
      advies_ad_passende_arbeid: ctx.meta.advies_ad_passende_arbeid,
      zoekprofiel: ctx.meta.zoekprofiel || null,
      persoonlijk_profiel: ctx.meta.persoonlijk_profiel || null,
    },
    ad_uitsluiting_functies: adUitsluiting,
  };
}

async function callVisieLoopbaanadviseurModel(
  openai: OpenAI,
  fileIds: string[],
  contextMessage: string,
  extraMessage?: string
): Promise<VisieLoopbaanadviseurContentResult> {
  const userContent: OpenAI.Responses.ResponseInputContent[] = [
    { type: 'input_text', text: contextMessage },
    ...fileIds.map(
      (file_id): OpenAI.Responses.ResponseInputContent => ({
        type: 'input_file',
        file_id,
      })
    ),
  ];
  if (extraMessage) {
    userContent.push({ type: 'input_text', text: extraMessage });
  }

  const reasoningEffort = getReasoningEffort();
  const response = await openai.responses.create({
    model: getVisieLoopbaanadviseurModel(),
    instructions: VISIE_LOOPBAANADVISEUR_CONTENT_PROMPT,
    input: [{ role: 'user', content: userContent }],
    ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
    text: {
      format: {
        type: 'json_schema',
        name: 'visie_loopbaanadviseur_suggestions',
        strict: true,
        schema: VISIE_LOOPBAANADVISEUR_SUGGESTION_JSON_SCHEMA as Record<string, unknown>,
      },
    },
  });

  const outputText = response.output_text;
  if (!outputText) {
    throw new Error('Empty response from model');
  }

  return parseVisieLoopbaanadviseurSuggestionResult(JSON.parse(outputText) as unknown);
}

export type GenerateFunctieSuggestionsOptions = {
  kept?: VisieLoopbaanFunctie[];
  rejectedNames?: string[];
  userFeedback?: string;
  batchSize?: number;
};

export type GenerateFunctieSuggestionsResult = {
  suggestions: VisieLoopbaanFunctie[];
  qualityWarnings: string[];
};

export async function generateFunctieSuggestions(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: VisieLoopbaanadviseurBuildContext,
  docs: EmployeeDoc[],
  options: GenerateFunctieSuggestionsOptions = {}
): Promise<GenerateFunctieSuggestionsResult> {
  if (!hasIntakeDoc(docs)) {
    throw new Error('No intake document found for visie loopbaanadviseur');
  }

  if (!ctx.meta.zoekprofiel?.trim()) {
    console.warn('⚠️ Visie loopbaanadviseur: zoekprofiel ontbreekt in context');
  }

  const batchSize = options.batchSize ?? FUNCTIE_SUGGESTION_BATCH_SIZE;
  const kept = options.kept ?? [];
  const rejectedNames = options.rejectedNames ?? [];
  const keptNames = kept.map((f) => f.naam);

  const fileIds = await uploadVisieLoopbaanadviseurDocs(openai, supabase, docs);

  if (fileIds.length === 0) {
    throw new Error('No visie loopbaanadviseur files could be uploaded');
  }

  const adExclusion = extractAdExclusionPhrases(ctx.meta.advies_ad_passende_arbeid);
  const qualityExclusions = {
    adExclusionPhrases: adExclusion,
    keptNames,
    rejectedNames,
  };

  try {
    const contextMessage = buildVisieLoopbaanadviseurContextMessage(buildApiContext(ctx));
    const hasRegenerateContext =
      kept.length > 0 || rejectedNames.length > 0 || Boolean(options.userFeedback?.trim());
    const regenerateMessage = hasRegenerateContext
      ? buildRegenerateFeedbackMessage({
          kept,
          rejectedNames,
          userFeedback: options.userFeedback,
          batchSize,
        })
      : undefined;

    let content = await callVisieLoopbaanadviseurModel(
      openai,
      fileIds,
      contextMessage,
      regenerateMessage
    );
    let quality = assessFunctieQuality(content, qualityExclusions);

    if (!quality.ok) {
      console.warn(
        '⚠️ Visie loopbaanadviseur: kwaliteit onvoldoende, één reparatiepoging',
        quality.issues
      );
      const rejectedFromBatch = content.functies.map((f) => f.naam);
      const repairMessage = buildRepairFeedbackMessage(
        quality.issues,
        [...rejectedNames, ...rejectedFromBatch],
        batchSize
      );
      content = await callVisieLoopbaanadviseurModel(
        openai,
        fileIds,
        contextMessage,
        [regenerateMessage, repairMessage].filter(Boolean).join('\n\n')
      );
      quality = assessFunctieQuality(content, qualityExclusions);
      if (!quality.ok) {
        console.warn(
          '⚠️ Visie loopbaanadviseur: reparatiepoging nog steeds onvoldoende — output behouden',
          quality.issues
        );
      }
    }

    return {
      suggestions: content.functies.slice(0, batchSize),
      qualityWarnings: quality.ok ? [] : quality.issues,
    };
  } finally {
    await deleteUploadedFiles(openai, fileIds);
  }
}

/** @deprecated Prefer generateFunctieSuggestions; kept for callers that only need content. */
export async function generateVisieLoopbaanadviseurContent(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: VisieLoopbaanadviseurBuildContext,
  docs: EmployeeDoc[]
): Promise<VisieLoopbaanadviseurContentResult> {
  const result = await generateFunctieSuggestions(openai, supabase, ctx, docs);
  return { functies: result.suggestions };
}

export type VisieLoopbaanadviseurGenerateResult = VisieLoopbaanadviseurFields & {
  draft: VisieLaFunctieDraft;
  qualityWarnings: string[];
};

export async function generateVisieLoopbaanadviseur(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: VisieLoopbaanadviseurBuildContext,
  docs: EmployeeDoc[]
): Promise<VisieLoopbaanadviseurGenerateResult> {
  const scenario = detectDocumentScenario(docs, ctx.meta);
  const { suggestions, qualityWarnings } = await generateFunctieSuggestions(
    openai,
    supabase,
    ctx,
    docs
  );
  const fields = buildVisieLoopbaanadviseurFields(ctx, { functies: suggestions }, scenario);
  const draft = draftFromGeneratedBatch(suggestions, { status: 'kept', round: 1 });
  return {
    ...fields,
    draft,
    qualityWarnings,
  };
}

export type { VisieLoopbaanadviseurBuildContext, VisieLoopbaanadviseurFields };
