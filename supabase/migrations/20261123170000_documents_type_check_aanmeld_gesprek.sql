-- Widen documents.type CHECK for aanmeldformulier + gesprek bronnen.
-- Production historically had documents_type_check without these values;
-- staging already accepts them (rows exist). Preserve legacy types used in rows.

ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_type_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_type_check
  CHECK (
    type IS NULL OR type = ANY (ARRAY[
      'intakeformulier',
      'aanmeldformulier',
      'ad_rapportage',
      'fml_izp',
      'cv',
      'spreek_reportage',
      'gespreksverslag',
      'gespreksverslag_vgr',
      'extra',
      'tp',
      'vgr',
      'intake'
    ]::text[])
  );
