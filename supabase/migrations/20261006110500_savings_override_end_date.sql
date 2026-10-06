-- A deduction override replaces the plan amount until this date.
-- After the date, payroll returns to the plan deduction.

alter table public.payroll_savings_entries
  add column if not exists override_end_date date;
