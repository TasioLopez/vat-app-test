import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeAutofillAccess } from '@/lib/auth/autofill-access';
import {
  generateBelastbaarheidsprofiel,
  GENERATION_FALLBACK,
} from '@/lib/tp/belastbaarheidsprofiel';

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
      .select('fml_izp_lab_date, occupational_doctor_org')
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

    const ctx = { meta: meta ?? {} };
    let prognose_bedrijfsarts: string;

    try {
      const result = await generateBelastbaarheidsprofiel(openai, supabase, ctx, docs);
      prognose_bedrijfsarts = result.prognose_bedrijfsarts;
      if (!prognose_bedrijfsarts.trim()) {
        return NextResponse.json(
          { error: 'Geen belastbaarheidsinformatie gevonden', details: {} },
          { status: 200 }
        );
      }
    } catch (error) {
      console.error('❌ Belastbaarheidsprofiel generation failed:', error);
      prognose_bedrijfsarts = GENERATION_FALLBACK;
    }

    await supabase.from('tp_meta').upsert(
      { employee_id: employeeId, prognose_bedrijfsarts } as any,
      { onConflict: 'employee_id' }
    );

    return NextResponse.json({
      details: { prognose_bedrijfsarts },
      autofilled_fields: ['prognose_bedrijfsarts'],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ prognose-bedrijfsarts route error:', err);
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 });
  }
}
