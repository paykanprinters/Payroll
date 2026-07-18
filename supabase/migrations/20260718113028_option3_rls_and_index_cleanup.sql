-- Option 3 (scoped): remove true duplicates and consolidate clear overlapping
-- permissive RLS policies. Keep FK covering indexes from the prior migration.
--
-- Out of scope: unused FK index drops, full 43-policy rewrite, GraphQL grants,
-- SECURITY DEFINER EXECUTE revokes, Auth MFA / leaked-password (dashboard).

-- ---------------------------------------------------------------------------
-- 1) Duplicate index
-- ---------------------------------------------------------------------------
drop index if exists public.user_dashboard_settings_user_widget_unique;

-- ---------------------------------------------------------------------------
-- 2) todos: drop identical admin ALL duplicate
-- ---------------------------------------------------------------------------
drop policy if exists "todos_admin_all" on public.todos;

-- ---------------------------------------------------------------------------
-- 3) biometric_devices SELECT: Admin + Manager -> is_payroll_manager()
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can view all biometric devices" on public.biometric_devices;
drop policy if exists "Managers can view all biometric devices" on public.biometric_devices;

create policy "Payroll managers can view biometric devices"
on public.biometric_devices
for select
to authenticated
using ((select public.is_payroll_manager()));

-- ---------------------------------------------------------------------------
-- 4) employees INSERT: Admin + Manager -> is_payroll_manager()
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can insert employees" on public.employees;
drop policy if exists "Managers can insert employees" on public.employees;

create policy "Payroll managers can insert employees"
on public.employees
for insert
to authenticated
with check ((select public.is_payroll_manager()));

-- ---------------------------------------------------------------------------
-- 5) employees UPDATE (privileged): Admin + Manager -> is_payroll_manager()
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can update any employee" on public.employees;
drop policy if exists "Managers can update any employee" on public.employees;

create policy "Payroll managers can update any employee"
on public.employees
for update
to authenticated
using ((select public.is_payroll_manager()))
with check ((select public.is_payroll_manager()));

-- ---------------------------------------------------------------------------
-- 6) employees SELECT (own): merge id + user_id own-row policies
-- ---------------------------------------------------------------------------
drop policy if exists "Employees can read own record" on public.employees;
drop policy if exists "employees_select_own_via_user_id" on public.employees;

create policy "Employees can read own record"
on public.employees
for select
to authenticated
using (
  (select auth.uid()) = id
  or (select auth.uid()) = user_id
);

-- ---------------------------------------------------------------------------
-- 7) employees UPDATE (own): merge id + user_id own-row policies
-- ---------------------------------------------------------------------------
drop policy if exists "Employees can update their own profile" on public.employees;
drop policy if exists "employees_update_own_via_user_id" on public.employees;

create policy "Employees can update their own profile"
on public.employees
for update
to authenticated
using (
  (select auth.uid()) = id
  or (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) = id
  or (select auth.uid()) = user_id
);

-- ---------------------------------------------------------------------------
-- 8) company_details SELECT: single policy for managers + portal staff
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can read company details" on public.company_details;
drop policy if exists "Managers can read company details" on public.company_details;
drop policy if exists "Portal staff can read company details" on public.company_details;

create policy "Managers and portal staff can read company details"
on public.company_details
for select
to authenticated
using (
  (select public.is_payroll_manager())
  or exists (
    select 1
    from public.employees e
    where e.user_id = (select auth.uid())
      and e.portal_access is true
  )
);

-- ---------------------------------------------------------------------------
-- 9) generated_reports SELECT: managers OR own rows
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can view all generated reports" on public.generated_reports;
drop policy if exists "Managers can view all generated reports" on public.generated_reports;
drop policy if exists "Users can view their own generated reports" on public.generated_reports;

create policy "Managers and owners can view generated reports"
on public.generated_reports
for select
to authenticated
using (
  (select public.is_payroll_manager())
  or (select auth.uid()) = user_id
);
