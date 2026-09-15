import type { SupabaseClient } from '@supabase/supabase-js';
import { isStagingEnv } from '@/lib/auth/staging-only';
import { INTAKE_LAYOUT_KEY, ensureIntakeShape, type IntakeData } from '@/lib/intake/schema';
import { intakeToGegevensFields, intakeToTpNarrativeFields } from '@/lib/intake/project';
import { mergeRecordFillBlanks } from '@/lib/tp2026/gegevens-autofill';
import {
  buildFunctiesFromIntakeCategories,
  hasIntakeAdviesQuote,
  hasIntakeFunctieCategories,
  hasIntakePassendeFunctiesQuote,
} from '@/lib/tp/intake-sectie7/build-fields';
import type { IntakeSectie7Content } from '@/lib/tp/intake-sectie7/schema';

export type ValidatedIntakeRecord = {
  id: string;
  data: IntakeData;
  validated_at: string;
};

/** Load the latest validated intake draft for an employee (staging feature). */
export async function getValidatedIntakeForEmployee(
  supabase: SupabaseClient,
  employeeId: string
): Promise<ValidatedIntakeRecord | null> {
  if (!isStagingEnv()) return null;

  const { data, error } = await (supabase as any)
    .from('intake_instances')
    .select('id, data_json, validated_at')
    .eq('employee_id', employeeId)
    .eq('layout_key', INTAKE_LAYOUT_KEY)
    .eq('status', 'draft')
    .not('validated_at', 'is', null)
    .maybeSingle();

  if (error || !data?.validated_at) return null;

  return {
    id: data.id as string,
    data: ensureIntakeShape(data.data_json || {}),
    validated_at: data.validated_at as string,
  };
}

/** Deterministic Gegevens/profile fields from validated intake. */
export function gegevensFromValidatedIntake(intake: IntakeData): Record<string, unknown> {
  return intakeToGegevensFields(intake);
}

export function narrativeFromValidatedIntake(intake: IntakeData): Record<string, unknown> {
  return intakeToTpNarrativeFields(intake);
}

/** Merge validated intake gegevens into TP data_json blanks only. */
export function mergeValidatedIntakeIntoTpData(
  tpData: Record<string, unknown>,
  intake: IntakeData
): Record<string, unknown> {
  const flat = intakeToGegevensFields(intake);
  return mergeRecordFillBlanks(tpData, flat);
}

export function hasNonEmptyNarrativeField(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((v) =>
      hasNonEmptyNarrativeField(v)
    );
  }
  return false;
}

function joinSocialNarrative(intake: IntakeData): string {
  const parts = [
    ...Object.values(intake.s8),
    ...Object.values(intake.s9),
    ...Object.values(intake.s10),
    ...Object.values(intake.s11),
    ...Object.values(intake.s12),
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean);
  return parts.join('\n\n');
}

function joinVisieWerknemer(intake: IntakeData): string {
  const parts = [
    ...Object.values(intake.s13),
    ...Object.values(intake.s14),
    ...Object.values(intake.s16),
    intake.s6.ervaart_belastbaarheid,
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean);
  return parts.join('\n\n');
}

/**
 * Build TP3 autofill `details` patch from validated intake for a single field.
 * Returns null when intake does not have enough content (caller should fall back to AI).
 */
export function tp3DetailsFromValidatedIntake(
  fieldKey: string,
  intake: IntakeData
): Record<string, unknown> | null {
  const s3 = intake.s3.korte_beschrijving_werkzaamheden.trim();
  const prognose = intake.s5.quote_prognose_advies_belastbaarheid.trim();
  const advies = intake.s7.quote_advies_spoor2.trim();
  const passende = intake.s7.quote_passende_functies.trim();
  const belemmeringen = intake.s17.praktische_belemmeringen.trim();

  switch (fieldKey) {
    case 'inleiding': {
      if (!s3 && !advies) return null;
      return {
        inleiding: advies || '',
        inleiding_sub: s3 ? `Functieomschrijving\n\n${s3}` : '',
      };
    }
    case 'prognose_bedrijfsarts': {
      if (!prognose) return null;
      return { prognose_bedrijfsarts: prognose };
    }
    case 'praktische_belemmeringen': {
      if (!belemmeringen) return null;
      return { praktische_belemmeringen: belemmeringen };
    }
    case 'advies_ad_passende_arbeid': {
      const content: IntakeSectie7Content = {
        quote_advies_spoor2: advies || null,
        quote_passende_functies: passende || null,
        functie_categorien: intake.s7.functie_categorien,
        ad_auteur: intake.s7.ad_auteur || null,
        ad_datum_iso: intake.s6.ad_report_date || null,
      };
      if (
        !hasIntakeAdviesQuote(content) &&
        !hasIntakePassendeFunctiesQuote(content) &&
        !hasIntakeFunctieCategories(content)
      ) {
        return null;
      }
      const functies = hasIntakeFunctieCategories(content)
        ? buildFunctiesFromIntakeCategories(content.functie_categorien)
        : undefined;
      return {
        advies_ad_passende_arbeid: advies || passende,
        ...(functies ? { zoekprofiel_functies: functies } : {}),
      };
    }
    case 'sociale_achtergrond': {
      const text = joinSocialNarrative(intake);
      if (!text) return null;
      return { sociale_achtergrond: text };
    }
    case 'visie_werknemer': {
      const text = joinVisieWerknemer(intake);
      if (!text) return null;
      return { visie_werknemer: text };
    }
    default:
      return null;
  }
}
