-- Payroll run void/cancellation support.
-- Adds audit columns so a run can be marked Cancelled (voided) while preserving
-- the record for SARS auditability. status remains free-text; 'Cancelled' is the
-- voided terminal state. No CHECK constraint exists on status, so none to alter.
alter table public.payroll_runs
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid,
  add column if not exists cancellation_reason text;

comment on column public.payroll_runs.cancelled_at is 'Timestamp the run was voided/cancelled.';
comment on column public.payroll_runs.cancelled_by is 'User who voided/cancelled the run.';
comment on column public.payroll_runs.cancellation_reason is 'Reason captured when the run was voided/cancelled.';
