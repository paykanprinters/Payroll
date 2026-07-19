-- Phase A: Disable client GraphQL and strip anonymous public grants.
-- App uses PostgREST (/rest/v1) only; GraphQL is unused.
-- Keep authenticated table grants for REST + RLS.
-- Auth MFA / leaked-password remain dashboard-only (out of scope).

-- ---------------------------------------------------------------------------
-- 1) GraphQL: revoke client access to graphql_public
-- ---------------------------------------------------------------------------
revoke usage on schema graphql_public from anon, authenticated;

do $$
declare
  r record;
begin
  for r in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'graphql_public'
  loop
    execute format(
      'revoke all on function %I.%I(%s) from anon, authenticated',
      r.nspname,
      r.proname,
      r.args
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 2) Anonymous privileges on public schema
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all routines in schema public from anon;

alter default privileges for role postgres in schema public
  revoke all on tables from anon;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon;
alter default privileges for role postgres in schema public
  revoke execute on routines from anon;

-- ---------------------------------------------------------------------------
-- 3) SECURITY DEFINER helpers: no anon/PUBLIC execute (authenticated kept for RLS)
-- ---------------------------------------------------------------------------
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_payroll_manager() from public, anon;
revoke execute on function public.auth_linked_employee_id() from public, anon;

grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_payroll_manager() to authenticated, service_role;
grant execute on function public.auth_linked_employee_id() to authenticated, service_role;
