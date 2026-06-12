import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getActiveCvModel, normalizeCvModel, normalizeCvPayload } from '@/lib/cv/normalize';
import type { CvLocale, CvModel } from '@/types/cv';
import { coerceCvTemplateKey } from '@/types/cv';
import { seedCvModelFromEmployee } from '@/lib/cv/seed';
import { analyzeCvFactsForEmployee } from '@/lib/cv/docAnalysis';
import { evaluateCvQuality } from '@/lib/cv/qualityGate';
import {
  cvComposeSystemPrompt,
  cvComposeUserPrompt,
  cvGenerateEnUserPrompt,
  cvRewriteUserPrompt,
} from '@/lib/cv/prompts';
import { emptyCvFacts } from '@/lib/cv/facts';

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const dynamic = 'force-dynamic';

function preserveCvPhotoFields(payload: CvModel, source: CvModel) {
  if (!payload.personal.photoStoragePath?.trim() && source.personal.photoStoragePath?.trim()) {
    payload.personal.photoStoragePath = source.personal.photoStoragePath;
  }
  if (!payload.personal.photoCrop && source.personal.photoCrop) {
    payload.personal.photoCrop = source.personal.photoCrop;
  }
}

function stripCitations(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[\d+:\d+\/[^\]]+\.pdf\]/gi, '')
    .replace(/【[^】]+】/g, '')
    .replace(/\[\d+:\d+[^\]]*\]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function sanitizeCvModel(payload: CvModel, source: CvModel): CvModel {
  preserveCvPhotoFields(payload, source);
  payload.profile = stripCitations(payload.profile);
  payload.extra = stripCitations(payload.extra);
  payload.experience = payload.experience.map((e) => ({
    ...e,
    description: e.description ? stripCitations(e.description) : e.description,
  }));
  payload.education = payload.education.map((ed) => ({
    ...ed,
    description: ed.description ? stripCitations(ed.description) : ed.description,
    diploma: ed.diploma ? stripCitations(ed.diploma) : ed.diploma,
  }));
  return payload;
}

export async function GET(req: NextRequest) {
  const employeeId = req.nextUrl.searchParams.get('employeeId');
  const cvId = req.nextUrl.searchParams.get('cvId');
  const modeParam = req.nextUrl.searchParams.get('mode');
  const mode =
    modeParam === 'polish' ? 'polish' : modeParam === 'generate_en' ? 'generate_en' : 'fill';
  const locale: CvLocale = req.nextUrl.searchParams.get('locale') === 'en' ? 'en' : 'nl';

  if (!employeeId || !cvId) {
    return NextResponse.json({ success: false, error: 'employeeId and cvId required' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => cookieStore.get(key)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { data: cvRow, error: cvErr } = await auth
    .from('cv_documents')
    .select('*')
    .eq('id', cvId)
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (cvErr || !cvRow) {
    return NextResponse.json({ success: false, error: 'CV not found' }, { status: 404 });
  }

  const docPayload = normalizeCvPayload(
    cvRow.payload_json,
    coerceCvTemplateKey(cvRow.template_key)
  );
  const current = getActiveCvModel(docPayload);

  const { data: employee } = await service
    .from('employees')
    .select('first_name, last_name, email')
    .eq('id', employeeId)
    .maybeSingle();

  const { data: details } = await service.from('employee_details').select('*').eq('employee_id', employeeId).maybeSingle();

  const seeded = seedCvModelFromEmployee(employee ?? {}, details ?? null);

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      success: false,
      error: 'OPENAI_API_KEY is not configured',
    });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let facts = emptyCvFacts();
  try {
    facts = await analyzeCvFactsForEmployee(service, openai, employeeId);
    console.info('autofill-cv: facts analyzed', facts.evidence);
  } catch (error) {
    console.warn('autofill-cv facts analysis failed; continuing with base context', error);
  }

  try {
    if (mode === 'generate_en') {
      const nlModel = docPayload.content.nl;
      const compose = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: cvComposeSystemPrompt('en') },
          { role: 'user', content: cvGenerateEnUserPrompt({ nlModel, facts }) },
        ],
        temperature: 0.35,
      });
      const raw = compose.choices[0]?.message?.content;
      if (!raw) {
        return NextResponse.json({ success: false, error: 'Empty AI response' }, { status: 500 });
      }
      let payload = normalizeCvModel(JSON.parse(raw));
      payload = sanitizeCvModel(payload, current);
      return NextResponse.json({
        success: true,
        data: { payload, locale: 'en', quality: evaluateCvQuality(payload, facts) },
      });
    }

    const compose = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: cvComposeSystemPrompt(locale) },
        {
          role: 'user',
          content: cvComposeUserPrompt({
            mode,
            current,
            seeded,
            employee,
            details,
            facts,
          }),
        },
      ],
      temperature: mode === 'fill' ? 0.5 : 0.35,
    });

    const rawComposed = compose.choices[0]?.message?.content;
    if (!rawComposed) {
      return NextResponse.json({ success: false, error: 'Empty AI response' }, { status: 500 });
    }

    let payload = normalizeCvModel(JSON.parse(rawComposed) as unknown);
    payload = sanitizeCvModel(payload, current);

    const quality = evaluateCvQuality(payload, facts);
    console.info('autofill-cv: first-pass quality', quality.metrics);
    if (!quality.pass) {
      try {
        const rewrite = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          temperature: 0.2,
          messages: [
            { role: 'system', content: cvComposeSystemPrompt(locale) },
            {
              role: 'user',
              content: cvRewriteUserPrompt({
                current: payload,
                deficits: quality.deficits,
                facts,
              }),
            },
          ],
        });
        const rewriteRaw = rewrite.choices[0]?.message?.content;
        if (rewriteRaw) {
          const rewritten = sanitizeCvModel(
            normalizeCvModel(JSON.parse(rewriteRaw) as unknown),
            current
          );
          payload = rewritten;
        }
      } catch (rewriteErr) {
        console.warn('autofill-cv rewrite pass failed, returning first pass', rewriteErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        payload,
        locale,
        quality: evaluateCvQuality(payload, facts),
        facts_evidence: facts.evidence,
      },
    });
  } catch (e: unknown) {
    console.error('autofill-cv', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'AI failed' },
      { status: 500 }
    );
  }
}
