-- The pay cycle is one company setting. Managers use it when they run
-- payroll. Only an Admin can change it.

do $$
declare
  policy_name text;
begin
  for policy_name in
    select pol.polname
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
      and cls.relname = 'pay_cycle_settings'
  loop
    execute format('drop policy if exists %I on public.pay_cycle_settings', policy_name);
  end loop;
end $$;

create policy "Payroll managers can view pay cycle settings"
on public.pay_cycle_settings
for select
to authenticated
using ((select public.is_payroll_manager()));

create policy "Admins can insert pay cycle settings"
on public.pay_cycle_settings
for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admins can update pay cycle settings"
on public.pay_cycle_settings
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can delete pay cycle settings"
on public.pay_cycle_settings
for delete
to authenticated
using ((select public.is_admin()));
