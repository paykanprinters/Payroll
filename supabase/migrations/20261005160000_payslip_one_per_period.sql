-- One payslip per employee and pay period.
-- A second Generate used to insert another row because this key was not unique.
-- Keep the earliest row (the first run) and drop later duplicates.

with ranked as (
  select
    id,
    row_number() over (
      partition by employee_id, pay_period
      order by created_at asc nulls last, id asc
    ) as rn
  from public.payslips
  where employee_id is not null
),
extras as (
  select id from ranked where rn > 1
)
delete from public.payroll_run_items
where payslip_id in (select id from extras);

with ranked as (
  select
    id,
    row_number() over (
      partition by employee_id, pay_period
      order by created_at asc nulls last, id asc
    ) as rn
  from public.payslips
  where employee_id is not null
)
delete from public.payslips
where id in (select id from ranked where rn > 1);

create unique index if not exists payslips_employee_id_pay_period_key
  on public.payslips (employee_id, pay_period);
