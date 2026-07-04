# Kan Printers Payroll

South African payroll system for Kan Printers — employees, timesheets, leave, payslips, SARS statutory reporting, payment batches, and a staff self-service portal.

## Stack

- **Frontend:** React, TypeScript, Vite, Tailwind, shadcn/ui
- **Backend:** Supabase (Auth, Postgres, Edge Functions)
- **Mobile:** Capacitor staff APK (`/staff` portal)
- **Deploy:** Vercel (admin web app)

## Core workflow

1. **Setup** — company details, pay cycle, tax tables, work hours, notifications
2. **Master data** — employees, compensation components, assignments, overtime rules
3. **Capture** — timesheets (Draft → Submitted → Approved) and leave
4. **Run payroll** — payroll runs, payslip generation, timesheet lock
5. **Pay & report** — payment batches (Bankserv ACB), registers, EMP201/EMP501/IRP5, analytics

## Roles

| Role | Access |
|------|--------|
| Admin | Full system including Settings |
| Manager | Employees, payroll, analytics, reports |
| Staff | Own payslips, timesheets, leave, profile (`/staff` portal) |

## Development

```bash
pnpm install
pnpm dev
```

### Checks

```bash
pnpm test                 # unit + component tests
pnpm lint                 # ESLint
pnpm run build:web        # production web build
pnpm run check:tax-tables # SARS tax table coverage
pnpm run check:sars-compliance
```

### Staff APK

```bash
pnpm run cap:build:android
```

See [docs/STAFF_MOBILE_APP.md](docs/STAFF_MOBILE_APP.md) for mobile packaging notes.

## Environment

Copy `.env` values for Supabase URL/anon key and portal mode (`VITE_PORTAL=admin` or `staff`). Edge functions need server secrets (Resend, SMS Portal) configured in Supabase — never commit secrets.

## Docs

In-app guides live under **Docs** (`/docs`) for administrators, staff, and developers. Compliance templates are in `docs/compliance/`.
