-- Production hardening: RPC surface, trigger search_path, storage listing, company name.

-- Block anonymous direct RPC calls to is_admin(); keep for authenticated RLS policies.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Pin search_path on trigger helpers (Supabase linter 0011).
CREATE OR REPLACE FUNCTION public.update_last_updated_savings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Bucket-wide SELECT policies allow listing all objects; bucket stays public for direct URLs.
DROP POLICY IF EXISTS "Allow public read access to company logos" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_read" ON storage.objects;

CREATE POLICY "company_logo_object_read"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'company-logos'
  AND name = 'company_logo.png'
);

-- Align payslip/report trading name with Kan Printers branding.
UPDATE public.company_details
SET companytradingname = 'Kan Printers & Promo'
WHERE companytradingname IS DISTINCT FROM 'Kan Printers & Promo';
