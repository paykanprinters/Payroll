-- COMP-07: Section 6A medical scheme fees tax credit.
-- Adds employee medical-scheme membership fields and the per-user setting that
-- controls whether the credit is applied to PAYE.
-- COMP-08: Section 11F pre-tax retirement-fund contributions.
--
-- Applied to the remote project via the Supabase MCP as migration version
-- 20260626103652 (file renamed to match the recorded version).

-- Employee medical-scheme membership (drives the monthly Section 6A credit).
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS medical_aid_member boolean NOT NULL DEFAULT false;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS medical_aid_dependants integer NOT NULL DEFAULT 0;

-- Guard against negative dependant counts.
ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_medical_aid_dependants_check;
ALTER TABLE public.employees
  ADD CONSTRAINT employees_medical_aid_dependants_check
  CHECK (medical_aid_dependants >= 0);

-- Per-user tax setting: apply the medical scheme tax credit (defaults ON, statutory).
ALTER TABLE public.user_tax_settings
  ADD COLUMN IF NOT EXISTS apply_medical_aid_tax_credit boolean NOT NULL DEFAULT true;

-- COMP-08: Section 11F pre-tax retirement-fund contributions.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS retirement_fund_contribution_percent numeric NOT NULL DEFAULT 0;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS retirement_fund_contribution_fixed numeric NOT NULL DEFAULT 0;

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_retirement_fund_contribution_check;
ALTER TABLE public.employees
  ADD CONSTRAINT employees_retirement_fund_contribution_check
  CHECK (
    retirement_fund_contribution_percent >= 0
    AND retirement_fund_contribution_percent <= 100
    AND retirement_fund_contribution_fixed >= 0
  );
