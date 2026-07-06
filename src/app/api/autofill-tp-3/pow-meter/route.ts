import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeAutofillAccess } from '@/lib/auth/autofill-access';
import {
  buildPowMeterContextFromMeta,
  filterPowMeterDocs,
  generatePowMeter,
  GENERATION_FALLBACK,
} from '@/lib/tp/pow-meter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function GET(req: NextRequest) {
  try {
    const access = await requireEmployeeAutofillAccess(req);
    if (access instanceof NextResponse) return access;
    const { employeeId } = access;

    const { data: meta } = await supabase
      .from('tp_meta')
      .select('prognose_bedrijfsarts, fml_izp_lab_date')
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

    const relevantDocs = filterPowMeterDocs(docs);
    if (relevantDocs.length === 0) {
      return NextResponse.json(
        { error: 'Geen intake-, AD- of FML/IZP-document gevonden', details: {} },
        { status: 200 }
      );
    }

    const ctx = buildPowMeterContextFromMeta(
      meta?.prognose_bedrijfsarts,
      meta?.fml_izp_lab_date
    );

    let pow_meter: string;
    let visie_plaatsbaarheid: string;

    try {
      const result = await generatePowMeter(openai, supabase, docs, ctx);
      pow_meter = result.pow_meter;
      visie_plaatsbaarheid = result.visie_plaatsbaarheid;
      if (!pow_meter.trim() && !visie_plaatsbaarheid.trim()) {
        return NextResponse.json(
          { error: 'Geen POW-meter informatie gevonden', details: {} },
          { status: 200 }
        );
      }
    } catch (error) {
      console.error('❌ POW-meter generation failed:', error);
      pow_meter = GENERATION_FALLBACK;
      visie_plaatsbaarheid = GENERATION_FALLBACK;
    }

    await supabase.from('tp_meta').upsert(
      { employee_id: employeeId, pow_meter, visie_plaatsbaarheid } as any,
      { onConflict: 'employee_id' }
    );

    return NextResponse.json({
      details: { pow_meter, visie_plaatsbaarheid },
      autofilled_fields: ['pow_meter', 'visie_plaatsbaarheid'],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ pow-meter route error:', err);
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 });
  }
}
