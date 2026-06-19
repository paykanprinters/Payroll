-- Store biometric attendance API URL on company settings row
ALTER TABLE public.company_details
  ADD COLUMN IF NOT EXISTS biometric_api_url text;

COMMENT ON COLUMN public.company_details.biometric_api_url IS
  'HTTP endpoint returning biometric attendance log lines for timesheet import.';
