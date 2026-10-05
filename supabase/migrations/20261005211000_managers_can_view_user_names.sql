-- The second checker is often a Manager. User profiles were readable
-- only by Admins, so the payroll run showed the reviewer's database id
-- instead of their name.

drop policy if exists "Admins and owners can view user profiles" on public.users;
drop policy if exists "Payroll managers and owners can view user profiles" on public.users;

create policy "Payroll managers and owners can view user profiles"
on public.users
for select
to authenticated
using (
  (select public.is_payroll_manager())
  or (select auth.uid()) = id
);
