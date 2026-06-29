-- SMS notifications (SMS Portal): add channel settings to notification_settings.
-- Credentials live in edge-function secrets, never in the database.

ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS sms_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_sender_id text,
  ADD COLUMN IF NOT EXISTS send_payslip_sms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS send_sms_reminders boolean NOT NULL DEFAULT false;

-- notification_log already supports channel = 'sms'; helpful index for filtering.
CREATE INDEX IF NOT EXISTS notification_log_channel_idx ON public.notification_log (channel);
