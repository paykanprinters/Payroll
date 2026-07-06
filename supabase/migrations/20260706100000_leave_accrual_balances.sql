-- BCEA leave accrual: optional employee-level overrides and opening balances
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS leave_cycle_start_date date,
  ADD COLUMN IF NOT EXISTS leave_opening_annual_balance numeric(6, 2),
  ADD COLUMN IF NOT EXISTS leave_opening_sick_balance numeric(6, 2),
  ADD COLUMN IF NOT EXISTS leave_opening_family_balance numeric(6, 2),
  ADD COLUMN IF NOT EXISTS annual_leave_entitlement_days numeric(4, 1);

COMMENT ON COLUMN public.employees.leave_cycle_start_date IS
  'Optional anchor for leave cycles; defaults to employment start_date.';
COMMENT ON COLUMN public.employees.leave_opening_annual_balance IS
  'Opening annual leave balance credited in the first leave cycle (migration / go-live).';
COMMENT ON COLUMN public.employees.leave_opening_sick_balance IS
  'Opening sick leave balance credited in the first sick cycle after qualifying period.';
COMMENT ON COLUMN public.employees.leave_opening_family_balance IS
  'Opening family responsibility leave balance for the first annual cycle.';
COMMENT ON COLUMN public.employees.annual_leave_entitlement_days IS
  'Override annual entitlement per cycle; defaults to 15 working days (BCEA-aligned policy).';
