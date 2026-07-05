# Infrastructure Security Checklist

**Audit date:** 2026-07-05  
**Branch:** `security/audit-2026-07`  
**Scope:** Supabase dashboard + Vercel/hosting (manual verification required)

This checklist must be completed in the Supabase and Vercel dashboards. Items marked **Code review** were verified from repository/migrations during the audit.

---

## Supabase dashboard

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | RLS enabled + forced on all tables holding employee/client/document data | **VERIFY** | Code review: RLS exists for `employees`, `cv_documents`, `cv_share_links`, `support_tickets`, `mijn_stem_documents`. **Missing in migrations:** `public.documents`, `public.users`, `public.tp_meta`, `public.tp_docs`, `public.user_clients`. |
| 2 | Production RLS matches migrations (especially open-access model) | **VERIFY** | Code review: [`20260619120000_open_access_model.sql`](../supabase/migrations/20260619120000_open_access_model.sql) sets `user_has_employee_access()` / `user_has_client_access()` to `auth.uid() IS NOT NULL` — any authenticated user can access all employee/client child data. Confirm this is intentional in production. |
| 3 | `exec_sql` RPC exists and is restricted to service role only | **VERIFY** | Code review: Referenced in [`src/app/api/mijn-stem/init/route.ts`](../src/app/api/mijn-stem/init/route.ts) but **not defined in repo migrations**. Check Supabase → Database → Functions. If it exists with `GRANT EXECUTE` to `authenticated` or `anon`, this is critical. |
| 4 | Storage bucket `documents` is private | **VERIFY** | Code review: Created with `public: false` in mijn-stem init routes. **No `storage.objects` policies in migrations** for this bucket — access relies entirely on API routes (several unauthenticated). |
| 5 | Storage bucket `cv-photos` is private with path-scoped policies | **VERIFY** | Code review: Original migration scoped by employee path; open-access migration relaxed to `auth.uid() IS NOT NULL` only. |
| 6 | Storage bucket `kb-media` is private | **Code review: OK** | Migration defines authenticated read, admin write. |
| 7 | Auth: email confirmation required | **VERIFY** | Login page checks `status === "confirmed"` in [`src/app/login/page.tsx`](../src/app/login/page.tsx). Confirm Supabase Auth settings match. |
| 8 | Auth: redirect URLs whitelisted | **VERIFY** | Invite flow uses `/auth/callback` → `/signup` in [`invite-user/route.ts`](../src/app/api/invite-user/route.ts). Confirm all production URLs are in Supabase Auth → URL Configuration. |
| 9 | Auth: invite-only signup enforced | **VERIFY** | Login rejects users not in `public.users` whitelist. Confirm Supabase Auth disallows open registration if required. |
| 10 | Service role key stored only server-side (Vercel env) | **Code review: OK** | No hardcoded secrets in `src/`. Client uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| 11 | Users cannot self-elevate to admin via `user_metadata.role` | **VERIFY** | Code review: [`signup/finalize/route.ts`](../src/app/api/signup/finalize/route.ts:41-42) falls back to `user.user_metadata.role` when no DB row exists. Restrict metadata updates in Supabase Auth dashboard. |
| 12 | `public.users` has RLS preventing non-admins from updating `role` | **VERIFY** | Code review: **No RLS migration for `users` table**. Client code updates users directly ([`UsersTable.tsx`](../src/components/users/UsersTable.tsx)). Critical gap if not enforced in dashboard. |

---

## Vercel / hosting

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | `SUPABASE_SERVICE_ROLE_KEY` set in production env only | **VERIFY** | Not in client bundle per code review. |
| 2 | `OPENAI_API_KEY` set in production env only | **VERIFY** | Used only in API routes and server libs. |
| 3 | `CV_SHARE_SESSION_SECRET` set (min 16 chars) | **VERIFY** | Required by [`src/lib/cv-share/session.ts`](../src/lib/cv-share/session.ts). Missing value throws at runtime. |
| 4 | No secrets in `NEXT_PUBLIC_*` variables | **Code review: OK** | Only Supabase URL and anon key are public. |
| 5 | Production deployment protection / IP allowlist (if internal app) | **VERIFY** | No code-level IP restriction found. Configure in Vercel if app is internal-only. |
| 6 | Security headers configured | **FAIL (code review)** | [`next.config.ts`](../next.config.ts) has no CSP, HSTS, `X-Frame-Options`, or `Referrer-Policy`. |
| 7 | No `middleware.ts` for global API protection | **FAIL (code review)** | No root middleware file. All auth is per-route (inconsistently applied). |

---

## Operational

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Debug routes blocked or removed in production | **FAIL (code review)** | These routes have no auth and no `NODE_ENV` gate: `/api/check-schema`, `/api/health-check`, `/api/mijn-stem/test`, `/api/mijn-stem/init`, `/api/mijn-stem/setup`, `/api/mijn-stem/create-bucket`. Block via Vercel firewall or remove. |
| 2 | Error responses do not leak stack traces | **FAIL (code review)** | [`check-schema/route.ts`](../src/app/api/check-schema/route.ts:61) returns `stack` on 500. |
| 3 | Health check does not expose env configuration | **FAIL (code review)** | [`health-check/route.ts`](../src/app/api/health-check/route.ts) returns booleans for each secret's presence. |
| 4 | npm dependencies audited | **ACTION NEEDED** | `npm audit` reports 67 vulnerabilities (7 critical, 25 high). Run `npm audit fix`; evaluate `next@15.5.20` and `nodemailer@9.0.3` upgrades. |
| 5 | `/debug-user` page removed or gated in production | **FAIL (code review)** | [`debug-user/page.tsx`](../src/app/debug-user/page.tsx) allows any auth user to upsert into `users` with `status: confirmed`. |

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Supabase admin | | | |
| Vercel admin | | | |
| Engineering lead | | | |

**Next step:** Complete all **VERIFY** items in Supabase/Vercel dashboards and update Status column before production deployment.
