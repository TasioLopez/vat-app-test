-- Help KB taxonomy: align hub with live staging UI (Nov 2026)
-- - Add roots: Intake & bronnen, CV, Reserveren
-- - Trajectplan children = 4 live steps (Voorblad / Gegevens / Basisdocument / Bijlage 1)
-- - Remove Eindecontrole hub child (tp-part-5)
-- - Documenten label (was TP-documenten); VGR no longer "gepland"

-- ---------------------------------------------------------------------------
-- New root categories (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO public.kb_categories (slug, title, description, sort_order, tool_key, parent_id)
VALUES
  (
    'intake-dossier',
    'Intake & bronnen',
    'Bronnen uploaden, intake invullen met AI en valideren.',
    55,
    NULL,
    NULL
  ),
  (
    'cv',
    'CV',
    'CV opstellen en delen vanuit het werknemersdossier.',
    58,
    NULL,
    NULL
  ),
  (
    'reserveren',
    'Reserveren',
    'Ruimtes en parkeerplaatsen reserveren.',
    62,
    NULL,
    NULL
  )
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  tool_key = COALESCE(EXCLUDED.tool_key, public.kb_categories.tool_key),
  parent_id = EXCLUDED.parent_id;

-- ---------------------------------------------------------------------------
-- Sidebar / hub naming: Documenten (slug stays tp-documenten for article FKs)
-- ---------------------------------------------------------------------------
UPDATE public.kb_categories
SET
  title = 'Documenten',
  description = 'Opgeslagen documenten en trajectplan-PDF''s bekijken.',
  sort_order = 70
WHERE slug = 'tp-documenten';

-- ---------------------------------------------------------------------------
-- VGR is live — drop "gepland" wording
-- ---------------------------------------------------------------------------
UPDATE public.kb_categories
SET
  title = 'VGR',
  description = 'Voortgangsrapportage (VGR) opstellen, controleren en als PDF exporteren.',
  sort_order = 110
WHERE slug = 'vgr';

-- ---------------------------------------------------------------------------
-- Trajectplan Bouwer children: match live wizard (Stap x van 4)
-- ---------------------------------------------------------------------------
UPDATE public.kb_categories
SET
  title = v.title,
  description = v.description,
  sort_order = v.sort_order
FROM (
  VALUES
    ('tp-part-1', 'Voorblad', 'Trajectplan Bouwer — voorblad en titelpagina.', 1),
    ('tp-part-2', 'Gegevens', 'Trajectplan Bouwer — gegevens controleren.', 2),
    ('tp-part-3', 'Basisdocument', 'Trajectplan Bouwer — basisdocument (inhoud).', 3),
    ('tp-part-4', 'Bijlage 1', 'Trajectplan Bouwer — planning (Bijlage 1) en download.', 4)
) AS v(slug, title, description, sort_order)
WHERE public.kb_categories.slug = v.slug;

-- ---------------------------------------------------------------------------
-- Remove Eindecontrole hub child (tp-part-5)
-- Reassign any articles first (FK ON DELETE RESTRICT), unpublish eindcontrole article
-- ---------------------------------------------------------------------------
UPDATE public.kb_articles AS a
SET category_id = p4.id
FROM public.kb_categories AS old
CROSS JOIN public.kb_categories AS p4
WHERE a.category_id = old.id
  AND old.slug = 'tp-part-5'
  AND p4.slug = 'tp-part-4';

UPDATE public.kb_articles
SET
  published = false,
  published_at = NULL
WHERE locale = 'nl'
  AND slug = 'tp-stap-eindcontrole';

DELETE FROM public.kb_categories
WHERE slug = 'tp-part-5';
