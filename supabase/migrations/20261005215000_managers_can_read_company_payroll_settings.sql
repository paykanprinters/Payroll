-- Company payroll flags and working hours are saved against one login.
-- Managers run payroll, so they must be able to read those rows.

drop policy if exists "Users can view their own tax settings" on public.user_tax_settings;
drop policy if exists "Payroll managers can view tax settings" on public.user_tax_settings;

create policy "Payroll managers can view tax settings"
on public.user_tax_settings
for select
to authenticated
using (
  (select public.is_payroll_manager())
  or (select auth.uid()) = user_id
);

drop policy if exists "Users can view their own work hours settings" on public.work_hours_settings;
drop policy if exists "Payroll managers can view work hours settings" on public.work_hours_settings;

create policy "Payroll managers can view work hours settings"
on public.work_hours_settings
for select
to authenticated
using (
  (select public.is_payroll_manager())
  or (select auth.uid()) = user_id
);
