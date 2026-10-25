import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getDocumentExtractionModel, getDocumentExtractionReasoningEffort } from '@/lib/document-analysis/constants';
import { runStructuredMultiFileExtraction } from '@/lib/document-analysis/runStructuredExtraction';
import type { VGRAiProposal, VGRData } from '@/lib/vgr/schema';
import { collectVgrAiContext } from './collect-context';
import { VGR_AI_SECTIONS, buildVgrSectionSchema, parseVgrEnvelope, sanitizeGeneratedText, type VGRAiEnvelope, type VGRAiSectionId } from './sections';
import { VGR_STYLE_SYSTEM_PROMPT } from './style-prompt';

export type GenerateVgrSectionResult = {
  proposal: VGRAiProposal;
  envelope: VGRAiEnvelope;
  conflicts: string[];
};

/** Text-only structured call (no documents attached). */
export async function runStructuredTextOnly<T>(params: {
  openai: OpenAI;
  instructions: string;
  userMessage: string;
  schemaName: string;
  schema: Record<string, unknown>;
  parse: (raw: unknown) => T;
  model?: string;
}): Promise<T> {
  const { openai, instructions, userMessage, schemaName, schema, parse, model = getDocumentExtractionModel() } = params;
  const reasoningEffort = getDocumentExtractionReasoningEffort();
  const response = await openai.responses.create({
    model,
    instructions,
    input: [{ role: 'user', content: [{ type: 'input_text', text: userMessage }] }],
    ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
    text: { format: { type: 'json_schema', name: schemaName, strict: true, schema } },
  });
  const out = response.output_text;
  if (!out) throw new Error('Empty response from model');
  return parse(JSON.parse(out) as unknown);
}

function buildUserMessage(sectionId: VGRAiSectionId, data: VGRData, contextText: string): string {
  const def = VGR_AI_SECTIONS[sectionId];
  const fieldList = def
    .fields(data)
    .map((f) => `- ${f.key}: ${f.description}`)
    .join('\n');
  const sugg = (def.suggestions ?? []).map((f) => `- ${f.key}: ${f.description}`).join('\n');
  return [
    `OPDRACHT: schrijf het onderdeel "${def.label}" van de voortgangsrapportage.`,
    def.instructions,
    fieldList ? `Te leveren tekstvelden (fields):\n${fieldList}` : 'Er zijn geen tekstvelden te genereren voor dit onderdeel (geen interventies aangevinkt). Geef lege fields en licht dit toe in ontbrekende_informatie.',
    sugg ? `Suggesties (suggesties; de loopbaanadviseur beslist, jij vult alleen een voorstel of ""):\n${sugg}` : '',
    'Vul "bronnen" met de gebruikte documenten/contextdelen, "ontbrekende_informatie" met wat je niet kon vinden en "waarschuwingen" met tegenstrijdigheden.',
    contextText,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export async function generateVgrSection(params: {
  openai: OpenAI;
  supabase: SupabaseClient;
  employeeId: string;
  data: VGRData;
  prior: VGRData | null;
  sectionId: VGRAiSectionId;
  extraInstruction?: string;
}): Promise<GenerateVgrSectionResult> {
  const { openai, supabase, employeeId, data, prior, sectionId, extraInstruction } = params;
  const def = VGR_AI_SECTIONS[sectionId];
  const ctx = await collectVgrAiContext({ supabase, employeeId, data, prior, sectionId, extraInstruction });
  const schema = buildVgrSectionSchema(def, data);
  const userMessage = buildUserMessage(sectionId, data, ctx.text);
  const schemaName = `vgr_${sectionId}`;

  const envelope: VGRAiEnvelope = ctx.files.length
    ? await runStructuredMultiFileExtraction({
        openai,
        files: ctx.files,
        instructions: VGR_STYLE_SYSTEM_PROMPT,
        userMessage,
        schemaName,
        schema,
        parse: parseVgrEnvelope,
        logLabel: `VGR ${sectionId}`,
      })
    : await runStructuredTextOnly({
        openai,
        instructions: VGR_STYLE_SYSTEM_PROMPT,
        userMessage,
        schemaName,
        schema,
        parse: parseVgrEnvelope,
      });

  const fields = Object.fromEntries(Object.entries(envelope.fields).map(([k, v]) => [k, sanitizeGeneratedText(v)]));
  const patch = def.toPatch(fields, data);

  const proposal: VGRAiProposal = {
    section_id: sectionId,
    generated_at: new Date().toISOString(),
    patch: { ...patch, __fields: fields, __suggesties: envelope.suggesties },
    evidence: [...new Set([...envelope.bronnen, ...ctx.sources])],
    notes: [...envelope.ontbrekende_informatie, ...envelope.waarschuwingen.map((w) => `Waarschuwing: ${w}`), ...ctx.conflicts.map((c) => `Dossier: ${c}`)],
    status: 'proposed',
  };

  return { proposal, envelope: { ...envelope, fields }, conflicts: ctx.conflicts };
}
