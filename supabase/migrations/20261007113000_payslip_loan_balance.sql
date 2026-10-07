-- Optional payslip lines for the loan deduction and the balance still outstanding.
-- The figures are stored on the payslip so a later repayment does not rewrite an old slip.
-- The deduction is already part of total deductions; these columns are display only.

alter table public.payslip_design_settings
  add column if not exists show_loan boolean not null default false;

alter table public.payslips
  add column if not exists loan_deduction numeric;

alter table public.payslips
  add column if not exists loan_balance numeric;
