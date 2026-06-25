-- Leave records workflow: status, staff submissions, and RLS.

CREATE TABLE IF NOT EXISTS public.leave_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  leave_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days integer NOT NULL DEFAULT 0,
  working_days integer NOT NULL DEFAULT 0,
  reason text,
  document_url text,
  status text NOT NULL DEFAULT 'Approved',
  submitted_at timestamptz,
  submitted_by uuid,
  reviewed_at timestamptz,
  reviewed_by uuid,
  rejection_reason text,
  source text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leave_records_status_check CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
  CONSTRAINT leave_records_source_check CHECK (source IN ('admin', 'staff'))
);

ALTER TABLE public.leave_records ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Approved';
ALTER TABLE public.leave_records ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE public.leave_records ADD COLUMN IF NOT EXISTS submitted_by uuid;
ALTER TABLE public.leave_records ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.leave_records ADD COLUMN IF NOT EXISTS reviewed_by uuid;
ALTER TABLE public.leave_records ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.leave_records ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'admin';
ALTER TABLE public.leave_records ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.leave_records ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.leave_records SET status = 'Approved' WHERE status IS NULL;
UPDATE public.leave_records SET source = 'admin' WHERE source IS NULL;

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

CREATE OR REPLACE FUNCTION public.auth_linked_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT e.id
  FROM public.employees e
  WHERE e.user_id = auth.uid()
    AND e.portal_access IS TRUE
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.is_payroll_manager() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_payroll_manager() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_payroll_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_payroll_manager() TO service_role;

REVOKE ALL ON FUNCTION public.auth_linked_employee_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_linked_employee_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.auth_linked_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_linked_employee_id() TO service_role;

ALTER TABLE public.leave_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all leave records" ON public.leave_records;
DROP POLICY IF EXISTS "Employees can delete their own leave requests" ON public.leave_records;
DROP POLICY IF EXISTS "Employees can insert their own leave requests" ON public.leave_records;
DROP POLICY IF EXISTS "Employees can update their own leave requests" ON public.leave_records;
DROP POLICY IF EXISTS "Employees can view their own leave records" ON public.leave_records;
DROP POLICY IF EXISTS "Payroll managers can read all leave records" ON public.leave_records;
DROP POLICY IF EXISTS "Staff can read own leave records" ON public.leave_records;
DROP POLICY IF EXISTS "Payroll managers can insert leave records" ON public.leave_records;
DROP POLICY IF EXISTS "Staff can submit own leave requests" ON public.leave_records;
DROP POLICY IF EXISTS "Payroll managers can update leave records" ON public.leave_records;
DROP POLICY IF EXISTS "Staff can cancel own pending leave" ON public.leave_records;
DROP POLICY IF EXISTS "Payroll managers can delete leave records" ON public.leave_records;

CREATE POLICY "Payroll managers can read all leave records"
ON public.leave_records
FOR SELECT
TO authenticated
USING (public.is_payroll_manager());

CREATE POLICY "Staff can read own leave records"
ON public.leave_records
FOR SELECT
TO authenticated
USING (employee_id = public.auth_linked_employee_id());

CREATE POLICY "Payroll managers can insert leave records"
ON public.leave_records
FOR INSERT
TO authenticated
WITH CHECK (public.is_payroll_manager());

CREATE POLICY "Staff can submit own leave requests"
ON public.leave_records
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id = public.auth_linked_employee_id()
  AND status = 'Pending'
  AND source = 'staff'
  AND submitted_by = auth.uid()
);

CREATE POLICY "Payroll managers can update leave records"
ON public.leave_records
FOR UPDATE
TO authenticated
USING (public.is_payroll_manager())
WITH CHECK (public.is_payroll_manager());

CREATE POLICY "Staff can cancel own pending leave"
ON public.leave_records
FOR UPDATE
TO authenticated
USING (
  employee_id = public.auth_linked_employee_id()
  AND status = 'Pending'
  AND source = 'staff'
)
WITH CHECK (
  employee_id = public.auth_linked_employee_id()
  AND status = 'Cancelled'
  AND source = 'staff'
);

CREATE POLICY "Payroll managers can delete leave records"
ON public.leave_records
FOR DELETE
TO authenticated
USING (public.is_payroll_manager());

CREATE INDEX IF NOT EXISTS leave_records_employee_id_idx ON public.leave_records (employee_id);
CREATE INDEX IF NOT EXISTS leave_records_status_idx ON public.leave_records (status);
CREATE INDEX IF NOT EXISTS leave_records_start_date_idx ON public.leave_records (start_date DESC);
