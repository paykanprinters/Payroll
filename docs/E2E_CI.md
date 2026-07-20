# E2E tests in CI

Playwright runs as a second CI job after unit tests and build. Tests hit a **live Supabase project** via the local Vite dev server — they validate UI stability and auth flows, not seeded data values.

## Local run

```bash
cp .env.e2e.example .env.e2e
# Edit credentials, then:
set -a && source .env.e2e && set +a
pnpm e2e
```

Optional manager/staff projects require `E2E_MANAGER_*` and `E2E_STAFF_*` (see `.env.e2e.example`).

## Enable in GitHub Actions

Add these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Required | Purpose |
|--------|----------|---------|
| `E2E_EMAIL` | Yes | Admin test account email |
| `E2E_PASSWORD` | Yes | Admin test account password |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL for dev server |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key for dev server |
| `E2E_MANAGER_EMAIL` | No | Enables manager smoke project |
| `E2E_MANAGER_PASSWORD` | No | Enables manager smoke project |
| `E2E_STAFF_EMAIL` | No | Enables staff portal smoke project |
| `E2E_STAFF_PASSWORD` | No | Enables staff portal smoke project |

Until required secrets exist, the `e2e` job **passes with a warning** and skips browser tests.

## Test coverage

| Project | Specs |
|---------|--------|
| `admin` | `critical-paths.spec.ts`, `payroll-hardening.spec.ts` |
| `manager` | `manager-smoke.spec.ts` (optional creds) |
| `staff` | `staff-smoke.spec.ts` (optional creds) |

## CI artifacts

On failure, the workflow uploads `playwright-report/` and `test-results/` (retained 7 days). Download from the Actions run → Artifacts.

## Test account guidance

- Use dedicated CI users in Supabase Auth — not production admin personal accounts.
- Admin account needs access to timesheets, payslips, payroll runs, and company settings.
- Staff account should be linked to an employee with `portal_access = true`.
