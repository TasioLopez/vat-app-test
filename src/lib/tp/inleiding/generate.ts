import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractStoragePath } from '@/lib/document-analysis/storage';
import { buildOpenAIFile } from '@/lib/openai-file-upload';
import type { ReferentRow } from '@/lib/referents';
import {
  buildInleidingFields,
  stripCitations,
  type InleidingBuildContext,
  type InleidingFields,
} from './build-fields';
import { DEFAULT_INLEIDING_MODEL } from './constants';
import { INLEIDING_CONTENT_PROMPT, buildInleidingContextMessage } from './prompt';
import {
  INLEIDING_CONTENT_JSON_SCHEMA,
  parseInleidingContentResult,
  type InleidingContentResult,
} from './schema';

const MAX_UPLOAD_BYTES = 45 * 1024 * 1024;

const DOC_PRIORITY: Record<string, number> = {
  intakeformulier: 1,
  'intake-formulier': 1,
  intake: 1,
  ad_rapportage: 2,
  ad_rapport: 2,
  fml: 3,
  izp: 3,
  lab: 3,
};

type EmployeeDoc = {
  type: string | null;
  url: string | null;
  uploaded_at?: string | null;
};

function docPriority(type: string | null | undefined): number {
  const t = (type || '').toLowerCase();
  for (const [key, priority] of Object.entries(DOC_PRIORITY)) {
    if (t.includes(key)) return priority;
  }
  return 5;
}

function sortDocs(docs: EmployeeDoc[]): EmployeeDoc[] {
  return [...docs].sort((a, b) => docPriority(a.type) - docPriority(b.type));
}

function getInleidingModel(): string {
  return process.env.OPENAI_INLEIDING_MODEL?.trim() || DEFAULT_INLEIDING_MODEL;
}

function getReasoningEffort(): 'low' | 'medium' | 'high' | undefined {
  const raw = process.env.OPENAI_INLEIDING_REASONING?.trim().toLowerCase();
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return undefined;
}

async function uploadPriorityDocs(
  openai: OpenAI,
  supabase: SupabaseClient,
  docs: EmployeeDoc[]
): Promise<string[]> {
  const fileIds: string[] = [];
  let totalBytes = 0;

  for (const doc of sortDocs(docs)) {
    if (!doc.url) continue;
    const path = extractStoragePath(doc.url);
    if (!path) continue;

    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    if (totalBytes + buffer.length > MAX_UPLOAD_BYTES) {
      console.warn('⚠️ Inleiding: skipping document (combined size limit)', path);
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

function buildApiContext(ctx: InleidingBuildContext): Record<string, unknown> {
  const ref = ctx.referent;
  return {
    has_ad_report: ctx.meta.has_ad_report ?? false,
    ad_report_concept: ctx.meta.ad_report_concept ?? false,
    employee: {
      first_name: ctx.employee.first_name,
      last_name: ctx.employee.last_name,
    },
    details: {
      gender: ctx.details.gender,
      current_job: ctx.details.current_job,
      contract_hours: ctx.details.contract_hours,
      date_of_birth: ctx.details.date_of_birth,
    },
    meta: {
      intake_date: ctx.meta.intake_date,
      first_sick_day: ctx.meta.first_sick_day,
      ad_report_date: ctx.meta.ad_report_date,
      occupational_doctor_name: ctx.meta.occupational_doctor_name,
    },
    client: { name: ctx.client.name },
    referent: ref
      ? {
          name: [ref.first_name, ref.last_name].filter(Boolean).join(' '),
          function: ref.referent_function,
          gender: ref.gender,
        }
      : null,
  };
}

export async function generateInleidingContent(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: InleidingBuildContext,
  docs: EmployeeDoc[]
): Promise<InleidingContentResult> {
  const fileIds = await uploadPriorityDocs(openai, supabase, docs);

  if (fileIds.length === 0) {
    throw new Error('No files could be uploaded');
  }

  try {
    const contextMessage = buildInleidingContextMessage(buildApiContext(ctx));
    const userContent: OpenAI.Responses.ResponseInputContent[] = [
      { type: 'input_text', text: contextMessage },
      ...fileIds.map(
        (file_id): OpenAI.Responses.ResponseInputContent => ({
          type: 'input_file',
          file_id,
        })
      ),
    ];

    const reasoningEffort = getReasoningEffort();
    const response = await openai.responses.create({
      model: getInleidingModel(),
      instructions: INLEIDING_CONTENT_PROMPT,
      input: [{ role: 'user', content: userContent }],
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
      text: {
        format: {
          type: 'json_schema',
          name: 'inleiding_content',
          strict: true,
          schema: INLEIDING_CONTENT_JSON_SCHEMA as Record<string, unknown>,
        },
      },
    });

    const outputText = response.output_text;
    if (!outputText) {
      throw new Error('Empty response from model');
    }

    const parsed = JSON.parse(outputText) as unknown;
    const content = parseInleidingContentResult(parsed);
    if (content.ad_quote) {
      content.ad_quote = stripCitations(content.ad_quote);
    }
    return content;
  } finally {
    await deleteUploadedFiles(openai, fileIds);
  }
}

export async function generateInleiding(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: InleidingBuildContext,
  docs: EmployeeDoc[]
): Promise<InleidingFields> {
  const content = await generateInleidingContent(openai, supabase, ctx, docs);
  return buildInleidingFields(ctx, content);
}

export type { InleidingBuildContext, InleidingFields, ReferentRow };
