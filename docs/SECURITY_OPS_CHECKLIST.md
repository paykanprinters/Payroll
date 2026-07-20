# Security operations checklist

Manual steps for production hardening. Code changes alone cannot cover all of these.

## Supabase Auth (Dashboard → Authentication)

- [ ] **Disable public signup** unless you explicitly need open registration.
  - If signup is off, only invited users can create accounts.
- [ ] **Confirm site URL / redirect URLs** match production staff and admin portals.
- [ ] **Review email allowlist** in signup trigger (`20260206150000_create_users_profile_trigger.sql`):
  - `info@kanprinters.co.za` is promoted to Admin on first signup.
- [ ] **Review `bootstrap-admins` edge function** allowlist (`supabase/functions/bootstrap-admins/index.ts`).
  - Only trusted emails should self-promote when no admin exists yet.
- [ ] **Keep `ALLOW_SEED=false`** on edge function secrets in production (`seed-users`).
- [ ] **Enable MFA** when ready (deferred per project decision).
- [ ] **Enable leaked-password protection** when ready (deferred per project decision).

## Vercel

- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set for Production + Preview.
- [ ] Optional: set `VITE_PUBLIC_APP_URL` (or admin/staff portal URLs) for PDF API CORS.
- [ ] Redeploy after security header changes in `vercel.json`.

## Android staff app

- [ ] Distribute **signed release** APKs to staff (debug builds are for development only).
- [ ] Rebuild APK after manifest backup hardening (`allowBackup=false`).

## After deploy

- [ ] Smoke-test admin login, staff login, report PDF download, payslip PDF.
- [ ] Confirm staff portal branding still loads (authenticated `get-branding` edge function).
- [ ] Add GitHub Actions secrets for Playwright E2E (`docs/E2E_CI.md`).

## Regenerate baseline schema (new environments only)

See `scripts/README-baseline-schema.md`.
