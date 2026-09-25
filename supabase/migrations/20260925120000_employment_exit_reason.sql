-- Record why someone left: resignation vs termination, plus a reason.
-- termination_date remains the last day of employment.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS employment_exit_type text;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS employment_exit_reason text;

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_employment_exit_type_check;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_employment_exit_type_check
  CHECK (
    employment_exit_type IS NULL
    OR employment_exit_type IN ('Resignation', 'Termination')
  );

COMMENT ON COLUMN public.employees.employment_exit_type IS
  'Resignation or Termination. Null while the employee is active.';

COMMENT ON COLUMN public.employees.employment_exit_reason IS
  'Free-text reason captured when employment ends.';
