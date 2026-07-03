-- Managers can maintain employee records in the admin portal (UI already exposes this).
-- Previously only Admins could insert/update, which caused silent save failures for Managers.

CREATE POLICY "Managers can insert employees"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role = 'Manager'
  )
);

CREATE POLICY "Managers can update any employee"
ON public.employees
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role = 'Manager'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role = 'Manager'
  )
);
