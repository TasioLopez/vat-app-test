import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import {
  ADVIES_NB_NO_REPORT,
  generateAdAdvies,
  GENERATION_FALLBACK,
  parseAdAdvies,
} from '@/lib/tp/ad-advies';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
    }

    const { data: meta } = await supabase
      .from('tp_meta')
      .select('has_ad_report, ad_report_date, ad_report_concept, occupational_doctor_name')
      .eq('employee_id', employeeId)
      .single();

    const { data: docs } = await supabase
      .from('documents')
      .select('type, url, uploaded_at')
      .eq('employee_id', employeeId)
      .order('uploaded_at', { ascending: false });

    if (!docs?.length) {
      return NextResponse.json(
        { error: 'Geen intakeformulier gevonden', details: {} },
        { status: 200 }
      );
    }

    const ctx = { meta: meta ?? {} };
    let advies_ad_passende_arbeid: string;

    try {
      const result = await generateAdAdvies(openai, supabase, ctx, docs);
      advies_ad_passende_arbeid = result.advies_ad_passende_arbeid;
      const { citaat } = parseAdAdvies(advies_ad_passende_arbeid);

      if (!citaat.trim()) {
        advies_ad_passende_arbeid =
          meta?.has_ad_report === false ? ADVIES_NB_NO_REPORT : '';
      }
    } catch (error) {
      console.error('❌ AD advies generation failed:', error);
      advies_ad_passende_arbeid =
        meta?.has_ad_report === false ? ADVIES_NB_NO_REPORT : GENERATION_FALLBACK;
    }

    if (!advies_ad_passende_arbeid.trim()) {
      return NextResponse.json(
        { error: 'Geen advies in intake Sectie 7 gevonden', details: {} },
        { status: 200 }
      );
    }

    await supabase.from('tp_meta').upsert(
      { employee_id: employeeId, advies_ad_passende_arbeid } as any,
      { onConflict: 'employee_id' }
    );

    return NextResponse.json({
      details: { advies_ad_passende_arbeid },
      autofilled_fields: ['advies_ad_passende_arbeid'],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ ad-advies-passende-arbeid route error:', err);
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 });
  }
}
