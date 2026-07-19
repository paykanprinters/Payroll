-- Phase B: Consolidate remaining multi-permissive staff/manager RLS pairs
-- into single OR policies (same semantics, fewer policy evaluations).
-- Preserve InitPlan wrappers: (select auth.uid()), (select is_payroll_manager()), etc.

-- ---------------------------------------------------------------------------
-- employees SELECT: manager view-all OR own record
-- ---------------------------------------------------------------------------
drop policy if exists "Admins and Managers can view all employees" on public.employees;
drop policy if exists "Employees can read own record" on public.employees;

create policy "Managers and owners can view employees"
on public.employees
for select
to authenticated
using (
  (select public.is_payroll_manager())
  or (select auth.uid()) = id
  or (select auth.uid()) = user_id
);

-- ---------------------------------------------------------------------------
-- employees UPDATE: payroll managers OR own profile
-- ---------------------------------------------------------------------------
drop policy if exists "Payroll managers can update any employee" on public.employees;
drop policy if exists "Employees can update their own profile" on public.employees;

create policy "Managers and owners can update employees"
on public.employees
for update
to authenticated
using (
  (select public.is_payroll_manager())
  or (select auth.uid()) = id
  or (select auth.uid()) = user_id
)
with check (
  (select public.is_payroll_manager())
  or (select auth.uid()) = id
  or (select auth.uid()) = user_id
);

-- ---------------------------------------------------------------------------
-- users SELECT: admin OR own
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can view all user profiles" on public.users;
drop policy if exists "Users can view their own profile" on public.users;

create policy "Admins and owners can view user profiles"
on public.users
for select
to authenticated
using (
  (select public.is_admin())
  or (select auth.uid()) = id
);

-- ---------------------------------------------------------------------------
-- users UPDATE: admin any OR own with non-privileged field guard
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can update any user profile" on public.users;
drop policy if exists "Users can update non-privileged fields on own profile" on public.users;

create policy "Admins and owners can update user profiles"
on public.users
for update
to authenticated
using (
  (select public.is_admin())
  or (select auth.uid()) = id
)
with check (
  (select public.is_admin())
  or (
    (select auth.uid()) = id
    and role = (select u.role from public.users u where u.id = (select auth.uid()))
    and status = (select u.status from public.users u where u.id = (select auth.uid()))
  )
);

-- ---------------------------------------------------------------------------
-- timesheets SELECT: manager OR own (admin ALL remains)
-- ---------------------------------------------------------------------------
drop policy if exists "Managers can view all timesheets" on public.timesheets;
drop policy if exists "Employees can view their own timesheets" on public.timesheets;

create policy "Managers and owners can view timesheets"
on public.timesheets
for select
to authenticated
using (
  (select public.is_payroll_manager())
  or (select auth.uid()) = employee_id
);

-- ---------------------------------------------------------------------------
-- payslips SELECT: merge manager + employee + linked-staff (admin ALL remains)
-- ---------------------------------------------------------------------------
drop policy if exists "Managers can view all payslips" on public.payslips;
drop policy if exists "Employees can view their own payslips" on public.payslips;
drop policy if exists "Staff can view payslips of their linked employee" on public.payslips;

create policy "Managers and linked staff can view payslips"
on public.payslips
for select
to authenticated
using (
  (select public.is_payroll_manager())
  or exists (
    select 1
    from public.employees e
    where e.id = payslips.employee_id
      and (
        e.user_id = (select auth.uid())
        or e.id = (select auth.uid())
      )
  )
);

-- ---------------------------------------------------------------------------
-- loans: merge Manager + Employee per command (admin ALL remains)
-- ---------------------------------------------------------------------------
drop policy if exists "Managers can view all loans" on public.loans;
drop policy if exists "Employees can view their own loans" on public.loans;

create policy "Managers and owners can view loans"
on public.loans
for select
to authenticated
using (
  (select public.is_payroll_manager())
  or (select auth.uid()) = employee_id
);

drop policy if exists "Managers can insert loans" on public.loans;
drop policy if exists "Employees can insert their own loans" on public.loans;

create policy "Managers and owners can insert loans"
on public.loans
for insert
to authenticated
with check (
  (select public.is_payroll_manager())
  or (select auth.uid()) = employee_id
);

drop policy if exists "Managers can update loans" on public.loans;
drop policy if exists "Employees can update their own loans" on public.loans;

create policy "Managers and owners can update loans"
on public.loans
for update
to authenticated
using (
  (select public.is_payroll_manager())
  or (select auth.uid()) = employee_id
)
with check (
  (select public.is_payroll_manager())
  or (select auth.uid()) = employee_id
);

drop policy if exists "Managers can delete loans" on public.loans;
drop policy if exists "Employees can delete their own loans" on public.loans;

create policy "Managers and owners can delete loans"
on public.loans
for delete
to authenticated
using (
  (select public.is_payroll_manager())
  or (select auth.uid()) = employee_id
);

-- ---------------------------------------------------------------------------
-- saving_plans SELECT: manager OR own (admin ALL remains)
-- ---------------------------------------------------------------------------
drop policy if exists "Managers can view all saving plans" on public.saving_plans;
drop policy if exists "Employees can view their own saving plans" on public.saving_plans;

create policy "Managers and owners can view saving plans"
on public.saving_plans
for select
to authenticated
using (
  (select public.is_payroll_manager())
  or (select auth.uid()) = employee_id
);

-- ---------------------------------------------------------------------------
-- leave_records SELECT / INSERT / UPDATE
-- ---------------------------------------------------------------------------
drop policy if exists "Payroll managers can read all leave records" on public.leave_records;
drop policy if exists "Staff can read own leave records" on public.leave_records;

create policy "Managers and staff can read leave records"
on public.leave_records
for select
to authenticated
using (
  (select public.is_payroll_manager())
  or employee_id = (select public.auth_linked_employee_id())
);

drop policy if exists "Payroll managers can insert leave records" on public.leave_records;
drop policy if exists "Staff can submit own leave requests" on public.leave_records;

create policy "Managers and staff can insert leave records"
on public.leave_records
for insert
to authenticated
with check (
  (select public.is_payroll_manager())
  or (
    employee_id = (select public.auth_linked_employee_id())
    and status = 'Pending'
    and source = 'staff'
    and submitted_by = (select auth.uid())
  )
);

drop policy if exists "Payroll managers can update leave records" on public.leave_records;
drop policy if exists "Staff can cancel own pending leave" on public.leave_records;

create policy "Managers and staff can update leave records"
on public.leave_records
for update
to authenticated
using (
  (select public.is_payroll_manager())
  or (
    employee_id = (select public.auth_linked_employee_id())
    and status = 'Pending'
    and source = 'staff'
  )
)
with check (
  (select public.is_payroll_manager())
  or (
    employee_id = (select public.auth_linked_employee_id())
    and status = 'Cancelled'
    and source = 'staff'
  )
);

-- ---------------------------------------------------------------------------
-- consent_records: replace manager ALL + self split with per-command OR policies
-- ---------------------------------------------------------------------------
drop policy if exists "consent_write_managers" on public.consent_records;
drop policy if exists "consent_read_managers" on public.consent_records;
drop policy if exists "consent_read_self" on public.consent_records;
drop policy if exists "consent_write_self" on public.consent_records;
drop policy if exists "consent_update_self" on public.consent_records;

create policy "Managers and subjects can read consent records"
on public.consent_records
for select
to authenticated
using (
  (select public.is_payroll_manager())
  or employee_id = (select public.auth_linked_employee_id())
);

create policy "Managers and subjects can insert consent records"
on public.consent_records
for insert
to authenticated
with check (
  (select public.is_payroll_manager())
  or employee_id = (select public.auth_linked_employee_id())
);

create policy "Managers and subjects can update consent records"
on public.consent_records
for update
to authenticated
using (
  (select public.is_payroll_manager())
  or employee_id = (select public.auth_linked_employee_id())
)
with check (
  (select public.is_payroll_manager())
  or employee_id = (select public.auth_linked_employee_id())
);

create policy "Managers can delete consent records"
on public.consent_records
for delete
to authenticated
using ((select public.is_payroll_manager()));

-- ---------------------------------------------------------------------------
-- privacy_policy_acceptances SELECT
-- ---------------------------------------------------------------------------
drop policy if exists "acceptances_read_managers" on public.privacy_policy_acceptances;
drop policy if exists "acceptances_read_self" on public.privacy_policy_acceptances;

create policy "Managers and owners can read privacy acceptances"
on public.privacy_policy_acceptances
for select
to authenticated
using (
  (select public.is_payroll_manager())
  or user_id = (select auth.uid())
);

-- ---------------------------------------------------------------------------
-- payroll_savings_entries SELECT: manager OR own/admin helper
-- ---------------------------------------------------------------------------
drop policy if exists "Managers can view all savings entries" on public.payroll_savings_entries;
drop policy if exists "savings_entries_select_own_or_admin" on public.payroll_savings_entries;

create policy "Managers and owners can view savings entries"
on public.payroll_savings_entries
for select
to authenticated
using (
  (select public.is_payroll_manager())
  or employee_id = (select auth.uid())
  or (select public.is_admin())
);

-- ---------------------------------------------------------------------------
-- payslip_design_settings SELECT: portal staff OR own
-- ---------------------------------------------------------------------------
drop policy if exists "Portal staff can read payslip design settings" on public.payslip_design_settings;
drop policy if exists "Users can view their own payslip design settings" on public.payslip_design_settings;

create policy "Owners and portal staff can view payslip design settings"
on public.payslip_design_settings
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.employees e
    where e.user_id = (select auth.uid())
      and e.portal_access is true
  )
);
