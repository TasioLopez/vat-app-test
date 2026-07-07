import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeAutofillAccess } from '@/lib/auth/autofill-access';
import { parsePowToelichting } from '@/lib/tp/pow-meter/build-fields';
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

/** Legacy delegate — generates POW-meter storage (inschaling + toelichting in pow_meter). */
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

    try {
      const result = await generatePowMeter(openai, supabase, docs, ctx);
      pow_meter = result.pow_meter;
      if (!pow_meter.trim()) {
        return NextResponse.json(
          { error: 'Geen toelichting POW-meter gevonden', details: {} },
          { status: 200 }
        );
      }
    } catch (error) {
      console.error('❌ visie-plaatsbaarheid (POW) generation failed:', error);
      pow_meter = GENERATION_FALLBACK;
    }

    await supabase.from('tp_meta').upsert(
      { employee_id: employeeId, pow_meter } as any,
      { onConflict: 'employee_id' }
    );

    const toelichting = parsePowToelichting(pow_meter);

    return NextResponse.json({
      details: { pow_meter, visie_plaatsbaarheid: toelichting },
      autofilled_fields: ['pow_meter'],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ visie-plaatsbaarheid route error:', err);
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 });
  }
}
