import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import {
  ADVIES_NB_NO_REPORT,
  generateAdAdvies,
  GENERATION_FALLBACK,
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
      .select('has_ad_report, ad_report_date')
      .eq('employee_id', employeeId)
      .single();

    if (meta?.has_ad_report === false) {
      const advies_ad_passende_arbeid = ADVIES_NB_NO_REPORT;
      await supabase.from('tp_meta').upsert(
        { employee_id: employeeId, advies_ad_passende_arbeid } as any,
        { onConflict: 'employee_id' }
      );
      return NextResponse.json({
        details: { advies_ad_passende_arbeid },
        autofilled_fields: ['advies_ad_passende_arbeid'],
      });
    }

    const { data: docs } = await supabase
      .from('documents')
      .select('type, url, uploaded_at')
      .eq('employee_id', employeeId)
      .order('uploaded_at', { ascending: false });

    if (!docs?.length) {
      return NextResponse.json(
        { error: 'Geen AD-rapport documenten gevonden', details: {} },
        { status: 200 }
      );
    }

    const ctx = { meta: meta ?? {} };
    let advies_ad_passende_arbeid: string;

    try {
      const result = await generateAdAdvies(openai, supabase, ctx, docs);
      advies_ad_passende_arbeid = result.advies_ad_passende_arbeid;
      if (!advies_ad_passende_arbeid.trim()) {
        return NextResponse.json(
          { error: 'Geen AD-advies gevonden', details: {} },
          { status: 200 }
        );
      }
    } catch (error) {
      console.error('❌ AD advies generation failed:', error);
      advies_ad_passende_arbeid = GENERATION_FALLBACK;
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
