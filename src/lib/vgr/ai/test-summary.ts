import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runStructuredMultiFileExtraction } from '@/lib/document-analysis/runStructuredExtraction';
import { VGR_PERSONALITY_TRAITS } from '@/lib/vgr/content';
import { emptyPersonalityScores, newVgrId, type VGRPersonalityScores, type VGRTestSummary } from '@/lib/vgr/schema';
import { listVgrSourceDocuments, loadDocumentsAsPdfInputs } from './collect-context';
import { VGR_TEST_SUMMARY_SYSTEM_PROMPT } from './style-prompt';

export const VGR_TEST_NAMES = ['Persoonlijkheidstest', 'Beroepskeuzetest', 'Competentietest', 'Drijfverentest', 'Overig'] as const;

export type VGRTestSummaryRaw = {
  tests_present: string[];
  personality: {
    present: boolean;
    scores: Record<keyof VGRPersonalityScores, string>;
    texts: Record<keyof VGRPersonalityScores, string>;
  };
  beroepskeuze_text: string;
  competentie_text: string;
  drijfveren_text: string;
  overig_text: string;
  occupations: string[];
  warnings: string[];
};

const traitKeys = VGR_PERSONALITY_TRAITS.map((t) => t.key);

const traitObject = (desc: string) => ({
  type: 'object',
  properties: Object.fromEntries(traitKeys.map((k) => [k, { type: 'string', description: `${desc} — ${k}` }])),
  required: traitKeys,
  additionalProperties: false,
});

export const VGR_TEST_SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    tests_present: { type: 'array', items: { type: 'string', enum: [...VGR_TEST_NAMES] }, description: 'Alleen daadwerkelijk aangeleverde testen' },
    personality: {
      type: 'object',
      properties: {
        present: { type: 'boolean' },
        scores: traitObject('Exact percentage (alleen cijfers) of ""'),
        texts: traitObject('Beschrijving in derde persoon volgens lager/gemiddeld/hoger-regel of ""'),
      },
      required: ['present', 'scores', 'texts'],
      additionalProperties: false,
    },
    beroepskeuze_text: { type: 'string', description: 'Hoofdstuk "Uitslag beroepskeuzetest" of ""' },
    competentie_text: { type: 'string', description: 'Hoofdstuk "Uitslag competentietest" of ""' },
    drijfveren_text: { type: 'string', description: 'Hoofdstuk "Uitslag drijfverentest" of ""' },
    overig_text: { type: 'string', description: 'Overige testen/bijlagen of ""' },
    occupations: { type: 'array', items: { type: 'string' }, description: 'Gecombineerde voorbeeldberoepen, ontdubbeld, max 15, alleen uit de bestanden' },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['tests_present', 'personality', 'beroepskeuze_text', 'competentie_text', 'drijfveren_text', 'overig_text', 'occupations', 'warnings'],
  additionalProperties: false,
} as const;

export function parseTestSummaryRaw(raw: unknown): VGRTestSummaryRaw {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((s) => s.trim()) : []);
  const traitMap = (v: unknown) => {
    const src = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    const out = emptyPersonalityScores();
    for (const k of traitKeys) out[k] = typeof src[k] === 'string' ? (src[k] as string).trim() : '';
    return out;
  };
  const p = (o.personality && typeof o.personality === 'object' ? o.personality : {}) as Record<string, unknown>;
  return {
    tests_present: strArr(o.tests_present),
    personality: { present: Boolean(p.present), scores: traitMap(p.scores), texts: traitMap(p.texts) },
    beroepskeuze_text: typeof o.beroepskeuze_text === 'string' ? o.beroepskeuze_text.trim() : '',
    competentie_text: typeof o.competentie_text === 'string' ? o.competentie_text.trim() : '',
    drijfveren_text: typeof o.drijfveren_text === 'string' ? o.drijfveren_text.trim() : '',
    overig_text: typeof o.overig_text === 'string' ? o.overig_text.trim() : '',
    occupations: strArr(o.occupations),
    warnings: strArr(o.warnings),
  };
}

function parseScorePercent(score: string): number | null {
  const raw = String(score ?? '').replace('%', '').trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

/** 0–49 lager, 50 gemiddeld, 51–100 hoger. */
export function personalityBand(score: string): 'lager' | 'gemiddeld' | 'hoger' | null {
  const n = parseScorePercent(score);
  if (n === null) return null;
  if (n < 50) return 'lager';
  if (n === 50) return 'gemiddeld';
  return 'hoger';
}

/**
 * Source-text side from the test prompt: 0–49 uses the low-side source text,
 * 50–100 uses the high-side source text (50 is worded "gemiddeld" but still high-side).
 */
export function personalitySourceSide(score: string): 'low' | 'high' | null {
  const n = parseScorePercent(score);
  if (n === null) return null;
  return n < 50 ? 'low' : 'high';
}

/** Deterministic post-checks on the model output (never "fixes" content; reports issues). */
export function validateTestSummary(raw: VGRTestSummaryRaw): string[] {
  const issues: string[] = [];
  if (raw.personality.present) {
    for (const t of VGR_PERSONALITY_TRAITS) {
      const s = raw.personality.scores[t.key];
      const txt = raw.personality.texts[t.key];
      if (!s && txt) issues.push(`${t.label}: tekst zonder score.`);
      if (s && !/^\d{1,3}$/.test(s)) issues.push(`${t.label}: score "${s}" is geen geheel percentage.`);
      const band = personalityBand(s);
      if (band && txt) {
        const lower = txt.toLowerCase();
        if (!lower.includes(`scoort ${band}`)) issues.push(`${t.label}: tekst gebruikt niet "scoort ${band}" bij ${s}%.`);
        if (/\b(links|rechts)\b/.test(lower)) issues.push(`${t.label}: "links/rechts" gebruikt in de tekst.`);
      }
    }
  }
  if (raw.occupations.length > 15) issues.push(`Meer dan 15 beroepen (${raw.occupations.length}).`);
  const dups = raw.occupations.map((o) => o.toLowerCase()).filter((o, i, a) => a.indexOf(o) !== i);
  if (dups.length) issues.push(`Dubbele beroepen: ${[...new Set(dups)].join(', ')}.`);
  return issues;
}

export function composeTestSummaryText(raw: VGRTestSummaryRaw): string {
  const parts: string[] = [];
  if (raw.tests_present.length) {
    parts.push(`De ${raw.tests_present.filter((t) => t !== 'Overig').map((t) => t.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' en $1')} zijn onder begeleiding van ValentineZ gedaan.`);
  }
  if (raw.personality.present) {
    const lines = VGR_PERSONALITY_TRAITS.map((t) => `${t.label} ${raw.personality.scores[t.key] ? `${raw.personality.scores[t.key]}%` : '—'}`);
    parts.push(`Persoonlijkheidstest\nWerknemer heeft bij de persoonlijkheidstest de volgende scores behaald:\n${lines.join('\n')}`);
    for (const t of VGR_PERSONALITY_TRAITS) {
      const txt = raw.personality.texts[t.key];
      if (txt) parts.push(`${t.label} ${raw.personality.scores[t.key]}%\n${txt}`);
    }
  }
  if (raw.beroepskeuze_text) parts.push(`Uitslag beroepskeuzetest\n${raw.beroepskeuze_text}`);
  if (raw.competentie_text) parts.push(`Uitslag competentietest\n${raw.competentie_text}`);
  if (raw.drijfveren_text) parts.push(`Uitslag drijfverentest\n${raw.drijfveren_text}`);
  if (raw.overig_text) parts.push(raw.overig_text);
  if (raw.occupations.length) {
    const aspects = ['persoonlijkheidseigenschappen'];
    if (raw.tests_present.includes('Beroepskeuzetest')) aspects.push('interesses');
    if (raw.tests_present.includes('Competentietest')) aspects.push('competenties');
    if (raw.tests_present.includes('Drijfverentest')) aspects.push('drijfveren');
    const aspectText = aspects.join(', ').replace(/, ([^,]*)$/, ' en $1');
    parts.push(
      `Door de resultaten die verkregen zijn door de testen, hebben we voorbeeldberoepen geïdentificeerd die het beste aansluiten op de ${aspectText} van werknemer. De voorbeeldberoepen zijn:\n${raw.occupations.join('\n')}`
    );
  }
  return parts.join('\n\n');
}

export async function generateVgrTestSummary(params: {
  openai: OpenAI;
  supabase: SupabaseClient;
  employeeId: string;
  documentIds: string[];
}): Promise<{ summary: VGRTestSummary; raw: VGRTestSummaryRaw; issues: string[] } | { error: string }> {
  const { openai, supabase, employeeId, documentIds } = params;
  const docs = await listVgrSourceDocuments(supabase, employeeId);
  const chosen = docs.filter((d) => documentIds.includes(d.id));
  if (!chosen.length) return { error: 'Geen testrapporten geselecteerd.' };
  const { files, labels } = await loadDocumentsAsPdfInputs(supabase, chosen);
  if (!files.length) return { error: 'Kon de geselecteerde testrapporten niet lezen.' };

  const raw = await runStructuredMultiFileExtraction({
    openai,
    files,
    instructions: VGR_TEST_SUMMARY_SYSTEM_PROMPT,
    userMessage:
      'Zet de aangeleverde testrapporten om naar de gestructureerde samenvatting. Alleen aanwezige testen; percentages exact; derde persoon ("werknemer"); beroepen gebundeld en ontdubbeld (max 15, nooit aanvullen).',
    schemaName: 'vgr_test_summary',
    schema: VGR_TEST_SUMMARY_SCHEMA as unknown as Record<string, unknown>,
    parse: parseTestSummaryRaw,
    logLabel: 'VGR test summary',
  });

  const issues = validateTestSummary(raw);
  const summary: VGRTestSummary = {
    id: newVgrId('ts'),
    generated_at: new Date().toISOString(),
    source_document_ids: chosen.map((d) => d.id),
    tests_present: raw.tests_present,
    summary_text: composeTestSummaryText(raw),
    personality_scores: raw.personality.present ? raw.personality.scores : null,
    occupations: raw.occupations.slice(0, 15),
    status: 'draft',
  };
  void labels;
  return { summary, raw, issues };
}
