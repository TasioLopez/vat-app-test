# Auth Invite/Reset Setup Checklist

Use this checklist for **production**, **staging**, and local dev to keep invite-only onboarding stable.

Full environment split: [docs/ops/STAGING_PRODUCTION_SETUP.md](docs/ops/STAGING_PRODUCTION_SETUP.md).

## 1) Canonical hosts

- **Production** canonical host: `https://www.vat-app.nl`  
  Code normalizes bare `vat-app.nl` → `www.vat-app.nl` for auth redirects.
- **Staging** canonical host: `https://staging.vat-app.nl`  
  Do not remap staging to www.
- Env vars (set per Vercel environment / `.env.local`):
  - `AUTH_REDIRECT_ORIGIN` (server-side)
  - `NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN` (client-side)
- Recommended values:
  - Production: `https://www.vat-app.nl`
  - Staging: `https://staging.vat-app.nl`
  - Local: `http://localhost:3000` (or leave unset to use the request origin)

## 2) Supabase Auth URL Configuration

Configure **each** Supabase project separately (prod project ≠ staging project).

### Production project

- Site URL: `https://www.vat-app.nl/`
- Redirect URLs (minimum):
  - `https://www.vat-app.nl/auth/callback`
  - `https://vat-app.nl/auth/callback` (transition support)
  - `http://localhost:3000/auth/callback` only if you intentionally develop against prod (prefer staging)

### Staging project

- Site URL: `https://staging.vat-app.nl/`
- Redirect URLs (minimum):
  - `https://staging.vat-app.nl/auth/callback`
  - `http://localhost:3000/auth/callback` (local development against staging)

Keep reset/signup callback URLs routed via `/auth/callback` with `next` query path.

## 3) Invite-only policy

- Disable public signups in **both** Supabase projects (Auth settings).
- Invites must originate only from admin-protected `/api/invite-user`.
- Invite and reset emails from staging must land on `staging.vat-app.nl`, not production.

## 4) End-to-end smoke tests

Run on the environment under test (staging URL or production URL), with a fresh browser profile and with an existing profile:

1. Invite email link:
   - Lands on `/auth/callback?...` with either `?code=` or hash tokens.
   - Redirects to `/signup`.
   - User sets password + names.
   - Finalizes and lands on `/dashboard`.
   - Confirm the host matches the environment (staging vs www).
2. Reset password link:
   - Lands on `/auth/callback?next=/reset-password`.
   - Redirects to `/reset-password`.
   - Password update succeeds.

## 5) Operational diagnostics

- In non-production builds, `/auth/callback` logs non-sensitive branch markers:
  - `code.exchange.start/success/error`
  - `hash.setSession.start/success/error`
  - `session.detected`
  - `user.fallback.success`
- On staging (`NEXT_PUBLIC_APP_ENV=staging`), the app shows a persistent “Test environment” banner.
