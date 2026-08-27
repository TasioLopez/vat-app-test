import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeAutofillAccess } from '@/lib/auth/autofill-access';
import {
  FUNCTIE_FINAL_MIN_COUNT,
  filterVisieLoopbaanadviseurDocs,
  generateFunctieSuggestions,
  generateVisieLoopbaanadviseur,
  GENERATION_FALLBACK,
  hasIntakeDoc,
  detectDocumentScenario,
  buildVisieLoopbaanadviseurFields,
  draftFromGeneratedBatch,
  mergeRegenerationBatch,
  markDraftFinalized,
  parseDraft,
  createEmptyDraft,
  type VisieLoopbaanFunctie,
  type VisieLaFunctieDraft,
} from '@/lib/tp/visie-loopbaanadviseur';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function loadCtxAndDocs(employeeId: string) {
  const { data: details } = await supabase
    .from('employee_details')
    .select('gender')
    .eq('employee_id', employeeId)
    .single();

  const { data: meta } = await supabase
    .from('tp_meta')
    .select(
      'fml_izp_lab_date, intake_date, occupational_doctor_org, advies_ad_passende_arbeid, zoekprofiel, persoonlijk_profiel, has_ad_report, ad_report_concept'
    )
    .eq('employee_id', employeeId)
    .single();

  const { data: docs } = await supabase
    .from('documents')
    .select('type, url, uploaded_at')
    .eq('employee_id', employeeId)
    .order('uploaded_at', { ascending: false });

  return { details, meta, docs: docs ?? [] };
}

function coerceFunctieList(value: unknown): VisieLoopbaanFunctie[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const naam = String(o.naam ?? '').trim();
      if (!naam) return null;
      return { naam, toelichting: String(o.toelichting ?? '').trim() };
    })
    .filter((f): f is VisieLoopbaanFunctie => f != null);
}

function coerceStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v ?? '').trim()).filter(Boolean);
}

/** Batch autofill: generate 5, write markdown, seed draft as kept. */
export async function GET(req: NextRequest) {
  try {
    const access = await requireEmployeeAutofillAccess(req);
    if (access instanceof NextResponse) return access;
    const { employeeId } = access;

    const { details, meta, docs } = await loadCtxAndDocs(employeeId);

    if (!docs.length) {
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
    let draft: VisieLaFunctieDraft = createEmptyDraft();

    try {
      const result = await generateVisieLoopbaanadviseur(openai, supabase, ctx, docs);
      visie_loopbaanadviseur = result.visie_loopbaanadviseur;
      draft = result.draft;
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
      details: { visie_loopbaanadviseur, visie_la_functie_draft: draft },
      autofilled_fields: ['visie_loopbaanadviseur', 'visie_la_functie_draft'],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ visie-adviseur route error:', err);
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 });
  }
}

/**
 * Interactive suggest / regenerate / finalize.
 * Body: { mode: 'initial' | 'regenerate' | 'finalize', kept?, rejected?, userFeedback?, draft? }
 */
export async function POST(req: NextRequest) {
  try {
    const access = await requireEmployeeAutofillAccess(req);
    if (access instanceof NextResponse) return access;
    const { employeeId } = access;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const mode = String(body.mode ?? '').trim();

    const { details, meta, docs } = await loadCtxAndDocs(employeeId);

    if (!docs.length) {
      return NextResponse.json({ error: 'Geen documenten gevonden' }, { status: 200 });
    }
    if (!hasIntakeDoc(docs)) {
      return NextResponse.json(
        { error: 'Geen intakeformulier gevonden (verplicht voor visie loopbaanadviseur)' },
        { status: 200 }
      );
    }

    const ctx = {
      details: details ?? {},
      meta: meta ?? {},
    };

    if (mode === 'finalize') {
      const kept = coerceFunctieList(body.kept);
      if (kept.length < FUNCTIE_FINAL_MIN_COUNT) {
        return NextResponse.json(
          {
            error: `Selecteer minstens ${FUNCTIE_FINAL_MIN_COUNT} functie om toe te passen`,
          },
          { status: 200 }
        );
      }

      const scenario = detectDocumentScenario(docs, meta);
      const fields = buildVisieLoopbaanadviseurFields(ctx, { functies: kept }, scenario);
      let draft = parseDraft(body.draft);
      if (draft.suggestions.length === 0) {
        draft = draftFromGeneratedBatch(kept, { status: 'kept', round: 1 });
      }
      draft = markDraftFinalized(draft);

      await supabase.from('tp_meta').upsert(
        {
          employee_id: employeeId,
          visie_loopbaanadviseur: fields.visie_loopbaanadviseur,
        } as any,
        { onConflict: 'employee_id' }
      );

      return NextResponse.json({
        details: {
          visie_loopbaanadviseur: fields.visie_loopbaanadviseur,
          visie_la_functie_draft: draft,
        },
      });
    }

    if (mode !== 'initial' && mode !== 'regenerate') {
      return NextResponse.json(
        { error: 'Ongeldige mode (initial | regenerate | finalize)' },
        { status: 400 }
      );
    }

    const kept = coerceFunctieList(body.kept);
    const rejected = coerceStringList(body.rejected);
    const userFeedback =
      typeof body.userFeedback === 'string' ? body.userFeedback : undefined;
    const existingDraft = parseDraft(body.draft);

    const { suggestions, qualityWarnings } = await generateFunctieSuggestions(
      openai,
      supabase,
      ctx,
      docs,
      {
        kept: mode === 'regenerate' ? kept : [],
        rejectedNames: mode === 'regenerate' ? rejected : [],
        userFeedback: mode === 'regenerate' ? userFeedback : undefined,
      }
    );

    const draft =
      mode === 'initial'
        ? draftFromGeneratedBatch(suggestions, { status: 'pending', round: 1 })
        : mergeRegenerationBatch(
            existingDraft.suggestions.length ? existingDraft : createEmptyDraft(),
            suggestions,
            { userFeedback }
          );

    // If regenerate was called with kept but empty draft, seed kept into draft first.
    let finalDraft = draft;
    if (mode === 'regenerate' && kept.length > 0 && existingDraft.suggestions.length === 0) {
      const seeded = draftFromGeneratedBatch(kept, { status: 'kept', round: 0 });
      finalDraft = mergeRegenerationBatch(seeded, suggestions, { userFeedback });
    }

    return NextResponse.json({
      suggestions: finalDraft.suggestions.filter((s) => s.status === 'pending'),
      draft: finalDraft,
      qualityWarnings,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ visie-adviseur POST error:', err);
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 });
  }
}
