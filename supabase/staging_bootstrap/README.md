# Staging database bootstrap

The dated files in `supabase/migrations/` **cannot** alone create a fresh database: core tables (`users`, `clients`, `employees`, …) were created outside this repo.

## What to paste (recommended for empty staging)

In the **staging** Supabase project → **SQL Editor**, run in order:

1. [`PASTE_1_baseline.sql`](./PASTE_1_baseline.sql) — core tables + `documents` bucket + `is_admin()`
2. [`PASTE_2_features_and_rls.sql`](./PASTE_2_features_and_rls.sql) — feature tables, buckets `cv-photos` / `kb-media`, final RLS

Or paste the single combined file [`FULL_STAGING_SCHEMA.sql`](./FULL_STAGING_SCHEMA.sql) if your editor accepts ~120KB.

### If Block 2 failed on `last_accessed_at` / `employee_users`

Earlier feature SQL likely already applied. Do **not** re-run full Block 2 (referent policies will collide). Instead paste:

1. [`PASTE_2_RESUME_after_access_tracking.sql`](./PASTE_2_RESUME_after_access_tracking.sql)

That adds the missing columns on `employee_users` / `user_clients`, then continues from open-access through final RLS.

If a statement errors, fix/report that error before continuing (do not ignore FK/RLS failures).

### After both succeed

1. Storage → confirm buckets `documents`, `cv-photos`, `kb-media` are **private**.
2. Create your first admin: invite via Auth is easiest **after** Vercel staging is wired; or insert via Dashboard once you have an `auth.users` row.
3. Continue checklist B1.6 / B2 in [`docs/ops/STAGING_PRODUCTION_SETUP.md`](../../docs/ops/STAGING_PRODUCTION_SETUP.md).

## Safer alternative (schema dump from production)

If Block 2 fails on an edge case, dump **schema only** from production and apply to staging:

```bash
# Use the production database connection string from
# Supabase → Project Settings → Database → URI (direct, not pooler if possible)

pg_dump "YOUR_PROD_DB_URI" \
  --schema-only \
  --no-owner \
  --no-privileges \
  -n public \
  -f prod_public_schema.sql
```

Then in staging SQL Editor, run `prod_public_schema.sql`, and ensure storage buckets exist (create privately if missing).

**Do not** dump production **data** into staging (PII).

## Files intentionally skipped

Historical `ALTER`-only migrations (language skills, transport arrays, etc.) are skipped because `PASTE_1` already uses the final column shapes. `20250317000001_drop_clients_referent_columns.sql` is skipped so `clients.referent_*` stays aligned with app types.
