# Infrastructure Security Checklist

**Audit date:** 2026-07-05  
**Remediation date:** 2026-07-06  
**Branch:** `security/remediation`  
**Scope:** Supabase dashboard + Vercel/hosting (manual verification required)

This checklist must be completed in the Supabase and Vercel dashboards. Items marked **Code review** were verified from repository/migrations during the audit/remediation.

---

## Supabase dashboard

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | RLS enabled + forced on all tables holding employee/client/document data | **Code review: OK** | Migration [`20260706120000_security_rls_users_documents_storage.sql`](../supabase/migrations/20260706120000_security_rls_users_documents_storage.sql) adds RLS for `users`, `documents`, `tp_meta`, `tp_docs`, `user_clients`, `storage.objects` (documents bucket), and fixes `mijn_stem_documents` policy. **Apply migration in production.** |
| 2 | Production RLS matches migrations (especially open-access model) | **VERIFY** | Open-access model preserved. Confirm production matches [`20260619120000_open_access_model.sql`](../supabase/migrations/20260619120000_open_access_model.sql). |
| 3 | `exec_sql` RPC exists and is restricted to service role only | **VERIFY** | Mijn-stem init/setup routes **deleted**. Check Supabase → Database → Functions; revoke if granted to `authenticated`/`anon`. |
| 4 | Storage bucket `documents` is private | **VERIFY** | RLS policies added for authenticated access. Confirm bucket is not public in dashboard. |
| 5 | Storage bucket `cv-photos` is private with path-scoped policies | **VERIFY** | Open-access migration relaxed to authenticated-only. |
| 6 | Storage bucket `kb-media` is private | **Code review: OK** | Migration defines authenticated read, admin write. Sign-url route validates path against `kb_articles.body`. |
| 7 | Auth: email confirmation required | **VERIFY** | Login page checks `status === "confirmed"`. Confirm Supabase Auth settings match. |
| 8 | Auth: redirect URLs whitelisted | **VERIFY** | Confirm all production URLs in Supabase Auth → URL Configuration. |
| 9 | Auth: invite-only signup enforced | **VERIFY** | Login rejects users not in `public.users` whitelist; RLS now blocks client self-insert on `users`. |
| 10 | Service role key stored only server-side (Vercel env) | **Code review: OK** | No hardcoded secrets in `src/`. |
| 11 | Users cannot self-elevate to admin via `user_metadata.role` | **Code review: OK** | [`signup/finalize/route.ts`](../src/app/api/signup/finalize/route.ts) defaults new users to `role: "user"`; only preserves role from existing DB row (admin invite). |
| 12 | `public.users` has RLS preventing non-admins from updating `role` | **Code review: OK** | Users can SELECT own row; admins SELECT/UPDATE all; no authenticated self-update policy. |

---

## Vercel / hosting

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | `SUPABASE_SERVICE_ROLE_KEY` set in production env only | **VERIFY** | |
| 2 | `OPENAI_API_KEY` set in production env only | **VERIFY** | |
| 3 | `CV_SHARE_SESSION_SECRET` set (min 16 chars) | **VERIFY** | |
| 4 | No secrets in `NEXT_PUBLIC_*` variables | **Code review: OK** | |
| 5 | Production deployment protection / IP allowlist (if internal app) | **VERIFY** | |
| 6 | Security headers configured | **Code review: OK** | [`next.config.ts`](../next.config.ts): CSP, HSTS (prod), X-Frame-Options, Referrer-Policy, X-Content-Type-Options. |
| 7 | Middleware for dashboard session refresh + blocked debug routes | **Code review: OK** | [`src/middleware.ts`](../src/middleware.ts) refreshes session on `/dashboard/*`; returns 404 for removed debug/mijn-stem infra routes. |

---

## Operational

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Debug routes blocked or removed in production | **Code review: OK** | Deleted: `/api/check-schema`, `/debug-user`, mijn-stem init/setup/test/create-bucket. Middleware 404s legacy paths. |
| 2 | Error responses do not leak stack traces | **Code review: OK** | check-schema route deleted. |
| 3 | Health check does not expose env configuration | **Code review: OK** | Returns `{ status: "ok" }` only. |
| 4 | npm dependencies audited | **Code review: OK (remaining accepted)** | Removed unused `latest` package (203 transitive deps). `npm audit fix` applied. **5 moderate/low remain** — dev-only: `esbuild` (local dev server), `js-yaml` via `@mdxeditor/editor`, `postcss` via `next`. Fixing requires `--force` with breaking upgrades; revisit on Next/MDXEditor bumps. |
| 5 | `/debug-user` page removed or gated in production | **Code review: OK** | Page and layout deleted; middleware blocks path. |
| 6 | API rate limits table migrated | **VERIFY** | Apply [`20260706120100_api_rate_limits.sql`](../supabase/migrations/20260706120100_api_rate_limits.sql) in Supabase. |

---

## Accepted risks (product policy)

| Item | Mitigation |
|------|------------|
| Open-access model (any authenticated advisor sees all employees/clients) | Intentional; documented in audit report. |
| CV share email verification (capability URL, no OTP) | Supabase-backed rate limits on verify + export; documented as accepted. |

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Supabase admin | | | Apply RLS + rate-limit migrations |
| Vercel admin | | | Redeploy after `npm install` |
| Engineering lead | | | |

**Next step:** Apply migrations in Supabase, run `npm install`, deploy, and complete remaining **VERIFY** items in dashboards.
