-- Notifications: Resend-backed email settings + delivery log.

-- Admin helper (idempotent): true when the caller is an Admin.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'Admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Company-wide notification settings (single row).
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_name text,
  from_email text,
  reply_to text,
  admin_email text,
  cc_admins boolean NOT NULL DEFAULT false,
  send_payslip_emails boolean NOT NULL DEFAULT true,
  send_reminders boolean NOT NULL DEFAULT true,
  portal_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Seed the singleton row used by the app (fixed id for stable upserts).
INSERT INTO public.notification_settings (id, from_name, portal_url)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Kan Printers Payroll',
  'https://payroll.kanprinters.co.za/staff/login'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_settings_read_managers" ON public.notification_settings;
DROP POLICY IF EXISTS "notification_settings_write_admins" ON public.notification_settings;

CREATE POLICY "notification_settings_read_managers"
ON public.notification_settings
FOR SELECT
TO authenticated
USING (public.is_payroll_manager());

CREATE POLICY "notification_settings_write_admins"
ON public.notification_settings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Delivery log. Inserts are performed by edge functions using the service role
-- (which bypasses RLS); authenticated managers may read.
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'email',
  category text NOT NULL,
  recipient text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'sent',
  provider_id text,
  error text,
  metadata jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_log_status_check CHECK (status IN ('sent', 'failed', 'queued')),
  CONSTRAINT notification_log_category_check CHECK (category IN ('payslip', 'reminder', 'test', 'other'))
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_log_read_managers" ON public.notification_log;

CREATE POLICY "notification_log_read_managers"
ON public.notification_log
FOR SELECT
TO authenticated
USING (public.is_payroll_manager());

CREATE INDEX IF NOT EXISTS notification_log_created_at_idx ON public.notification_log (created_at DESC);
CREATE INDEX IF NOT EXISTS notification_log_category_idx ON public.notification_log (category);
CREATE INDEX IF NOT EXISTS notification_log_status_idx ON public.notification_log (status);
