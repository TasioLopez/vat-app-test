import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { parseDocx } from '@/lib/parse-docx';
import {
  cleanText,
  cleanTextList,
  dedupeEducation,
  dedupeExperience,
  dedupeLanguages,
  dedupeStrings,
  emptyCvFacts,
  normalizeFactEducation,
  normalizeFactExperience,
  normalizeFactLanguages,
  type CvDocKind,
  type CvFacts,
} from '@/lib/cv/facts';
import { cvDocExtractionSystemPrompt, cvDocExtractionUserPrompt } from '@/lib/cv/prompts';

type DocRow = {
  id: string;
  type: string | null;
  name: string | null;
  url: string | null;
  uploaded_at: string | null;
};

const MAX_DOC_TEXT_CHARS = 14_000;

function extractStoragePath(url: string): string | null {
  const m = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (m?.[1]) return m[1];
  if (url.startsWith('documents/')) return url.slice('documents/'.length);
  if (!url.includes('://') && !url.includes('object/')) return url;
  return null;
}

function detectExt(path: string, docName: string | null | undefined): 'pdf' | 'docx' | 'doc' | 'other' {
  const p = path.toLowerCase();
  const n = (docName || '').toLowerCase();
  if (p.endsWith('.pdf') || n.endsWith('.pdf')) return 'pdf';
  if (p.endsWith('.docx') || n.endsWith('.docx')) return 'docx';
  if (p.endsWith('.doc') || n.endsWith('.doc')) return 'doc';
  return 'other';
}

function classifyDocKind(type: string | null | undefined): CvDocKind {
  const t = (type || '').toLowerCase();
  if (t.includes('intake')) return 'intake';
  if (t.includes('ad') || t.includes('arbeidsdeskundig')) return 'ad';
  if (t.includes('vgr') || t.includes('voortgang')) return 'vgr';
  return 'other';
}

async function bufferToPlainText(buffer: Buffer, kind: 'pdf' | 'docx' | 'doc' | 'other'): Promise<string> {
  if (kind === 'docx' || kind === 'doc') {
    try {
      return await parseDocx(buffer);
    } catch {
      return '';
    }
  }
  if (kind === 'pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      return typeof data?.text === 'string' ? data.text : '';
    } catch {
      return '';
    }
  }
  return '';
}

function sanitizeDocExtraction(parsed: unknown): Omit<CvFacts, 'evidence'> {
  const raw = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  const personalRaw =
    raw.personal && typeof raw.personal === 'object' ? (raw.personal as Record<string, unknown>) : {};
  const mobilityRaw =
    raw.mobility && typeof raw.mobility === 'object' ? (raw.mobility as Record<string, unknown>) : {};

  return {
    personal: {
      title: cleanText(personalRaw.title),
      phone: cleanText(personalRaw.phone),
      email: cleanText(personalRaw.email),
      location: cleanText(personalRaw.location),
      dateOfBirth: cleanText(personalRaw.dateOfBirth) || undefined,
    },
    profileHints: cleanTextList(raw.profileHints),
    experienceFacts: normalizeFactExperience(raw.experienceFacts),
    educationFacts: normalizeFactEducation(raw.educationFacts),
    skills: cleanTextList(raw.skills),
    languages: normalizeFactLanguages(raw.languages),
    interestsHints: cleanTextList(raw.interestsHints),
    extraHints: cleanTextList(raw.extraHints),
    mobility: {
      driversLicense:
        typeof mobilityRaw.driversLicense === 'boolean' ? mobilityRaw.driversLicense : undefined,
      licenseTypes: cleanTextList(mobilityRaw.licenseTypes),
      transport: cleanTextList(mobilityRaw.transport),
      contractHours: cleanText(mobilityRaw.contractHours) || undefined,
    },
  };
}

async function extractFactsFromDocument(
  openai: OpenAI,
  docKind: CvDocKind,
  text: string
): Promise<Omit<CvFacts, 'evidence'>> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.15,
    messages: [
      { role: 'system', content: cvDocExtractionSystemPrompt(docKind) },
      { role: 'user', content: cvDocExtractionUserPrompt(docKind, text) },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return sanitizeDocExtraction({});
  }
  try {
    const parsed = JSON.parse(content) as unknown;
    return sanitizeDocExtraction(parsed);
  } catch {
    return sanitizeDocExtraction({});
  }
}

function mergeFactsByPriority(
  chunks: Array<{ kind: CvDocKind; facts: Omit<CvFacts, 'evidence'> }>
): Omit<CvFacts, 'evidence'> {
  const out = sanitizeDocExtraction({});

  const pickScalar = (kinds: CvDocKind[], getter: (facts: Omit<CvFacts, 'evidence'>) => string | undefined) => {
    for (const k of kinds) {
      const row = chunks.find((c) => c.kind === k);
      const value = row ? getter(row.facts) : undefined;
      if (value && value.trim()) return value.trim();
    }
    return undefined;
  };

  out.personal.title = pickScalar(['ad', 'vgr', 'intake', 'other'], (f) => f.personal.title);
  out.personal.phone = pickScalar(['intake', 'other', 'ad', 'vgr'], (f) => f.personal.phone);
  out.personal.email = pickScalar(['intake', 'other', 'ad', 'vgr'], (f) => f.personal.email);
  out.personal.location = pickScalar(['intake', 'vgr', 'other', 'ad'], (f) => f.personal.location);
  out.personal.dateOfBirth = pickScalar(['intake', 'ad', 'vgr', 'other'], (f) => f.personal.dateOfBirth);

  const byKind = (k: CvDocKind) => chunks.find((c) => c.kind === k)?.facts;
  const orderedKinds: CvDocKind[] = ['ad', 'vgr', 'intake', 'other'];
  const orderedForEdu: CvDocKind[] = ['intake', 'vgr', 'ad', 'other'];

  out.profileHints = dedupeStrings(
    orderedKinds.flatMap((k) => byKind(k)?.profileHints ?? [])
  ).slice(0, 16);

  out.experienceFacts = dedupeExperience(
    orderedKinds.flatMap((k) => byKind(k)?.experienceFacts ?? [])
  ).slice(0, 8);

  out.educationFacts = dedupeEducation(
    orderedForEdu.flatMap((k) => byKind(k)?.educationFacts ?? [])
  ).slice(0, 8);

  out.skills = dedupeStrings(
    orderedKinds.flatMap((k) => byKind(k)?.skills ?? [])
  ).slice(0, 20);

  out.languages = dedupeLanguages(
    orderedKinds.flatMap((k) => byKind(k)?.languages ?? [])
  ).slice(0, 10);

  out.interestsHints = dedupeStrings(
    (['vgr', 'intake', 'other', 'ad'] as CvDocKind[]).flatMap((k) => byKind(k)?.interestsHints ?? [])
  ).slice(0, 16);

  out.extraHints = dedupeStrings(
    orderedKinds.flatMap((k) => byKind(k)?.extraHints ?? [])
  ).slice(0, 20);

  const mobilityByKind = (k: CvDocKind) => byKind(k)?.mobility;
  const contractHours =
    mobilityByKind('intake')?.contractHours ||
    mobilityByKind('ad')?.contractHours ||
    mobilityByKind('vgr')?.contractHours ||
    mobilityByKind('other')?.contractHours;
  out.mobility.contractHours = contractHours;

  out.mobility.driversLicense =
    mobilityByKind('intake')?.driversLicense ??
    mobilityByKind('ad')?.driversLicense ??
    mobilityByKind('vgr')?.driversLicense ??
    mobilityByKind('other')?.driversLicense;

  out.mobility.licenseTypes = dedupeStrings(
    (['intake', 'ad', 'vgr', 'other'] as CvDocKind[]).flatMap((k) => mobilityByKind(k)?.licenseTypes ?? [])
  );

  out.mobility.transport = dedupeStrings(
    (['intake', 'ad', 'vgr', 'other'] as CvDocKind[]).flatMap((k) => mobilityByKind(k)?.transport ?? [])
  );

  return out;
}

export async function analyzeCvFactsForEmployee(
  supabase: SupabaseClient,
  openai: OpenAI,
  employeeId: string
): Promise<CvFacts> {
  const base = emptyCvFacts();
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, type, name, url, uploaded_at')
    .eq('employee_id', employeeId)
    .order('uploaded_at', { ascending: false });

  if (error || !docs?.length) {
    return base;
  }

  const rows = docs as DocRow[];
  const extractedByDoc: Array<{ kind: CvDocKind; facts: Omit<CvFacts, 'evidence'> }> = [];

  for (const doc of rows) {
    const kind = classifyDocKind(doc.type);
    base.evidence.docsProcessed += 1;
    base.evidence.byKind[kind] += 1;

    if (!doc.url || typeof doc.url !== 'string') continue;
    const path = extractStoragePath(doc.url);
    if (!path) continue;

    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = detectExt(path, doc.name);
    let text = await bufferToPlainText(buffer, ext);
    text = text.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    base.evidence.docsWithText += 1;

    if (text.length > MAX_DOC_TEXT_CHARS) {
      text = `${text.slice(0, MAX_DOC_TEXT_CHARS)}…`;
    }

    const facts = await extractFactsFromDocument(openai, kind, text);
    extractedByDoc.push({ kind, facts });
  }

  const merged = mergeFactsByPriority(extractedByDoc);
  return {
    ...merged,
    evidence: base.evidence,
  };
}
