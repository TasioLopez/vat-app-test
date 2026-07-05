# Security Audit Scope — vat-app-copy

**Audit date:** 2026-07-05  
**Branch:** `security/audit-2026-07`  
**Purpose:** Trigger non-empty diff for Cursor `review-security` skill; define full baseline audit scope.

## API route handlers (72 total)

### Documents & storage
- `src/app/api/documents/get/route.ts`
- `src/app/api/documents/upload/route.ts`
- `src/app/api/documents/delete/route.ts`
- `src/app/api/documents/metadata/route.ts`
- `src/app/api/storage/sign-url/route.ts`
- `src/app/api/storage/delete/route.ts`

### Autofill (TP / CV / employee)
- `src/app/api/autofill-tp-2/route.ts`
- `src/app/api/autofill-tp-3/ad-advies/route.ts`
- `src/app/api/autofill-tp-3/ad-advies-passende-arbeid/route.ts`
- `src/app/api/autofill-tp-3/belemmeringen/route.ts`
- `src/app/api/autofill-tp-3/inleiding/route.ts`
- `src/app/api/autofill-tp-3/persoonlijk-profiel/route.ts`
- `src/app/api/autofill-tp-3/plaatsbaarheid/route.ts`
- `src/app/api/autofill-tp-3/pow-meter/route.ts`
- `src/app/api/autofill-tp-3/prognose/route.ts`
- `src/app/api/autofill-tp-3/prognose-bedrijfsarts/route.ts`
- `src/app/api/autofill-tp-3/sociale-achtergrond/route.ts`
- `src/app/api/autofill-tp-3/visie-adviseur/route.ts`
- `src/app/api/autofill-tp-3/visie-plaatsbaarheid/route.ts`
- `src/app/api/autofill-tp-3/visie-werknemer/route.ts`
- `src/app/api/autofill-tp-3/zoekprofiel/route.ts`
- `src/app/api/autofill-cv/route.ts`
- `src/app/api/autofill-employee-info-working/route.ts`

### Mijn Stem
- `src/app/api/mijn-stem/analyze/route.ts`
- `src/app/api/mijn-stem/create-bucket/route.ts`
- `src/app/api/mijn-stem/delete/route.ts`
- `src/app/api/mijn-stem/init/route.ts`
- `src/app/api/mijn-stem/rewrite/route.ts`
- `src/app/api/mijn-stem/setup/route.ts`
- `src/app/api/mijn-stem/style/route.ts`
- `src/app/api/mijn-stem/test/route.ts`
- `src/app/api/mijn-stem/upload/route.ts`

### CV photo & share
- `src/app/api/cv-photo/route.ts`
- `src/app/api/cv-photo/sign/route.ts`
- `src/app/api/cv-photo/upload/route.ts`
- `src/app/api/cv-share/route.ts`
- `src/app/api/cv-share/revoke/route.ts`
- `src/app/api/cv-share/[token]/document/route.ts`
- `src/app/api/cv-share/[token]/export-pdf/route.tsx`
- `src/app/api/cv-share/[token]/photo/route.ts`
- `src/app/api/cv-share/[token]/photo/sign/route.ts`
- `src/app/api/cv-share/[token]/photo/upload/route.ts`
- `src/app/api/cv-share/[token]/verify/route.ts`

### PDF export
- `src/app/api/export-pdf/route.tsx`
- `src/app/api/export-cv-pdf/route.tsx`

### Auth & signup
- `src/app/api/invite-user/route.ts`
- `src/app/api/signup/finalize/route.ts`
- `src/app/api/complete-signup/route.ts`

### Help center
- `src/app/api/help/articles/route.ts`
- `src/app/api/help/articles/[slug]/route.ts`
- `src/app/api/help/categories/route.ts`
- `src/app/api/help/chat/route.ts`
- `src/app/api/help/kb-media/sign-url/route.ts`
- `src/app/api/help/notifications/route.ts`
- `src/app/api/help/search/route.ts`
- `src/app/api/help/ticket-categories/route.ts`
- `src/app/api/help/tickets/route.ts`
- `src/app/api/help/tickets/[id]/route.ts`
- `src/app/api/help/tickets/[id]/mark-read/route.ts`
- `src/app/api/help/tickets/[id]/messages/route.ts`
- `src/app/api/help/admin/articles/route.ts`
- `src/app/api/help/admin/articles/[id]/route.ts`
- `src/app/api/help/admin/categories/route.ts`
- `src/app/api/help/admin/categories/[id]/route.ts`
- `src/app/api/help/admin/categories/reorder/route.ts`
- `src/app/api/help/admin/insights/route.ts`
- `src/app/api/help/admin/media/sign-upload/route.ts`
- `src/app/api/help/admin/notifications/route.ts`
- `src/app/api/help/admin/tickets/route.ts`
- `src/app/api/help/admin/tickets/[id]/route.ts`

### Debug / ops
- `src/app/api/check-schema/route.ts`
- `src/app/api/health-check/route.ts`

## Auth helpers
- `src/lib/help/auth.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/serverAdmin.ts`
- `src/lib/supabase-service.ts`
- `src/lib/api-utils.ts`

## CV share module
- `src/lib/cv-share/access.ts`
- `src/lib/cv-share/session.ts`
- `src/lib/cv-share/tokens.ts`
- `src/lib/cv-share/rate-limit.ts`
- `src/lib/cv-share/normalize-email.ts`
- `src/lib/cv-share/auth-client.ts`
- `src/lib/cv-share/email.ts`

## Supabase migrations (26 files)
- `supabase/migrations/add_employees_rls_policies.sql`
- `supabase/migrations/20260619120000_open_access_model.sql`
- `supabase/migrations/20260414120000_cv_documents.sql`
- `supabase/migrations/20260617120000_cv_share_links.sql`
- `supabase/migrations/20260401120000_help_center_kb_tickets.sql`
- `supabase/migrations/20260416120000_cv_photos_bucket.sql`
- `supabase/migrations/create_mijn_stem_table.sql`
- (and 19 additional migration files in `supabase/migrations/`)

## Other scope
- `src/app/dashboard/layout.tsx` — server-side auth gate for dashboard
- `next.config.ts` — security headers
- No `middleware.ts` at project root (global auth/CSP gap)

## Audit domains
1. API authentication and authorization (72 routes)
2. Supabase RLS and service-role bypass paths
3. CV share guest access, tokens, rate limiting
4. XSS sinks, file uploads, OpenAI/PII handling
5. Deployed infrastructure (Supabase dashboard, Vercel env)
