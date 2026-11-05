-- Read-only Accountant login for the external accountant.
-- Accountants may only SELECT payroll data, only while their access is active,
-- and only after passing two-factor authentication (aal2).

-- 1. Role and access end date
alter table public.users drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check check (role = any (array['Admin', 'Manager', 'Staff', 'Accountant']));

alter table public.users add column if not exists access_expires_at timestamptz;

comment on column public.users.access_expires_at is
  'Accountant logins stop reading payroll data after this time. Null means no end date.';

-- Users may edit their own profile but never their role, status or access end date.
drop policy if exists "Admins and owners can update user profiles" on public.users;
create policy "Admins and owners can update user profiles" on public.users
  for update to authenticated
  using ((select public.is_admin()) or ((select auth.uid()) = id))
  with check (
    (select public.is_admin())
    or (
      ((select auth.uid()) = id)
      and role = (select u.role from public.users u where u.id = (select auth.uid()))
      and status = (select u.status from public.users u where u.id = (select auth.uid()))
      and access_expires_at is not distinct from (
        select u.access_expires_at from public.users u where u.id = (select auth.uid())
      )
    )
  );

-- 2. Reader check
create or replace function public.is_payroll_reader()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and (
        u.role in ('Admin', 'Manager')
        or (
          u.role = 'Accountant'
          and u.status = 'Active'
          and (u.access_expires_at is null or u.access_expires_at > now())
          and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
        )
      )
  );
$function$;

revoke all on function public.is_payroll_reader() from public, anon;
grant execute on function public.is_payroll_reader() to authenticated;

-- 3. SELECT-only policies. No insert, update or delete is granted to Accountants.
do $$
declare
  t text;
  tables text[] := array[
    'employees',
    'payslips',
    'payroll_runs',
    'payroll_run_items',
    'run_snapshots',
    'loans',
    'saving_plans',
    'payroll_savings_entries',
    'payroll_savings_payments',
    'timesheets',
    'leave_records',
    'audit_logs',
    'company_details',
    'pay_cycle_settings',
    'payment_batches',
    'payment_batch_items',
    'earning_components',
    'deduction_components',
    'employee_component_assignments',
    'overtime_rules',
    'public_holidays',
    'work_hours_settings',
    'report_design_settings',
    'payslip_design_settings',
    'user_tax_settings',
    'company_closures',
    'users'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists %I on public.%I', 'Accountants can read ' || t, t);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select public.is_payroll_reader()))',
      'Accountants can read ' || t,
      t
    );
  end loop;
end $$;
