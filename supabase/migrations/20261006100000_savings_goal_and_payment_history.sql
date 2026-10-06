-- A savings goal is separate from the weekly or monthly deduction.
-- Remaining balance is what's left of that goal. Payments are stored per pay period.
-- Payroll managers can update tracking, matching who can already edit saving plans.

alter table public.payroll_savings_entries
  add column if not exists goal_amount numeric;

alter table public.payroll_savings_entries
  drop constraint if exists payroll_savings_entries_goal_amount_check;

alter table public.payroll_savings_entries
  add constraint payroll_savings_entries_goal_amount_check
  check (goal_amount is null or goal_amount > 0);

alter table public.payroll_savings_entries
  drop column remaining_balance;

alter table public.payroll_savings_entries
  add column remaining_balance numeric
  generated always as (
    case
      when goal_amount is null then null
      else greatest(goal_amount - amount_paid, 0)
    end
  ) stored;

create table if not exists public.payroll_savings_payments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.saving_plans(id) on delete cascade,
  employee_id uuid not null,
  amount numeric not null,
  pay_period date not null,
  created_at timestamptz not null default now(),
  constraint payroll_savings_payments_amount_check check (amount > 0)
);

create index if not exists payroll_savings_payments_plan_id_idx
  on public.payroll_savings_payments (plan_id, pay_period desc);

alter table public.payroll_savings_payments enable row level security;

drop policy if exists "Payroll managers and owners can view savings payments" on public.payroll_savings_payments;
drop policy if exists "Payroll managers and owners can insert savings payments" on public.payroll_savings_payments;

create policy "Payroll managers and owners can view savings payments"
on public.payroll_savings_payments
for select
to authenticated
using (
  (select public.is_payroll_manager())
  or employee_id = (select auth.uid())
);

create policy "Payroll managers and owners can insert savings payments"
on public.payroll_savings_payments
for insert
to authenticated
with check (
  (select public.is_payroll_manager())
  or employee_id = (select auth.uid())
);

drop policy if exists "savings_entries_insert_own_or_admin" on public.payroll_savings_entries;
drop policy if exists "savings_entries_update_own_or_admin" on public.payroll_savings_entries;
drop policy if exists "savings_entries_delete_own_or_admin" on public.payroll_savings_entries;

create policy "Payroll managers and owners can insert savings entries"
on public.payroll_savings_entries
for insert
to authenticated
with check (
  (select public.is_payroll_manager())
  or employee_id = (select auth.uid())
);

create policy "Payroll managers and owners can update savings entries"
on public.payroll_savings_entries
for update
to authenticated
using (
  (select public.is_payroll_manager())
  or employee_id = (select auth.uid())
)
with check (
  (select public.is_payroll_manager())
  or employee_id = (select auth.uid())
);

create policy "Payroll managers and owners can delete savings entries"
on public.payroll_savings_entries
for delete
to authenticated
using (
  (select public.is_payroll_manager())
  or employee_id = (select auth.uid())
);
