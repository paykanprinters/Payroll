-- Phase B2: Remove Admin ALL vs SELECT overlaps; harden GraphQL entrypoints.
-- Fold admin writes into command-specific policies so SELECT is single-permissive.

-- ---------------------------------------------------------------------------
-- GraphQL: revoke EXECUTE (prior revoke may have been incomplete via PUBLIC)
-- ---------------------------------------------------------------------------
revoke usage on schema graphql from anon, authenticated;
revoke usage on schema graphql_public from anon, authenticated;

do $$
declare
  r record;
begin
  for r in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('graphql_public', 'graphql')
  loop
    execute format(
      'revoke all on function %I.%I(%s) from public, anon, authenticated',
      r.nspname,
      r.proname,
      r.args
    );
  end loop;
end
$$;

-- Hide public tables from GraphQL schema introspection (REST unchanged).
do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
  loop
    execute format(
      'comment on table public.%I is %L',
      r.relname,
      '@graphql({"ignore": true})'
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- loans: Admin ALL redundant with is_payroll_manager OR policies
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can manage all loans" on public.loans;

-- ---------------------------------------------------------------------------
-- saving_plans: drop Admin ALL; allow admin/manager on writes
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can manage all saving plans" on public.saving_plans;
drop policy if exists "Employees can insert their own saving plans" on public.saving_plans;
drop policy if exists "Employees can update their own saving plans" on public.saving_plans;
drop policy if exists "Employees can delete their own saving plans" on public.saving_plans;

create policy "Managers and owners can insert saving plans"
on public.saving_plans
for insert
to authenticated
with check (
  (select public.is_payroll_manager())
  or (select auth.uid()) = employee_id
);

create policy "Managers and owners can update saving plans"
on public.saving_plans
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

create policy "Managers and owners can delete saving plans"
on public.saving_plans
for delete
to authenticated
using (
  (select public.is_payroll_manager())
  or (select auth.uid()) = employee_id
);

-- ---------------------------------------------------------------------------
-- timesheets: drop Admin ALL; fold admin into write policies
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can manage all timesheets" on public.timesheets;
drop policy if exists "Employees can insert their own timesheets" on public.timesheets;
drop policy if exists "Employees can update their own timesheets if not locked" on public.timesheets;
drop policy if exists "Employees can delete their own timesheets if not locked" on public.timesheets;

create policy "Admins and owners can insert timesheets"
on public.timesheets
for insert
to authenticated
with check (
  (select public.is_admin())
  or (select auth.uid()) = employee_id
);

create policy "Admins and owners can update timesheets"
on public.timesheets
for update
to authenticated
using (
  (select public.is_admin())
  or (
    (select auth.uid()) = employee_id
    and status <> 'Locked'
  )
)
with check (
  (select public.is_admin())
  or (
    (select auth.uid()) = employee_id
    and status <> 'Locked'
  )
);

create policy "Admins and owners can delete timesheets"
on public.timesheets
for delete
to authenticated
using (
  (select public.is_admin())
  or (
    (select auth.uid()) = employee_id
    and status <> 'Locked'
  )
);

-- ---------------------------------------------------------------------------
-- payslips: drop Admin ALL; managers write, linked staff read (existing SELECT)
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can manage all payslips" on public.payslips;

create policy "Payroll managers can insert payslips"
on public.payslips
for insert
to authenticated
with check ((select public.is_payroll_manager()));

create policy "Payroll managers can update payslips"
on public.payslips
for update
to authenticated
using ((select public.is_payroll_manager()))
with check ((select public.is_payroll_manager()));

create policy "Payroll managers can delete payslips"
on public.payslips
for delete
to authenticated
using ((select public.is_payroll_manager()));

-- ---------------------------------------------------------------------------
-- todos: drop Admin ALL; fold is_admin into user policies
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can manage all todos" on public.todos;
drop policy if exists "todos_user_select" on public.todos;
drop policy if exists "todos_user_insert" on public.todos;
drop policy if exists "todos_user_update" on public.todos;
drop policy if exists "todos_user_delete" on public.todos;

create policy "Admins and assignees can select todos"
on public.todos
for select
to authenticated
using (
  (select public.is_admin())
  or assigned_user_id = (select auth.uid())
  or employee_id = (select auth.uid())
);

create policy "Admins and assignees can insert todos"
on public.todos
for insert
to authenticated
with check (
  (select public.is_admin())
  or assigned_user_id = (select auth.uid())
  or employee_id = (select auth.uid())
);

create policy "Admins and assignees can update todos"
on public.todos
for update
to authenticated
using (
  (select public.is_admin())
  or assigned_user_id = (select auth.uid())
  or employee_id = (select auth.uid())
)
with check (
  (select public.is_admin())
  or assigned_user_id = (select auth.uid())
  or employee_id = (select auth.uid())
);

create policy "Admins and assignees can delete todos"
on public.todos
for delete
to authenticated
using (
  (select public.is_admin())
  or assigned_user_id = (select auth.uid())
  or employee_id = (select auth.uid())
);

-- ---------------------------------------------------------------------------
-- Admin ALL + manager SELECT tables: rewrite Admin as non-SELECT writes
-- ---------------------------------------------------------------------------
drop policy if exists "breach_write_admins" on public.data_breach_incidents;
create policy "breach_write_admins"
on public.data_breach_incidents
for insert
to authenticated
with check ((select public.is_admin()));
create policy "breach_update_admins"
on public.data_breach_incidents
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "breach_delete_admins"
on public.data_breach_incidents
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "processing_write_admins" on public.data_processing_register;
create policy "processing_write_admins"
on public.data_processing_register
for insert
to authenticated
with check ((select public.is_admin()));
create policy "processing_update_admins"
on public.data_processing_register
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "processing_delete_admins"
on public.data_processing_register
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "message_templates_write_admins" on public.message_templates;
create policy "message_templates_write_admins"
on public.message_templates
for insert
to authenticated
with check ((select public.is_admin()));
create policy "message_templates_update_admins"
on public.message_templates
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "message_templates_delete_admins"
on public.message_templates
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "notification_settings_write_admins" on public.notification_settings;
create policy "notification_settings_write_admins"
on public.notification_settings
for insert
to authenticated
with check ((select public.is_admin()));
create policy "notification_settings_update_admins"
on public.notification_settings
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "notification_settings_delete_admins"
on public.notification_settings
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "popia_settings_write_admins" on public.popia_settings;
create policy "popia_settings_write_admins"
on public.popia_settings
for insert
to authenticated
with check ((select public.is_admin()));
create policy "popia_settings_update_admins"
on public.popia_settings
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "popia_settings_delete_admins"
on public.popia_settings
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "privacy_policies_write_admins" on public.privacy_policies;
create policy "privacy_policies_write_admins"
on public.privacy_policies
for insert
to authenticated
with check ((select public.is_admin()));
create policy "privacy_policies_update_admins"
on public.privacy_policies
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "privacy_policies_delete_admins"
on public.privacy_policies
for delete
to authenticated
using ((select public.is_admin()));

-- Tax tables: Admin ALL overlaps authenticated read-all SELECT
drop policy if exists "Admins can manage PAYE brackets" on public.tax_brackets_paye;
create policy "Admins can insert PAYE brackets"
on public.tax_brackets_paye
for insert
to authenticated
with check ((select public.is_admin()));
create policy "Admins can update PAYE brackets"
on public.tax_brackets_paye
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "Admins can delete PAYE brackets"
on public.tax_brackets_paye
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can manage UIF/SDL rates" on public.tax_rates_uif_sdl;
create policy "Admins can insert UIF/SDL rates"
on public.tax_rates_uif_sdl
for insert
to authenticated
with check ((select public.is_admin()));
create policy "Admins can update UIF/SDL rates"
on public.tax_rates_uif_sdl
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "Admins can delete UIF/SDL rates"
on public.tax_rates_uif_sdl
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can manage tax years" on public.tax_years;
create policy "Admins can insert tax years"
on public.tax_years
for insert
to authenticated
with check ((select public.is_admin()));
create policy "Admins can update tax years"
on public.tax_years
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "Admins can delete tax years"
on public.tax_years
for delete
to authenticated
using ((select public.is_admin()));
