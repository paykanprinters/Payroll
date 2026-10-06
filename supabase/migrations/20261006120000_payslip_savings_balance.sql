-- Optional payslip line for the savings total already saved.
-- The figure is stored on the payslip so later deposits do not rewrite an old slip.

alter table public.payslip_design_settings
  add column if not exists show_savings_balance boolean not null default false;

alter table public.payslips
  add column if not exists savings_balance numeric;
