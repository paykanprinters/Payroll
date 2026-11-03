-- Annual company closure (factory shutdown).
-- Publishing a closure books Annual Leave (tagged with closure_id) and leave timesheet rows;
-- the shutdown weeks are then paid in advance on payout_date.
create table if not exists public.company_closures (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  payout_date date not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_closures_dates_check check (end_date >= start_date),
  constraint company_closures_payout_check check (payout_date <= start_date)
);

create table if not exists public.company_closure_exclusions (
  closure_id uuid not null references public.company_closures(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  primary key (closure_id, employee_id)
);

create index if not exists company_closure_exclusions_employee_idx
  on public.company_closure_exclusions (employee_id);

alter table public.leave_records
  add column if not exists closure_id uuid references public.company_closures(id) on delete cascade;
create index if not exists leave_records_closure_id_idx on public.leave_records (closure_id);

alter table public.timesheets
  add column if not exists closure_id uuid references public.company_closures(id) on delete cascade;
create index if not exists timesheets_closure_id_idx on public.timesheets (closure_id);

alter table public.payslips
  add column if not exists paid_in_advance_closure_id uuid references public.company_closures(id) on delete set null;
create index if not exists payslips_paid_in_advance_closure_id_idx on public.payslips (paid_in_advance_closure_id);

alter table public.company_closures enable row level security;
alter table public.company_closure_exclusions enable row level security;

drop policy if exists "Payroll managers manage closures" on public.company_closures;
create policy "Payroll managers manage closures"
on public.company_closures
for all
to authenticated
using ((select public.is_payroll_manager()))
with check ((select public.is_payroll_manager()));

drop policy if exists "Linked staff read published closures" on public.company_closures;
create policy "Linked staff read published closures"
on public.company_closures
for select
to authenticated
using (status = 'published' and (select public.auth_linked_employee_id()) is not null);

drop policy if exists "Payroll managers manage closure exclusions" on public.company_closure_exclusions;
create policy "Payroll managers manage closure exclusions"
on public.company_closure_exclusions
for all
to authenticated
using ((select public.is_payroll_manager()))
with check ((select public.is_payroll_manager()));

drop policy if exists "Linked staff read own closure exclusions" on public.company_closure_exclusions;
create policy "Linked staff read own closure exclusions"
on public.company_closure_exclusions
for select
to authenticated
using (employee_id = (select public.auth_linked_employee_id()));

grant select, insert, update, delete on public.company_closures to authenticated;
grant select, insert, update, delete on public.company_closure_exclusions to authenticated;
revoke all on public.company_closures from anon;
revoke all on public.company_closure_exclusions from anon;

-- Push notifications for closures, de-duplicated per employee.
create table if not exists public.closure_push_notifications (
  closure_id uuid not null references public.company_closures(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (closure_id, employee_id)
);
alter table public.closure_push_notifications enable row level security;
revoke all on public.closure_push_notifications from anon, authenticated;

alter table public.notification_log drop constraint if exists notification_log_category_check;
alter table public.notification_log add constraint notification_log_category_check
  check (category = any (array['payslip', 'reminder', 'test', 'other', 'welcome', 'onboarding', 'closure']));

-- BCEA minimum for a public holiday not worked is a normal day's pay.
alter table public.overtime_rules alter column holiday_non_worked_multiplier set default 1.0;
