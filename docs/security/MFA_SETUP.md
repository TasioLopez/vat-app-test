# MFA (TOTP) setup

The app requires Supabase Auth MFA (TOTP) for all confirmed users.

## Supabase dashboard

1. Open the project → **Authentication** → **Providers / Multi-Factor**.
2. Enable **TOTP** (authenticator apps).
3. Repeat for **staging** and **production**.

Without this, `/mfa/setup` enroll calls will fail.

## User flow

1. Password login.
2. If a verified TOTP factor exists → enter 6-digit code.
3. If none → redirect to `/mfa/setup` (QR + verify).
4. Dashboard requires AAL2 (password + MFA).

## Session policy

- Idle: 60 minutes  
- Absolute: 12 hours  
See `src/lib/auth/session-policy.ts`.
