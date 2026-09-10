# Staging / Production Setup

Durable environment split for VAT App: isolated frontend (Vercel) **and** backend (Supabase).

Related: [Auth Invite/Reset Setup Checklist](../../AUTH_INVITE_SETUP_CHECKLIST.md), [`.env.example`](../../.env.example).

## Architecture

| Layer | Staging (test) | Production |
|---|---|---|
| Git branch | `staging` | `main` |
| Vercel | Staging env → `https://staging.vat-app.nl` | Production → `https://www.vat-app.nl` |
| Supabase | Separate project (e.g. `vat-app-staging`) | Current prod project |
| Data | Empty + invited test users / fake dossiers | Live client data |
| Gotenberg | Shared Fly app (`vat-gotenberg`) | Shared Fly app |
| Access | Deployment Protection (you + client contact) | All users |

```text
feature/*  →  staging  →  main
                │           │
                ▼           ▼
         Vercel Staging  Vercel Production
                │           │
                ▼           ▼
         Supabase Staging  Supabase Production
```

**Rules**

- Never point Staging/Preview Vercel env vars at production Supabase.
- Apply DB migrations on **staging first**, verify, then apply the same migrations on **production**.
- Day-to-day local `.env.local` should use **staging** keys, not production.

## Environment variable matrix

| Variable | Staging / Preview | Production | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Staging project URL | Prod project URL | Must differ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging anon key | Prod anon key | Must differ |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging service role | Prod service role | Must differ; server-only |
| `SUPABASE_URL` | Same as staging URL | Same as prod URL | Optional alias used by some routes |
| `OPENAI_API_KEY` | Shared OK | Shared OK | |
| `GOTENBERG_URL` | Shared Fly URL | Shared Fly URL | |
| `GOTENBERG_API_KEY` | Shared if set | Shared if set | |
| `CV_SHARE_SESSION_SECRET` | **Different** (≥16 chars) | Existing prod secret | Must differ |
| `AUTH_REDIRECT_ORIGIN` | `https://staging.vat-app.nl` | `https://www.vat-app.nl` | Must differ |
| `NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN` | Same as staging | Same as prod | Must differ |
| `APP_PUBLIC_URL` | `https://staging.vat-app.nl` | `https://www.vat-app.nl` | CV-share links |
| `SMTP_*` | Can share | Existing | |
| `NEXT_PUBLIC_APP_ENV` | `staging` | `production` | Shows staging banner when `staging` |

Storage buckets required in each Supabase project: `documents`, `cv-photos`, `kb-media` (private).

---

## One-time setup (manual)

Do these in order.

### 1) Supabase staging project

1. Create a new Supabase project (e.g. `vat-app-staging`), same region as production if possible.
2. Store URL, anon key, and service role key in a password manager.
3. **Authentication → URL Configuration**
   - Site URL: `https://staging.vat-app.nl`
   - Redirect URLs:
     - `https://staging.vat-app.nl/auth/callback`
     - `http://localhost:3000/auth/callback`
4. Disable public signup (invite-only). See [AUTH_INVITE_SETUP_CHECKLIST.md](../../AUTH_INVITE_SETUP_CHECKLIST.md).
5. Copy custom email templates from [`supabase/email-templates/`](../../supabase/email-templates/) if production uses them.
6. Apply the staging schema bootstrap (migrations alone are not enough on an empty DB — core tables were never in the migration history):
   - Paste [`supabase/staging_bootstrap/PASTE_1_baseline.sql`](../../supabase/staging_bootstrap/PASTE_1_baseline.sql), then [`PASTE_2_features_and_rls.sql`](../../supabase/staging_bootstrap/PASTE_2_features_and_rls.sql)
   - See [`supabase/staging_bootstrap/README.md`](../../supabase/staging_bootstrap/README.md) (includes optional prod schema-dump fallback)
7. Confirm buckets `documents`, `cv-photos`, `kb-media` exist and are **private**.
8. Invite yourself and the client contact; create a small fake client/employee for demos. Do **not** dump production PII.

### 2) DNS + Vercel

1. Production branch: `main` → `www.vat-app.nl`.
2. Assign branch `staging` to the Staging environment / domain `staging.vat-app.nl`.
3. Add DNS CNAME for `staging.vat-app.nl` → Vercel (as shown in the Vercel domain UI).
4. Enable **Deployment Protection** on Staging (password or Vercel Authentication) so only you and the client contact can open it.
5. Set environment variables with correct scopes:
   - **Production** → production Supabase + prod auth/app URLs + `NEXT_PUBLIC_APP_ENV=production`
   - **Staging** and **Preview** → staging Supabase + staging auth/app URLs + `NEXT_PUBLIC_APP_ENV=staging`
6. Redeploy staging after changing any `NEXT_PUBLIC_*` variable (rebuild required).

### 3) Local development

1. Point `.env.local` at staging Supabase (see [`.env.example`](../../.env.example)).
2. Keep production keys out of local files except rare break-glass debugging.

### 4) First end-to-end verification

On `https://staging.vat-app.nl` (after protection):

- [ ] Staging banner visible (“Test environment”)
- [ ] Invite / login / password reset; callback stays on `staging.vat-app.nl`
- [ ] Create employee, upload a document
- [ ] Open TP and/or CV flows needed for current work
- [ ] PDF export (if used)
- [ ] Confirm `www.vat-app.nl` is unchanged (separate data/schema)

---

## Promote ritual (every release)

Copy-paste checklist:

```text
[ ] 1. Merge feature branch → staging
[ ] 2. Apply any new SQL migrations on Supabase STAGING
[ ] 3. Wait for Vercel staging deploy; smoke-test staging
[ ] 4. Client sign-off on staging.vat-app.nl
[ ] 5. Merge staging → main
[ ] 6. Apply the SAME migrations on Supabase PRODUCTION
[ ] 7. Confirm Vercel production deploy
[ ] 8. Smoke-test www.vat-app.nl
```

### Smoke tests (staging and production)

1. **Auth:** invite link → `/auth/callback` → `/signup` → dashboard; reset password via `/auth/callback?next=/reset-password`.
2. **Dossier:** create/open employee; upload document; signed URL works.
3. **TP / CV:** open builder; save; export PDF if relevant.
4. **Env check:** staging shows banner; production does not.

---

## What this setup does not include

- Automatic prod → staging data sync
- Separate Gotenberg instance
- CI auto-promote bots

Those can be added later if needed.
