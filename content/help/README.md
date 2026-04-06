# Help center content (NL)

Markdown sources live in [`nl/`](nl/). Articles are maintained as **full help-center copy** (structure, cross-links, screenshot placeholders in blockquotes). After editing, run `npm run help:seed` or `npm run help:seed-and-reindex`, then `npm run help:reindex-all` if you only seeded, so Supabase and embeddings stay in sync.

Each file has YAML frontmatter:

- `slug` — unique per locale (`nl`), lowercase and hyphens only
- `title`, `excerpt`
- `category_slug` — must match a row in `kb_categories.slug` (see migration `20260415120000_help_kb_full_taxonomy.sql`)
- `translation_group_id` — stable UUID for this logical article
- `locale` — `nl`

## Apply to the database

1. Run Supabase migrations (includes category taxonomy).
2. From the repo root, with `.env.local` containing `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`:

```bash
npx tsx scripts/seed-help-kb.ts
```

3. Refresh embeddings for search/chat (needs `OPENAI_API_KEY`):

```bash
npx tsx scripts/seed-help-kb.ts --reindex
```

Or reindex everything published in NL:

```bash
npm run help:reindex-all
```

## Regenerate stub bodies from the generator

The script [`scripts/generate-help-nl-md.mjs`](../scripts/generate-help-nl-md.mjs) can overwrite generated article files; prefer editing the `.md` files directly after the first run.
