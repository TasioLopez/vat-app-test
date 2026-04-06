-- Full KB taxonomy: new root categories, idempotent upserts, TP step labels, deprecate sample EN welcome

-- New and existing roots (globally unique slug). Align sort_order with help hub navigation.
INSERT INTO public.kb_categories (slug, title, description, sort_order, tool_key, parent_id)
VALUES
  ('aan-de-slag', 'Aan de slag', 'Starten met de applicatie en het kenniscentrum.', 10, NULL, NULL),
  ('account-access', 'Account & toegang', 'Inloggen, rechten en accountinstellingen.', 20, NULL, NULL),
  ('dashboard', 'Dashboard', 'Startpagina en overzichten.', 30, NULL, NULL),
  ('werkgevers', 'Werkgevers', 'Werkgevers (clients) beheren.', 40, NULL, NULL),
  ('werknemers', 'Werknemers', 'Werknemers en trajecten.', 50, NULL, NULL),
  ('trajectplan-builder', 'Trajectplan Bouwer', 'Het trajectplan per werknemer opstellen.', 60, 'trajectplan_builder', NULL),
  ('tp-documenten', 'TP-documenten', 'Opgeslagen trajectplan-PDF''s bekijken.', 70, NULL, NULL),
  ('helpcentrum', 'Helpcentrum & ondersteuning', 'Zoeken, chat en supporttickets.', 80, NULL, NULL),
  ('instellingen', 'Instellingen', 'Profiel, wachtwoord en Mijn Stem.', 90, NULL, NULL),
  ('beheer-admin', 'Beheer (administrators)', 'Help beheren en gebruikers (alleen admin).', 100, NULL, NULL),
  ('vgr', 'VGR', 'VGR-module (gepland).', 110, NULL, NULL)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  tool_key = COALESCE(EXCLUDED.tool_key, public.kb_categories.tool_key),
  parent_id = EXCLUDED.parent_id;

-- Ensure TP step rows exist (idempotent if already seeded)
INSERT INTO public.kb_categories (slug, title, description, sort_order, tool_key, parent_id)
SELECT 'tp-part-' || n::text,
  'Part ' || n::text,
  'Trajectplan Bouwer — deel ' || n::text,
  n,
  'trajectplan_builder',
  c.id
FROM public.kb_categories c
CROSS JOIN generate_series(1, 5) AS n
WHERE c.slug = 'trajectplan-builder'
ON CONFLICT (slug) DO NOTHING;

-- Trajectplan substappen: keep slugs tp-part-1..5, align titles with bouwer UI
UPDATE public.kb_categories
SET
  title = v.title,
  description = v.description
FROM (VALUES
  ('tp-part-1', 'Voorblad', 'Trajectplan Bouwer — voorblad en titelpagina.'),
  ('tp-part-2', 'Gegevens werknemer', 'Trajectplan Bouwer — persoons- en postgegevens.'),
  ('tp-part-3', 'TP deel 3', 'Trajectplan Bouwer — hoofddeel trajectplan.'),
  ('tp-part-4', 'Bijlage 1', 'Trajectplan Bouwer — bijlage.'),
  ('tp-part-5', 'Eindecontrole', 'Trajectplan Bouwer — controle en afronding.')
) AS v(slug, title, description)
WHERE public.kb_categories.slug = v.slug;

-- Sample EN article was for demo; end-user help is NL-first — hide from published list
UPDATE public.kb_articles
SET published = false, published_at = NULL
WHERE locale = 'en' AND slug = 'welcome-knowledge-center';
