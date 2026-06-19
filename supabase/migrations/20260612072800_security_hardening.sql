-- Security hardening (applied to the live project on 2026-06-12):
--
-- 1. Recreate the signup trigger function so the role can never come from
--    user-editable raw_user_meta_data (privilege-escalation vector when
--    public signup is enabled).
-- 2. Drop the orphaned duplicate handler public.handle_new_user (not wired
--    to any trigger).
-- 3. Replace the over-broad "Staff can view all payslips" policy with one
--    scoped to the staff member's own linked employee record.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_name text;
  v_email text;
begin
  v_email := new.email;

  -- Allowlist promotion (prevents lockout for known admin email)
  if v_email in ('info@kanprinters.co.za') then
    v_role := 'Admin';
  -- First user becomes Admin to avoid lockout in fresh projects
  elsif (select count(*) from public.users) = 0 then
    v_role := 'Admin';
  else
    -- SECURITY: role is server-controlled. Never read it from
    -- raw_user_meta_data, which is attacker-controlled at signup.
    v_role := 'Staff';
  end if;

  v_name := coalesce(
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'full_name',
    nullif(split_part(v_email, '@', 1), ''),
    v_email
  );

  insert into public.users (id, name, email, role, status)
  values (new.id, v_name, v_email, v_role, 'Active')
  on conflict (id) do update
    set name = excluded.name,
        email = excluded.email,
        -- Never change an existing role from this trigger
        role = public.users.role,
        status = excluded.status,
        updated_at = now();

  return new;
end;
$$;

drop function if exists public.handle_new_user();

drop policy if exists "Staff can view all payslips" on public.payslips;

create policy "Staff can view payslips of their linked employee"
on public.payslips
for select
to authenticated
using (
  exists (
    select 1 from public.employees e
    where e.id = payslips.employee_id
      and (e.user_id = auth.uid() or e.id = auth.uid())
  )
);
