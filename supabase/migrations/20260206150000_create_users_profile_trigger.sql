-- Auto-provision public.users row when a new auth user signs up
-- Ensures the app can fetch a profile (role/name/email) immediately after login.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
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
    v_role := coalesce(new.raw_user_meta_data ->> 'role', 'Staff');
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
        -- Don't downgrade an existing Admin role
        role = case when public.users.role = 'Admin' then 'Admin' else excluded.role end,
        status = excluded.status,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();