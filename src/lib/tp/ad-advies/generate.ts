import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  generateIntakeSectie7Content,
  type EmployeeDoc,
  type IntakeSectie7Context,
} from '@/lib/tp/intake-sectie7';
import {
  buildAdAdviesFields,
  type AdAdviesBuildContext,
  type AdAdviesFields,
} from './build-fields';
import type { AdAdviesContentResult } from './schema';

function mapIntakeToAdAdviesContent(
  intake: Awaited<ReturnType<typeof generateIntakeSectie7Content>>,
  ctx: AdAdviesBuildContext
): AdAdviesContentResult {
  return {
    ad_auteur:
      intake.ad_auteur?.trim() ||
      ctx.meta.occupational_doctor_name?.trim() ||
      null,
    ad_datum_iso: intake.ad_datum_iso || ctx.meta.ad_report_date || null,
    advies_citaat: intake.quote_passende_functies,
  };
}

export async function generateAdAdviesContent(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: AdAdviesBuildContext,
  docs: EmployeeDoc[]
): Promise<AdAdviesContentResult> {
  const sectie7Ctx: IntakeSectie7Context = {
    meta: {
      ad_report_date: ctx.meta.ad_report_date,
      occupational_doctor_name: ctx.meta.occupational_doctor_name,
      has_ad_report: ctx.meta.has_ad_report,
      ad_report_concept: ctx.meta.ad_report_concept,
    },
  };
  const intake = await generateIntakeSectie7Content(openai, supabase, docs, sectie7Ctx);
  return mapIntakeToAdAdviesContent(intake, ctx);
}

export async function generateAdAdvies(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: AdAdviesBuildContext,
  docs: EmployeeDoc[]
): Promise<AdAdviesFields> {
  const content = await generateAdAdviesContent(openai, supabase, ctx, docs);
  return buildAdAdviesFields(ctx, content);
}

export type { AdAdviesBuildContext, AdAdviesFields, EmployeeDoc };
