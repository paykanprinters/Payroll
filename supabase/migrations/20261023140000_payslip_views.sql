-- Tracks when an employee first opened each payslip in the staff portal.
-- Drives the "new payslip" pop-up and unread badge.
create table if not exists public.payslip_views (
  payslip_id uuid primary key references public.payslips(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  viewed_by uuid default auth.uid(),
  viewed_at timestamptz not null default now()
);

create index if not exists payslip_views_employee_id_idx on public.payslip_views (employee_id);

alter table public.payslip_views enable row level security;

drop policy if exists "Managers and linked staff can view payslip views" on public.payslip_views;
create policy "Managers and linked staff can view payslip views"
on public.payslip_views
for select
to authenticated
using (
  (select public.is_payroll_manager())
  or exists (
    select 1
    from public.employees e
    where e.id = payslip_views.employee_id
      and (e.user_id = (select auth.uid()) or e.id = (select auth.uid()))
  )
);

drop policy if exists "Linked staff can record own payslip views" on public.payslip_views;
create policy "Linked staff can record own payslip views"
on public.payslip_views
for insert
to authenticated
with check (
  exists (
    select 1
    from public.payslips p
    join public.employees e on e.id = p.employee_id
    where p.id = payslip_views.payslip_id
      and p.employee_id = payslip_views.employee_id
      and (e.user_id = (select auth.uid()) or e.id = (select auth.uid()))
  )
);

grant select, insert on public.payslip_views to authenticated;
revoke all on public.payslip_views from anon;

-- Existing history is treated as already seen so staff only get alerted for recent payslips.
insert into public.payslip_views (payslip_id, employee_id, viewed_by, viewed_at)
select p.id, p.employee_id, null, now()
from public.payslips p
where p.employee_id is not null
  and p.created_at < now() - interval '14 days'
on conflict (payslip_id) do nothing;
