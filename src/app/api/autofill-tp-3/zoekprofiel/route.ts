import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeAutofillAccess } from '@/lib/auth/autofill-access';
import {
  AD_ONLY_BELASTBAARHEID_WARNING,
  buildInsufficientZoekprofielFields,
  buildZoekprofielContextFromMeta,
  detectZoekprofielScenario,
  draftAwaitingQuestion,
  draftWithPreview,
  filterZoekprofielDocs,
  generateZoekprofiel,
  hasSpreekuurDoc,
  markDraftFinalized,
  parseDraft,
  appendAnswer,
  scenarioHasBelastbaarheidsClosing,
  type EmployeeDoc,
  type ZoekprofielClarificationDraft,
} from '@/lib/tp/zoekprofiel';
import { buildZoekprofielScenarioContext } from '@/lib/tp/zoekprofiel/prompt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type LoadedZoekprofielContext = {
  employee: { first_name?: string | null; last_name?: string | null };
  meta: Record<string, unknown> | null;
  docs: EmployeeDoc[];
  scenarioResult: ReturnType<typeof detectZoekprofielScenario>;
  relevantDocs: EmployeeDoc[];
};

async function loadZoekprofielContext(employeeId: string): Promise<LoadedZoekprofielContext> {
  const { data: employee } = await supabase
    .from('employees')
    .select('first_name, last_name')
    .eq('id', employeeId)
    .single();

  const { data: meta } = await supabase
    .from('tp_meta')
    .select('fml_izp_lab_date, has_ad_report, ad_report_concept')
    .eq('employee_id', employeeId)
    .single();

  const { data: docs } = await supabase
    .from('documents')
    .select('type, url, uploaded_at')
    .eq('employee_id', employeeId)
    .order('uploaded_at', { ascending: false });

  const allDocs = docs ?? [];
  const scenarioResult = detectZoekprofielScenario(allDocs, meta);
  const relevantDocs = filterZoekprofielDocs(allDocs);

  return {
    employee: employee ?? {},
    meta: meta ?? null,
    docs: allDocs,
    scenarioResult,
    relevantDocs,
  };
}

function buildGenerationContext(loaded: LoadedZoekprofielContext) {
  const { scenarioResult, meta } = loaded;
  const hasBelastClosing = scenarioHasBelastbaarheidsClosing(scenarioResult.scenario);

  return {
    ...buildZoekprofielContextFromMeta(
      typeof meta?.fml_izp_lab_date === 'string' ? meta.fml_izp_lab_date : null,
      {
        hasBelastbaarheidsDoc: hasBelastClosing,
        scenario: scenarioResult.scenario,
        hasAdReport: meta?.has_ad_report ?? null,
        actualisatieDocsPresent: hasSpreekuurDoc(loaded.docs),
      }
    ),
    employee: loaded.employee,
  };
}

type GenerationOutcome = {
  zoekprofiel?: string;
  clarificationQuestion?: string;
  draft?: ZoekprofielClarificationDraft;
  warnings: string[];
  requiresClarification?: boolean;
};

async function runZoekprofielGeneration(
  loaded: LoadedZoekprofielContext,
  options?: {
    clarificationHistory?: { question: string; answer: string }[];
    userAnswer?: string;
    pendingQuestion?: string;
    generationRound?: number;
  }
): Promise<GenerationOutcome> {
  const { scenarioResult, docs, relevantDocs } = loaded;
  const warnings: string[] = [];

  if (!scenarioResult.hasRelevantDocs || relevantDocs.length === 0) {
    return {
      warnings,
      clarificationQuestion: undefined,
    };
  }

  if (scenarioResult.scenario === 'insufficient') {
    const fields = buildInsufficientZoekprofielFields();
    return { zoekprofiel: fields.zoekprofiel, warnings };
  }

  const ctx = buildGenerationContext(loaded);

  try {
    const result = await generateZoekprofiel(openai, supabase, ctx, docs, {
      clarificationHistory: options?.clarificationHistory,
      userAnswer: options?.userAnswer,
      pendingQuestion: options?.pendingQuestion,
    });

    const round = options?.generationRound ?? 1;

    if (result.clarificationQuestion) {
      return {
        requiresClarification: true,
        clarificationQuestion: result.clarificationQuestion,
        draft: draftAwaitingQuestion(result.clarificationQuestion, {
          round,
          history: options?.clarificationHistory,
        }),
        warnings,
      };
    }

    if (!scenarioResult.hasSeparateBelastDoc) {
      console.warn(`⚠️ Zoekprofiel: ${AD_ONLY_BELASTBAARHEID_WARNING}`);
      warnings.push(AD_ONLY_BELASTBAARHEID_WARNING);
    }

    if (result.validationIssues?.length) {
      for (const issue of result.validationIssues) {
        warnings.push(`Zoekprofiel validatie: ${issue.message}`);
      }
    }

    const zoekprofiel = result.zoekprofiel.trim();
    if (!zoekprofiel) {
      return { warnings };
    }

    return {
      zoekprofiel,
      draft: draftWithPreview(zoekprofiel, {
        round,
        history: options?.clarificationHistory,
      }),
      warnings,
    };
  } catch (error) {
    console.error('❌ Zoekprofiel generation failed:', error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    const access = await requireEmployeeAutofillAccess(req);
    if (access instanceof NextResponse) return access;
    const { employeeId } = access;

    const loaded = await loadZoekprofielContext(employeeId);

    if (!loaded.scenarioResult.hasRelevantDocs || loaded.relevantDocs.length === 0) {
      return NextResponse.json(
        { error: 'Geen intake-, AD- of belastbaarheidsdocument gevonden', details: {} },
        { status: 200 }
      );
    }

    try {
      const outcome = await runZoekprofielGeneration(loaded);

      if (outcome.requiresClarification && outcome.clarificationQuestion) {
        return NextResponse.json({
          requires_clarification: true,
          clarification_question: outcome.clarificationQuestion,
          draft: outcome.draft,
          details: {
            zoekprofiel_clarification_draft: outcome.draft,
          },
        });
      }

      const zoekprofiel = outcome.zoekprofiel?.trim() ?? '';
      if (!zoekprofiel) {
        return NextResponse.json(
          { error: 'Geen zoekprofielinformatie gevonden in documenten', details: {} },
          { status: 200 }
        );
      }

      await supabase.from('tp_meta').upsert(
        { employee_id: employeeId, zoekprofiel } as Record<string, unknown>,
        { onConflict: 'employee_id' }
      );

      return NextResponse.json({
        details: {
          zoekprofiel,
          ...(outcome.draft ? { zoekprofiel_clarification_draft: outcome.draft } : {}),
        },
        autofilled_fields: ['zoekprofiel'],
        ...(outcome.warnings.length ? { warnings: outcome.warnings } : {}),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('could not be uploaded')) {
        return NextResponse.json(
          { error: 'Kon documenten niet uploaden', details: {} },
          { status: 500 }
        );
      }
      const { employee } = loaded;
      return NextResponse.json(
        {
          error: `Zoekprofiel AI generatie mislukt voor ${employee?.first_name || 'werknemer'} ${employee?.last_name || ''} — handmatig invullen vereist`,
          details: {},
        },
        { status: 200 }
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ zoekprofiel route error:', err);
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 });
  }
}

/**
 * Interactive clarification loop.
 * Body: { mode: 'initial' | 'answer' | 'finalize', userAnswer?: string, draft?: ZoekprofielClarificationDraft }
 */
export async function POST(req: NextRequest) {
  try {
    const access = await requireEmployeeAutofillAccess(req);
    if (access instanceof NextResponse) return access;
    const { employeeId } = access;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const mode = String(body.mode ?? 'initial').trim();
    const userAnswer =
      typeof body.userAnswer === 'string' ? body.userAnswer.trim() : undefined;
    let draft = parseDraft(body.draft);

    const loaded = await loadZoekprofielContext(employeeId);

    if (!loaded.scenarioResult.hasRelevantDocs || loaded.relevantDocs.length === 0) {
      return NextResponse.json(
        { error: 'Geen intake-, AD- of belastbaarheidsdocument gevonden' },
        { status: 200 }
      );
    }

    if (mode === 'finalize') {
      const zoekprofiel = String(
        body.zoekprofiel ?? draft.pendingZoekprofiel ?? ''
      ).trim();
      if (!zoekprofiel) {
        return NextResponse.json(
          { error: 'Geen zoekprofiel om toe te passen' },
          { status: 200 }
        );
      }

      draft = markDraftFinalized(draft);

      await supabase.from('tp_meta').upsert(
        { employee_id: employeeId, zoekprofiel } as Record<string, unknown>,
        { onConflict: 'employee_id' }
      );

      return NextResponse.json({
        details: {
          zoekprofiel,
          zoekprofiel_clarification_draft: draft,
        },
      });
    }

    if (mode === 'answer') {
      const question = draft.pendingQuestion?.trim();
      if (!question || !userAnswer) {
        return NextResponse.json(
          { error: 'Vraag en antwoord zijn verplicht voor mode answer' },
          { status: 200 }
        );
      }
      draft = appendAnswer(draft, question, userAnswer);
    }

    if (mode !== 'initial' && mode !== 'answer') {
      return NextResponse.json(
        { error: 'Ongeldige mode (initial | answer | finalize)' },
        { status: 400 }
      );
    }

    const lastPair = draft.answerHistory[draft.answerHistory.length - 1];
    const outcome = await runZoekprofielGeneration(loaded, {
      clarificationHistory: draft.answerHistory,
      userAnswer: mode === 'answer' ? lastPair?.answer : undefined,
      pendingQuestion: mode === 'answer' ? lastPair?.question : undefined,
      generationRound: draft.generationRound + 1,
    });

    if (outcome.requiresClarification && outcome.clarificationQuestion) {
      return NextResponse.json({
        requires_clarification: true,
        clarification_question: outcome.clarificationQuestion,
        draft: outcome.draft,
        scenario: buildZoekprofielScenarioContext(loaded.scenarioResult),
      });
    }

    const zoekprofiel = outcome.zoekprofiel?.trim() ?? '';
    if (!zoekprofiel) {
      return NextResponse.json(
        { error: 'Geen zoekprofiel gegenereerd', draft: outcome.draft },
        { status: 200 }
      );
    }

    return NextResponse.json({
      zoekprofiel,
      draft: outcome.draft,
      warnings: outcome.warnings,
      scenario: buildZoekprofielScenarioContext(loaded.scenarioResult),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ zoekprofiel POST error:', err);
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 });
  }
}
