-- Staff portal payslips: allow portal employees to read employer profile + design settings,
-- and backfill missing company snapshot fields on historical payslips.

CREATE POLICY "Portal staff can read company details"
ON public.company_details
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.portal_access IS TRUE
  )
);

CREATE POLICY "Portal staff can read payslip design settings"
ON public.payslip_design_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.portal_access IS TRUE
  )
);

UPDATE public.payslips p
SET
  company_name = COALESCE(
    p.company_name,
    cd.companytradingname,
    cd.companylegalname
  ),
  company_address = COALESCE(p.company_address, cd.physicaladdress),
  company_logo_url = COALESCE(p.company_logo_url, cd.logourl)
FROM (
  SELECT
    companytradingname,
    companylegalname,
    physicaladdress,
    logourl
  FROM public.company_details
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1
) cd
WHERE
  p.company_name IS NULL
  OR p.company_address IS NULL
  OR p.company_logo_url IS NULL;
