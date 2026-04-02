-- Nederlands: kenniscategorieën en voorbeeldartikel (NL) voor gebruikerssite

UPDATE public.kb_categories
SET title = 'Trajectplan Builder',
    description = 'Helparticle voor de Trajectplan Builder'
WHERE slug = 'trajectplan-builder';

UPDATE public.kb_categories
SET title = 'Account & toegang',
    description = 'Inloggen, rechten en accountinstellingen'
WHERE slug = 'account-access';

UPDATE public.kb_categories c
SET title = 'Deel ' || (regexp_match(c.slug, '^tp-part-(\d+)$'))[1],
    description =
      'Trajectplan Builder — deel ' || (regexp_match(c.slug, '^tp-part-(\d+)$'))[1]
WHERE c.slug ~ '^tp-part-[0-9]+$';

-- NL-welkomstartikel: zelfde vertaalgroep als EN-voorbeeld, indien aanwezig
INSERT INTO public.kb_articles (
  translation_group_id,
  locale,
  category_id,
  title,
  slug,
  body,
  excerpt,
  published,
  published_at
)
SELECT a.translation_group_id,
  'nl'::text,
  a.category_id,
  'Welkom bij het Kenniscentrum',
  'welcome-knowledge-center',
  E'# Welkom\n\nDit is een voorbeeldartikel. Vervang dit door echte inhoud.\n\nJe kunt **markdown** gebruiken, afbeeldingen uit de mediatheek, en meer.',
  'Aan de slag met het helpcentrum.',
  true,
  now()
FROM public.kb_articles a
WHERE a.locale = 'en'
  AND a.slug = 'welcome-knowledge-center'
  AND NOT EXISTS (
    SELECT 1 FROM public.kb_articles x WHERE x.locale = 'nl' AND x.slug = 'welcome-knowledge-center'
  )
LIMIT 1;
