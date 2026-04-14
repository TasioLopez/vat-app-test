import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { normalizeCvPayload } from '@/lib/cv/normalize';
import type { CvModel } from '@/types/cv';
import { seedCvModelFromEmployee } from '@/lib/cv/seed';
import { getIntakeExcerptForEmployee } from '@/lib/cv/intakeExcerpt';

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const dynamic = 'force-dynamic';

function stripCitations(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[\d+:\d+\/[^\]]+\.pdf\]/gi, '')
    .replace(/【[^】]+】/g, '')
    .replace(/\[\d+:\d+[^\]]*\]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

export async function GET(req: NextRequest) {
  const employeeId = req.nextUrl.searchParams.get('employeeId');
  const cvId = req.nextUrl.searchParams.get('cvId');
  const mode = req.nextUrl.searchParams.get('mode') === 'polish' ? 'polish' : 'fill';

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

  const current = normalizeCvPayload(cvRow.payload_json);

  const { data: employee } = await service
    .from('employees')
    .select('first_name, last_name, email')
    .eq('id', employeeId)
    .maybeSingle();

  const { data: details } = await service.from('employee_details').select('*').eq('employee_id', employeeId).maybeSingle();

  const seeded = seedCvModelFromEmployee(employee ?? {}, details ?? null);

  let intakeExcerpt: string | null = null;
  try {
    intakeExcerpt = await getIntakeExcerptForEmployee(service, employeeId);
  } catch {
    intakeExcerpt = null;
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      success: false,
      error: 'OPENAI_API_KEY is not configured',
    });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const intakeBlock = intakeExcerpt
    ? `

INTAKEFORMULIER (vrije tekst, uit dossier; gebruik alleen ter aanvulling waar het aansluit op basisgegevens — geen nieuwe feiten verzinnen):
${intakeExcerpt}`
    : '';

  const system = `Je bent een Nederlandse CV-schrijver. Je antwoordt ALLEEN met geldige JSON volgens het schema (CvModel).
Schema keys: personal { fullName, title, email, phone, location, dateOfBirth? }, profile (string), experience[], education[], skills[], languages[], interests[], extra (string).
Arrays: experience heeft { id, role, organization?, period?, description? }; education { id, institution, diploma?, period?, description? }; skills/interests { id, text }; languages { id, language, level? }.
Behoud bestaande "id" velden op lijsten; wijzig inhoud van items waar nodig. Voeg nieuwe items toe met tijdelijke id-strings indien nodig.
Schrijf professioneel, in het Nederlands. Geen markdown buiten JSON.

Kwaliteitseisen per veld:
- profile: 2–4 korte zinnen, professioneel, geen opsomming van velden die elders al staan (herhaal opleiding niet als die al onder Opleiding staat).
- experience: per item een zinvolle description (taken/resultaten) in de tegenwoordige tijd waar passend; vul organization/period als die uit basisgegevens of intake blijken.
- education: vul diploma en/of description waar leeg met relevante toelichting (niet alleen de instelling herhalen).
- extra: compacte alinea over beschikbaarheid/mobiliteit (rijbewijs, vervoer, uren) zonder overbodige herhaling van labels.
- skills/languages: feitelijk; alleen verfijnen of aanvullen waar dun.`;

  const userPrompt =
    mode === 'fill'
      ? `Modus: VULLEN. Vul ALLEEN lege of schaarse onderdelen aan. Behoud reeds goede, inhoudelijke teksten.
Gebruik het intakeformulier alleen om ontbrekende context in te vullen als dat daar ondersteund wordt.
Basisgegevens (bron): ${JSON.stringify({ employee, details })}
Huidige CV JSON: ${JSON.stringify(current)}
Suggestie-seed van werknemerprofiel: ${JSON.stringify(seeded)}${intakeBlock}
Return het VOLLEDIGE bijgewerkte CvModel als JSON.`
      : `Modus: POLISH. Herschrijf voor een professionele CV-toon: profile, experience[].description, education[].description, extra, en verfijn waar nodig skills/talen.
Behoud feitelijke kern (functies, jaren, diploma-namen) tenzij intake/basisgegevens duidelijk betere formulering geven.
Basisgegevens: ${JSON.stringify({ employee, details })}
Huidige CV JSON: ${JSON.stringify(current)}${intakeBlock}
Return het VOLLEDIGE CvModel als JSON.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ success: false, error: 'Empty AI response' }, { status: 500 });
    }

    const parsed = JSON.parse(raw) as unknown;
    const payload = normalizeCvPayload(parsed) as CvModel;

    // strip citations in narrative fields
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

    return NextResponse.json({
      success: true,
      data: { payload },
    });
  } catch (e: unknown) {
    console.error('autofill-cv', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'AI failed' },
      { status: 500 }
    );
  }
}
