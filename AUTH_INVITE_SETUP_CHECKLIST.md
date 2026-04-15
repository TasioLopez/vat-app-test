# Auth Invite/Reset Setup Checklist

Use this checklist for production and dev to keep invite-only onboarding stable.

## 1) Canonical host

- Choose one canonical production host.
- Current code normalizes `vat-app.nl` to `www.vat-app.nl` for auth redirects.
- Optional env vars:
  - `AUTH_REDIRECT_ORIGIN` (server-side)
  - `NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN` (client-side)
- Recommended production value: `https://www.vat-app.nl`

## 2) Supabase Auth URL Configuration

In Supabase Dashboard -> Authentication -> URL Configuration:

- Site URL: `https://www.vat-app.nl/`
- Redirect URLs (minimum):
  - `https://www.vat-app.nl/auth/callback`
  - `https://vat-app.nl/auth/callback` (transition support)
  - `http://localhost:3000/auth/callback` (local dev)
- Keep reset/signup callback URLs routed via `/auth/callback` with `next` query path.

## 3) Invite-only policy

- Disable public signups in Supabase Auth settings.
- Invites must originate only from admin-protected `/api/invite-user`.

## 4) End-to-end smoke tests

Run with fresh browser profile and with existing profile:

1. Invite email link:
   - Lands on `/auth/callback?...` with either `?code=` or hash tokens.
   - Redirects to `/signup`.
   - User sets password + names.
   - Finalizes and lands on `/dashboard`.
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

