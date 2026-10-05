-- Managers import clock times and lock them during a payroll run.
-- Insert and delete were still Admin-only, so a Manager import failed
-- row-level security. Update is included because the earlier lock policy
-- was not yet applied on this database.

drop policy if exists "Admins and owners can insert timesheets" on public.timesheets;
drop policy if exists "Payroll managers and owners can insert timesheets" on public.timesheets;

create policy "Payroll managers and owners can insert timesheets"
on public.timesheets
for insert
to authenticated
with check (
  (select public.is_payroll_manager())
  or (select auth.uid()) = employee_id
);

drop policy if exists "Admins and owners can update timesheets" on public.timesheets;
drop policy if exists "Payroll managers and owners can update timesheets" on public.timesheets;

create policy "Payroll managers and owners can update timesheets"
on public.timesheets
for update
to authenticated
using (
  (select public.is_payroll_manager())
  or (
    (select auth.uid()) = employee_id
    and status <> 'Locked'
  )
)
with check (
  (select public.is_payroll_manager())
  or (
    (select auth.uid()) = employee_id
    and status <> 'Locked'
  )
);

drop policy if exists "Admins and owners can delete timesheets" on public.timesheets;
drop policy if exists "Payroll managers and owners can delete timesheets" on public.timesheets;

create policy "Payroll managers and owners can delete timesheets"
on public.timesheets
for delete
to authenticated
using (
  (select public.is_payroll_manager())
  or (
    (select auth.uid()) = employee_id
    and status <> 'Locked'
  )
);
