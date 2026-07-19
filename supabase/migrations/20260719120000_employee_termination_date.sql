-- Employment lifecycle: optional termination date for reports, analytics, and payroll filters
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS termination_date date;

COMMENT ON COLUMN public.employees.termination_date IS
  'Last day of employment; null means currently employed. Exclude from active payroll when before period start.';

CREATE INDEX IF NOT EXISTS idx_employees_termination_date
  ON public.employees (termination_date)
  WHERE termination_date IS NOT NULL;
