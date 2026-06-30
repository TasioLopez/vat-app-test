import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import {
  filterVisieLoopbaanadviseurDocs,
  generateVisieLoopbaanadviseur,
  GENERATION_FALLBACK,
  hasIntakeDoc,
} from '@/lib/tp/visie-loopbaanadviseur';

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

    const { data: details } = await supabase
      .from('employee_details')
      .select('gender')
      .eq('employee_id', employeeId)
      .single();

    const { data: meta } = await supabase
      .from('tp_meta')
      .select(
        'fml_izp_lab_date, intake_date, occupational_doctor_org, advies_ad_passende_arbeid, zoekprofiel, persoonlijk_profiel, has_ad_report'
      )
      .eq('employee_id', employeeId)
      .single();

    const { data: docs } = await supabase
      .from('documents')
      .select('type, url, uploaded_at')
      .eq('employee_id', employeeId)
      .order('uploaded_at', { ascending: false });

    if (!docs?.length) {
      return NextResponse.json({ error: 'Geen documenten gevonden', details: {} }, { status: 200 });
    }

    const relevantDocs = filterVisieLoopbaanadviseurDocs(docs);
    if (!hasIntakeDoc(docs)) {
      return NextResponse.json(
        { error: 'Geen intakeformulier gevonden (verplicht voor visie loopbaanadviseur)', details: {} },
        { status: 200 }
      );
    }

    if (relevantDocs.length === 0) {
      return NextResponse.json(
        { error: 'Geen relevante documenten gevonden', details: {} },
        { status: 200 }
      );
    }

    const ctx = {
      details: details ?? {},
      meta: meta ?? {},
    };

    let visie_loopbaanadviseur: string;

    try {
      const result = await generateVisieLoopbaanadviseur(openai, supabase, ctx, docs);
      visie_loopbaanadviseur = result.visie_loopbaanadviseur;
      if (!visie_loopbaanadviseur.trim()) {
        return NextResponse.json(
          { error: 'Geen visie loopbaanadviseur informatie gevonden', details: {} },
          { status: 200 }
        );
      }
    } catch (error) {
      console.error('❌ Visie loopbaanadviseur generation failed:', error);
      visie_loopbaanadviseur = GENERATION_FALLBACK;
    }

    await supabase.from('tp_meta').upsert(
      { employee_id: employeeId, visie_loopbaanadviseur } as any,
      { onConflict: 'employee_id' }
    );

    return NextResponse.json({
      details: { visie_loopbaanadviseur },
      autofilled_fields: ['visie_loopbaanadviseur'],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ visie-adviseur route error:', err);
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 });
  }
}
