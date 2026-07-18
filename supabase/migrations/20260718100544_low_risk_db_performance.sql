-- Low-risk database performance hardening:
-- 1. Drop duplicate unique index on tax_years (PK already enforces uniqueness).
-- 2. Add covering indexes for unindexed foreign keys.
-- 3. Wrap auth helper calls in RLS policies as InitPlans: (select auth.uid()), etc.
-- 4. Align SECURITY DEFINER helpers to use (select auth.uid()) as well.
--
-- Intentionally out of scope (higher risk / behavioural):
-- - multiple permissive policies consolidation
-- - unused-index drops
-- - Auth MFA / leaked-password settings
-- - revoking EXECUTE on SECURITY DEFINER helpers

-- ---------------------------------------------------------------------------
-- 1) Duplicate index
-- ---------------------------------------------------------------------------
drop index if exists public.tax_years_year_unique_idx;

-- ---------------------------------------------------------------------------
-- 2) Foreign-key covering indexes
-- ---------------------------------------------------------------------------
create index if not exists deduction_components_user_id_idx
  on public.deduction_components (user_id);

create index if not exists earning_components_user_id_idx
  on public.earning_components (user_id);

create index if not exists employee_component_assignments_user_id_idx
  on public.employee_component_assignments (user_id);

create index if not exists employees_user_id_idx
  on public.employees (user_id);

create index if not exists generated_reports_user_id_idx
  on public.generated_reports (user_id);

create index if not exists loans_employee_id_idx
  on public.loans (employee_id);

create index if not exists overtime_rules_user_id_idx
  on public.overtime_rules (user_id);

create index if not exists payment_batch_items_batch_id_idx
  on public.payment_batch_items (batch_id);

create index if not exists payment_batches_run_id_idx
  on public.payment_batches (run_id);

create index if not exists payment_batches_user_id_idx
  on public.payment_batches (user_id);

create index if not exists payroll_run_items_payslip_id_idx
  on public.payroll_run_items (payslip_id);

create index if not exists payroll_run_items_run_id_idx
  on public.payroll_run_items (run_id);

create index if not exists payroll_runs_user_id_idx
  on public.payroll_runs (user_id);

create index if not exists payroll_savings_entries_employee_id_idx
  on public.payroll_savings_entries (employee_id);

create index if not exists payslip_design_settings_user_id_idx
  on public.payslip_design_settings (user_id);

create index if not exists public_holidays_user_id_idx
  on public.public_holidays (user_id);

create index if not exists report_design_settings_user_id_idx
  on public.report_design_settings (user_id);

create index if not exists run_snapshots_run_id_idx
  on public.run_snapshots (run_id);

create index if not exists run_snapshots_user_id_idx
  on public.run_snapshots (user_id);

create index if not exists saving_plans_employee_id_idx
  on public.saving_plans (employee_id);

create index if not exists tax_brackets_paye_tax_year_idx
  on public.tax_brackets_paye (tax_year);

create index if not exists timesheets_employee_id_idx
  on public.timesheets (employee_id);

create index if not exists todos_assigned_user_id_idx
  on public.todos (assigned_user_id);

-- ---------------------------------------------------------------------------
-- 3) Helper functions: evaluate auth.uid() once per statement
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
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
      and u.role = 'Admin'
  );
$function$;

create or replace function public.is_payroll_manager()
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
      and u.role in ('Admin', 'Manager')
  );
$function$;

create or replace function public.auth_linked_employee_id()
returns uuid
language sql
stable
security definer
set search_path to ''
as $function$
  select e.id
  from public.employees e
  where e.user_id = (select auth.uid())
    and e.portal_access is true
  limit 1;
$function$;

-- ---------------------------------------------------------------------------
-- 4) Wrap per-row auth/helper calls in RLS policies as InitPlans
-- ---------------------------------------------------------------------------
create or replace function pg_temp.wrap_rls_initplan_expr(expr text)
returns text
language plpgsql
as $fn$
declare
  out_expr text := expr;
begin
  if out_expr is null then
    return null;
  end if;

  -- Protect already-wrapped forms, then wrap bare calls.
  out_expr := replace(out_expr, '(select auth.uid())', '__W_AUTH_UID__');
  out_expr := replace(out_expr, '(SELECT auth.uid())', '__W_AUTH_UID__');
  out_expr := replace(out_expr, 'auth.uid()', '(select auth.uid())');
  out_expr := replace(out_expr, '__W_AUTH_UID__', '(select auth.uid())');

  out_expr := replace(out_expr, '(select auth.role())', '__W_AUTH_ROLE__');
  out_expr := replace(out_expr, '(SELECT auth.role())', '__W_AUTH_ROLE__');
  out_expr := replace(out_expr, 'auth.role()', '(select auth.role())');
  out_expr := replace(out_expr, '__W_AUTH_ROLE__', '(select auth.role())');

  out_expr := replace(out_expr, '(select auth.jwt())', '__W_AUTH_JWT__');
  out_expr := replace(out_expr, '(SELECT auth.jwt())', '__W_AUTH_JWT__');
  out_expr := replace(out_expr, 'auth.jwt()', '(select auth.jwt())');
  out_expr := replace(out_expr, '__W_AUTH_JWT__', '(select auth.jwt())');

  out_expr := replace(out_expr, '(select is_admin())', '__W_IS_ADMIN__');
  out_expr := replace(out_expr, '(SELECT is_admin())', '__W_IS_ADMIN__');
  out_expr := replace(out_expr, 'is_admin()', '(select is_admin())');
  out_expr := replace(out_expr, '__W_IS_ADMIN__', '(select is_admin())');

  out_expr := replace(out_expr, '(select is_payroll_manager())', '__W_IS_PM__');
  out_expr := replace(out_expr, '(SELECT is_payroll_manager())', '__W_IS_PM__');
  out_expr := replace(out_expr, 'is_payroll_manager()', '(select is_payroll_manager())');
  out_expr := replace(out_expr, '__W_IS_PM__', '(select is_payroll_manager())');

  out_expr := replace(out_expr, '(select auth_linked_employee_id())', '__W_LINKED_EMP__');
  out_expr := replace(out_expr, '(SELECT auth_linked_employee_id())', '__W_LINKED_EMP__');
  out_expr := replace(out_expr, 'auth_linked_employee_id()', '(select auth_linked_employee_id())');
  out_expr := replace(out_expr, '__W_LINKED_EMP__', '(select auth_linked_employee_id())');

  return out_expr;
end;
$fn$;

do $migration$
declare
  r record;
  new_qual text;
  new_check text;
  roles_csv text;
  ddl text;
  changed boolean;
  rewritten_count integer := 0;
begin
  for r in
    select
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  loop
    new_qual := pg_temp.wrap_rls_initplan_expr(r.qual);
    new_check := pg_temp.wrap_rls_initplan_expr(r.with_check);
    changed := (new_qual is distinct from r.qual) or (new_check is distinct from r.with_check);

    if not changed then
      continue;
    end if;

    roles_csv := array_to_string(r.roles, ', ');
    if roles_csv is null or roles_csv = '' then
      roles_csv := 'public';
    end if;

    execute format(
      'drop policy if exists %I on %I.%I',
      r.policyname,
      r.schemaname,
      r.tablename
    );

    ddl := format(
      'create policy %I on %I.%I as %s for %s to %s',
      r.policyname,
      r.schemaname,
      r.tablename,
      r.permissive,
      r.cmd,
      roles_csv
    );

    if new_qual is not null then
      ddl := ddl || format(' using (%s)', new_qual);
    end if;

    if new_check is not null then
      ddl := ddl || format(' with check (%s)', new_check);
    end if;

    execute ddl;
    rewritten_count := rewritten_count + 1;
  end loop;

  raise notice 'Rewrote % RLS policies for auth InitPlan caching', rewritten_count;
end;
$migration$;

drop function if exists pg_temp.wrap_rls_initplan_expr(text);
