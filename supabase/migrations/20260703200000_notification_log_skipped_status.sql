-- Allow logging skipped notification attempts (e.g. no email on file, template disabled).
ALTER TABLE public.notification_log
  DROP CONSTRAINT IF EXISTS notification_log_status_check;

ALTER TABLE public.notification_log
  ADD CONSTRAINT notification_log_status_check
  CHECK (status IN ('sent', 'failed', 'queued', 'skipped'));
