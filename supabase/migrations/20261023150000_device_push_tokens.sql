-- Firebase Cloud Messaging tokens for the staff Android app.
-- Written only through register/unregister RPCs so a shared phone can move between employees.
create table if not exists public.device_push_tokens (
  token text primary key,
  user_id uuid not null,
  employee_id uuid not null references public.employees(id) on delete cascade,
  platform text not null default 'android',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists device_push_tokens_employee_id_idx on public.device_push_tokens (employee_id);

alter table public.device_push_tokens enable row level security;
revoke all on public.device_push_tokens from anon, authenticated;

create or replace function public.register_device_push_token(p_token text, p_platform text default 'android')
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_employee_id uuid := public.auth_linked_employee_id();
begin
  if v_employee_id is null then
    raise exception 'No staff portal employee linked to this account';
  end if;
  if p_token is null or length(p_token) < 20 or length(p_token) > 4096 then
    raise exception 'Invalid push token';
  end if;

  insert into public.device_push_tokens (token, user_id, employee_id, platform)
  values (p_token, auth.uid(), v_employee_id, coalesce(nullif(p_platform, ''), 'android'))
  on conflict (token) do update
    set user_id = excluded.user_id,
        employee_id = excluded.employee_id,
        platform = excluded.platform,
        updated_at = now();
end;
$$;

create or replace function public.unregister_device_push_token(p_token text)
returns void
language sql
security definer
set search_path to ''
as $$
  delete from public.device_push_tokens
  where token = p_token and user_id = auth.uid();
$$;

revoke execute on function public.register_device_push_token(text, text) from public, anon;
revoke execute on function public.unregister_device_push_token(text) from public, anon;
grant execute on function public.register_device_push_token(text, text) to authenticated;
grant execute on function public.unregister_device_push_token(text) to authenticated;

-- One "payslip ready" push per employee per pay period, even if the run is regenerated.
create table if not exists public.payslip_push_notifications (
  employee_id uuid not null references public.employees(id) on delete cascade,
  pay_period text not null,
  payslip_id uuid,
  sent_at timestamptz not null default now(),
  primary key (employee_id, pay_period)
);

alter table public.payslip_push_notifications enable row level security;
revoke all on public.payslip_push_notifications from anon, authenticated;
