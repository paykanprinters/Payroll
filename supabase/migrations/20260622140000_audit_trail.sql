-- Central audit trail for auth, changes, warnings, alerts, and system errors.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  severity text NOT NULL DEFAULT 'info',
  module text NOT NULL DEFAULT 'system',
  action text NOT NULL,
  message text,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_severity_check CHECK (
    severity IN ('info', 'change', 'warning', 'alert', 'error', 'auth')
  )
);

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS module text NOT NULL DEFAULT 'system';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS message text;

CREATE OR REPLACE FUNCTION public.is_payroll_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role IN ('Admin', 'Manager')
  );
$$;

REVOKE ALL ON FUNCTION public.is_payroll_manager() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_payroll_manager() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_payroll_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_payroll_manager() TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payroll managers can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

CREATE POLICY "Payroll managers can read audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_payroll_manager());

CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_severity_idx ON public.audit_logs (severity);
CREATE INDEX IF NOT EXISTS audit_logs_module_idx ON public.audit_logs (module);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id);
