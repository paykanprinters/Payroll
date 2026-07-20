# Annual SARS Tax Table Update Runbook

South Africa publishes new individual tax tables, rebates, UIF/SDL parameters,
and medical-scheme tax credits each year in the **National Budget** (usually late
February), effective **1 March** (the start of the new tax year).

SARS does **not** expose a public API for these figures. Like every commercial
payroll system (Sage, SimplePay, etc.), we maintain a curated copy from the
official Budget documents and the *Guide for Employers in respect of Employees'
Tax*. This document is the runbook for that annual update.

> SARS tax year **N** runs **1 March (N‑1) → 28/29 February (N)**.
> For example, tax year **2027** is 1 March 2026 → 28 February 2027.

---

## When to do this

- **Trigger:** the annual Budget speech (typically February).
- **Deadline:** before **1 March**, when the new tax year begins.
- **Automated reminder:** CI will start failing on **1 March** of any year for
  which the tables have not been added (see [CI gate](#ci-gate) below). Treat a
  red `Verify SARS tax tables are current` check as a hard blocker.

---

## What changes each year

Numeric data lives in [`shared/sars-tax-tables.json`](../shared/sars-tax-tables.json)
as the **single source of truth**. The app loads it via
[`src/lib/sars-tax-tables.ts`](../src/lib/sars-tax-tables.ts) (helpers + types). The
edge function uses a generated Deno copy at
`supabase/functions/_shared/sars-tax-tables.ts` — regenerate with
`pnpm sync:sars-tax-tables` (CI also runs `--check`).

| Field | Description |
| --- | --- |
| `payeBrackets` | Annual income tax brackets: `min_income`, `max_income`, `rate`, `deduction` (base amount). |
| `rebates` | Primary (`under65`), secondary (`sixtyFiveToSeventyFour`), tertiary (`seventyFivePlus`) age rebates. |
| `uifSdlRates` | `uif_rate`, `uif_cap` (monthly ceiling), `sdl_rate`. |
| `medicalTaxCredits` | Section 6A monthly credits: `mainMember`, `firstDependant`, `additionalDependant`. |
| `startDate` / `endDate` | SA fiscal window (leap-safe; see `computeSarsTaxYearBounds`). |
| `periodLabel`, `sourceUrl` | Human-readable label and the SARS source URL for audit. |

UIF and SDL parameters do not always change, but re-confirm them every year.

---

## Step-by-step

1. **Collect the official figures** for the new tax year from:
   - Rates of tax for individuals:
     https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/
   - Guide for Employers in respect of Employees' Tax (PAYE/UIF/SDL + medical credits).

2. **Add the new tax year** to `shared/sars-tax-tables.json`:
   - Add a `"<N>"` key (string year) with the same shape as the most recent year.
   - `SUPPORTED_SARS_TAX_YEARS` is derived automatically — no edit needed in TS.
   - Set `sourceUrl` to the specific SARS page/guide used and update `periodLabel`.

3. **Sync the Deno edge copy:**

```bash
pnpm sync:sars-tax-tables
```

4. **Run the freshness gate locally:**

```bash
pnpm check:tax-tables
```

   This verifies the Deno copy is in sync, then runs the coverage/structural-integrity
   suite in `src/lib/sars-tax-tables-coverage.test.ts`. It verifies the live tax year is
   covered and that brackets, rebates, UIF/SDL, medical credits, and fiscal dates
   are internally consistent.

5. **Run the full test suite** to catch downstream effects (golden master, EMP201,
   EMP501, IRP5):

```bash
pnpm test
```

   If the golden-master snapshots legitimately change because of the new rates,
   review the diff carefully against a manual SARS calculation, then update the
   snapshots.

6. **Apply the tables to the database.** The curated values are the source of
   truth, but live payroll reads from Supabase (`tax_brackets_paye`,
   `tax_rates_uif_sdl`, `tax_years`). After deploying, an Admin applies the new
   year from **Settings → Tax Liabilities** (which invokes the
   `fetch-sars-tax-tables` edge function). The in-app validation (COMP-16) will
   flag the year as *stale* until the DB matches the curated tables.

7. **Open a PR.** CI runs `pnpm check:tax-tables` and `pnpm test`; both must pass.
   Commit both `shared/sars-tax-tables.json` and the regenerated
   `supabase/functions/_shared/sars-tax-tables.ts`.

---

## CI gates

The CI workflow ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) runs two compliance steps before the main test suite:

### 1. Tax table freshness (`pnpm check:tax-tables`)

Fails when curated tables for the live tax year are missing or structurally invalid,
or when the Deno edge copy is out of sync with `shared/sars-tax-tables.json`.
See [CI gate](#ci-gate) below.

### 2. SARS parallel regression (`pnpm check:sars-compliance`)

The permanent compliance gate (COMP-18). Runs the full golden-master matrix — 11 representative employees × every curated tax year — and asserts PAYE, UIF, employer SDL, and net pay match hand-calculated SARS figures.

Backing files:

- `src/lib/payroll-calculations/sars-regression.ts` — scenario matrix and engine runner
- `src/lib/payroll-calculations/sars-regression.test.ts` — enforced SARS assertions
- `src/lib/payroll-calculations/golden-master.test.ts` — TY2027 characterization snapshots (drift detection)

When adding a new tax year, extend `REGRESSION_MATRIX` in `sars-regression.ts` with hand-calculated figures for all 11 scenarios before merging.

---

## CI gate (tax table freshness)

The CI workflow ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) runs
a dedicated step before the main test run:

```yaml
- name: Verify SARS tax tables are current
  run: pnpm check:tax-tables
```

The backing test, `src/lib/sars-tax-tables-coverage.test.ts`:

- **Forces the annual update** — `getSarsTaxYearForDate(new Date())` computes the
  live tax year; the test fails if no curated tables exist for it. This turns red
  automatically on 1 March of an un-updated year.
- **Catches bad edits** — validates contiguous ascending PAYE brackets, an
  open-ended top bracket, ordered age rebates, sane UIF/SDL rates, present medical
  credits, leap-safe fiscal dates, and a SARS `sourceUrl`, for every curated year.

---

## Quick reference

- Curated tables (SSOT): `shared/sars-tax-tables.json`
- App helpers/types: `src/lib/sars-tax-tables.ts`
- Edge sync: `pnpm sync:sars-tax-tables` → `supabase/functions/_shared/sars-tax-tables.ts`
- Freshness/integrity gate: `src/lib/sars-tax-tables-coverage.test.ts`
- Live-table validation (DB vs curated): `src/lib/tax-tables-validation.ts`
- Apply to DB: **Settings → Tax Liabilities** → `fetch-sars-tax-tables` edge function
- Run gate: `pnpm check:tax-tables`
