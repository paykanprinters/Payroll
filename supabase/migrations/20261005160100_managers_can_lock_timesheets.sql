-- Payroll runs are started by Managers as well as Admins.
-- Timesheet updates were limited to Admins, so a Manager's payroll run
-- saved payslips and then failed to lock the week's timesheets.

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
