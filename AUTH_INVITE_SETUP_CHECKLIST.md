# Auth Invite/Reset Setup Checklist

Use this checklist for **production**, **staging**, and local dev to keep invite-only onboarding stable.

Full environment split: [docs/ops/STAGING_PRODUCTION_SETUP.md](docs/ops/STAGING_PRODUCTION_SETUP.md).

## 1) Canonical hosts

- **Production** canonical host: `https://www.vat-app.nl`  
  Code normalizes bare `vat-app.nl` → `www.vat-app.nl` for auth redirects.
  Middleware also 308-redirects apex `vat-app.nl` → `www.vat-app.nl` (preserves query string) so PKCE cookies stay on one host.
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

- Site URL: `https://www.vat-app.nl/` (must be **www**, not apex)
- Redirect URLs (minimum):
  - `https://www.vat-app.nl/auth/callback`
  - `https://www.vat-app.nl/auth/confirm`
  - `https://vat-app.nl/auth/callback` (apex still accepted; app redirects to www)
  - `https://vat-app.nl/auth/confirm`
  - `http://localhost:3000/auth/callback` / `http://localhost:3000/auth/confirm` only if developing against prod (prefer staging)

### Staging project

- Site URL: `https://staging.vat-app.nl/`
- Redirect URLs (minimum):
  - `https://staging.vat-app.nl/auth/callback`
  - `https://staging.vat-app.nl/auth/confirm`
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/confirm`

## 3) Email templates (required for reliable reset/invite)

Paste templates from [`supabase/email-templates/`](supabase/email-templates/) into **each** Supabase project (Authentication → Email Templates):

| Template | Link target |
|---|---|
| Reset password | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password` |
| Invite user | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/signup` |

`token_hash` + `/auth/confirm` uses server-side `verifyOtp` and **does not** need the PKCE `code_verifier` cookie. That fixes “opened email in another browser/profile” and apex/www cookie mismatches that previously showed:

`invalid request: both auth code and code verifier should be non-empty`

Keep `/auth/callback` for any remaining PKCE redirects (`redirectTo` from `resetPasswordForEmail` / `inviteUserByEmail`).

## 4) Invite-only policy

- Disable public signups in **both** Supabase projects (Auth settings).
- Invites must originate only from admin-protected `/api/invite-user`.
- Invite and reset emails from staging must land on `staging.vat-app.nl`, not production.

## 5) End-to-end smoke tests

Run on the environment under test (staging URL or production URL), with a fresh browser profile and with an existing profile:

1. Invite email link:
   - Lands on `/auth/confirm?token_hash=…&type=invite&next=/signup` (or legacy `/auth/callback`).
   - Redirects to `/signup`.
   - User sets password + names.
   - Finalizes and lands on `/dashboard`.
   - Confirm the host matches the environment (staging vs www).
2. Reset password link:
   - Lands on `/auth/confirm?token_hash=…&type=recovery&next=/reset-password`.
   - Redirects to `/reset-password`.
   - Password update succeeds.
   - Also verify opening the link in a **different** browser than the one that requested reset still works (token_hash path).
3. In-app password change (Settings):
   - Logged-in MFA user can change password without being kicked to login.
   - Wrong current password shows a clear error.

## 6) Operational diagnostics

- In non-production builds, `/auth/callback` logs non-sensitive branch markers:
  - `code.exchange.start/success/error`
  - `hash.setSession.start/success/error`
  - `session.detected`
  - `user.fallback.success`
- On staging (`NEXT_PUBLIC_APP_ENV=staging`), the app shows a persistent “Test environment” banner.
