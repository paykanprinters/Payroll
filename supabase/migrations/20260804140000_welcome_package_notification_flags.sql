-- Welcome Package master switches on notification settings (Settings → Notifications).
-- Template wording remains in message_templates; these flags control whether the
-- welcome package is activated for new employees.

ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS send_welcome_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS send_welcome_sms boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.notification_settings.send_welcome_email IS
  'When true, send the new-employee welcome email (also requires employee_welcome_email template enabled).';
COMMENT ON COLUMN public.notification_settings.send_welcome_sms IS
  'When true, send the new-employee welcome SMS (also requires SMS master switch and employee_welcome_sms template enabled).';
