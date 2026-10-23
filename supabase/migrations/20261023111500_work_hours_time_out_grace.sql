-- Minutes after the scheduled end time that a clock-out still counts as finishing on time.
-- Clock-outs beyond the grace keep their full time so authorised overtime is still paid.

alter table public.work_hours_settings
  add column if not exists time_out_grace_minutes integer not null default 15;
