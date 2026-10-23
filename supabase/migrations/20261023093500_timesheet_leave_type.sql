-- Marks a timesheet day that was filled from approved paid leave during clock-time import.
-- The row still carries a full scheduled day so hourly payroll pays the leave day.
-- Null means the row came from real clock punches or manual capture.

alter table public.timesheets
  add column if not exists leave_type text;
