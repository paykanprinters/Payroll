-- Opening balance is money saved before this system. Withdrawals reduce that balance.
-- The weekly deduction stays on the savings plan.

alter table public.payroll_savings_entries
  add column if not exists opening_balance numeric not null default 0;

alter table public.payroll_savings_entries
  drop constraint if exists payroll_savings_entries_opening_balance_check;

alter table public.payroll_savings_entries
  add constraint payroll_savings_entries_opening_balance_check
  check (opening_balance >= 0);

alter table public.payroll_savings_payments
  add column if not exists entry_type text not null default 'payment';

alter table public.payroll_savings_payments
  drop constraint if exists payroll_savings_payments_entry_type_check;

alter table public.payroll_savings_payments
  add constraint payroll_savings_payments_entry_type_check
  check (entry_type in ('payment', 'withdrawal'));
