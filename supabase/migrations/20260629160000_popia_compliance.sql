-- POPIA compliance: information-officer/retention settings, consent register,
-- versioned privacy notice + acceptances, breach register, processing register,
-- and employee anonymisation tracking columns.
--
-- Relies on helpers created in earlier migrations:
--   public.is_admin()                -> caller is Admin
--   public.is_payroll_manager()      -> caller is Admin or Manager
--   public.auth_linked_employee_id() -> employee uuid linked to the auth user

-- ---------------------------------------------------------------------------
-- Employee anonymisation tracking (retention-aware erasure)
-- ---------------------------------------------------------------------------
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz,
  ADD COLUMN IF NOT EXISTS anonymized_by uuid;

-- ---------------------------------------------------------------------------
-- POPIA settings (single row): Information Officer + retention + data residency
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.popia_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  information_officer_name text,
  information_officer_email text,
  information_officer_phone text,
  deputy_officer_name text,
  deputy_officer_email text,
  retention_years integer NOT NULL DEFAULT 5,
  data_residency_note text,
  privacy_policy_url text,
  regulator_complaint_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT popia_settings_retention_check CHECK (retention_years BETWEEN 1 AND 30)
);

INSERT INTO public.popia_settings (
  id, retention_years, data_residency_note, regulator_complaint_url
)
VALUES (
  '00000000-0000-0000-0000-0000000000a1',
  5,
  'Personal information is processed and stored using Supabase, hosted in the EU (Paris, eu-west-3). The EU provides personal-information protection comparable to POPIA, satisfying the conditions for lawful trans-border processing under section 72 of POPIA.',
  'https://inforegulator.org.za/'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.popia_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "popia_settings_read_all" ON public.popia_settings;
DROP POLICY IF EXISTS "popia_settings_write_admins" ON public.popia_settings;

-- Any authenticated user may read (staff portal needs the IO contact + residency note).
CREATE POLICY "popia_settings_read_all"
ON public.popia_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "popia_settings_write_admins"
ON public.popia_settings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Consent register (esp. biometric special PI, notification opt-in)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  consent_type text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  method text,
  notes text,
  source text NOT NULL DEFAULT 'admin',
  granted_at timestamptz,
  revoked_at timestamptz,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_type_check CHECK (
    consent_type IN (
      'data_processing',
      'biometric',
      'notifications_email',
      'notifications_sms',
      'third_party_sharing'
    )
  ),
  CONSTRAINT consent_source_check CHECK (source IN ('admin', 'self', 'import')),
  CONSTRAINT consent_unique_per_type UNIQUE (employee_id, consent_type)
);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consent_read_managers" ON public.consent_records;
DROP POLICY IF EXISTS "consent_read_self" ON public.consent_records;
DROP POLICY IF EXISTS "consent_write_managers" ON public.consent_records;
DROP POLICY IF EXISTS "consent_write_self" ON public.consent_records;
DROP POLICY IF EXISTS "consent_update_self" ON public.consent_records;

CREATE POLICY "consent_read_managers"
ON public.consent_records
FOR SELECT
TO authenticated
USING (public.is_payroll_manager());

CREATE POLICY "consent_read_self"
ON public.consent_records
FOR SELECT
TO authenticated
USING (employee_id = public.auth_linked_employee_id());

CREATE POLICY "consent_write_managers"
ON public.consent_records
FOR ALL
TO authenticated
USING (public.is_payroll_manager())
WITH CHECK (public.is_payroll_manager());

-- Staff may record/update their own consent (self-service opt-in/out).
CREATE POLICY "consent_write_self"
ON public.consent_records
FOR INSERT
TO authenticated
WITH CHECK (employee_id = public.auth_linked_employee_id());

CREATE POLICY "consent_update_self"
ON public.consent_records
FOR UPDATE
TO authenticated
USING (employee_id = public.auth_linked_employee_id())
WITH CHECK (employee_id = public.auth_linked_employee_id());

CREATE INDEX IF NOT EXISTS consent_records_employee_idx ON public.consent_records (employee_id);

-- ---------------------------------------------------------------------------
-- Versioned privacy notice + acceptance tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.privacy_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  summary text,
  effective_date date,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT privacy_policies_version_unique UNIQUE (version)
);

ALTER TABLE public.privacy_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "privacy_policies_read_published" ON public.privacy_policies;
DROP POLICY IF EXISTS "privacy_policies_read_admins" ON public.privacy_policies;
DROP POLICY IF EXISTS "privacy_policies_write_admins" ON public.privacy_policies;

-- Everyone authenticated can read published policies; admins can read drafts too.
CREATE POLICY "privacy_policies_read_published"
ON public.privacy_policies
FOR SELECT
TO authenticated
USING (published OR public.is_admin());

CREATE POLICY "privacy_policies_write_admins"
ON public.privacy_policies
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.privacy_policy_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES public.privacy_policies(id) ON DELETE CASCADE,
  policy_version text NOT NULL,
  user_id uuid,
  employee_id uuid,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT acceptance_unique_per_user UNIQUE (policy_id, user_id)
);

ALTER TABLE public.privacy_policy_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acceptances_read_managers" ON public.privacy_policy_acceptances;
DROP POLICY IF EXISTS "acceptances_read_self" ON public.privacy_policy_acceptances;
DROP POLICY IF EXISTS "acceptances_insert_self" ON public.privacy_policy_acceptances;

CREATE POLICY "acceptances_read_managers"
ON public.privacy_policy_acceptances
FOR SELECT
TO authenticated
USING (public.is_payroll_manager());

CREATE POLICY "acceptances_read_self"
ON public.privacy_policy_acceptances
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "acceptances_insert_self"
ON public.privacy_policy_acceptances
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS acceptances_policy_idx ON public.privacy_policy_acceptances (policy_id);

-- ---------------------------------------------------------------------------
-- Data breach / security incident register (POPIA s22)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_breach_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  discovered_at timestamptz,
  occurred_at timestamptz,
  affected_count integer,
  affected_description text,
  regulator_notified boolean NOT NULL DEFAULT false,
  regulator_notified_at timestamptz,
  subjects_notified boolean NOT NULL DEFAULT false,
  subjects_notified_at timestamptz,
  remediation text,
  reported_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT breach_severity_check CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT breach_status_check CHECK (status IN ('open', 'contained', 'resolved', 'closed'))
);

ALTER TABLE public.data_breach_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "breach_read_managers" ON public.data_breach_incidents;
DROP POLICY IF EXISTS "breach_write_admins" ON public.data_breach_incidents;

CREATE POLICY "breach_read_managers"
ON public.data_breach_incidents
FOR SELECT
TO authenticated
USING (public.is_payroll_manager());

CREATE POLICY "breach_write_admins"
ON public.data_breach_incidents
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS breach_status_idx ON public.data_breach_incidents (status);
CREATE INDEX IF NOT EXISTS breach_created_idx ON public.data_breach_incidents (created_at DESC);

-- ---------------------------------------------------------------------------
-- Processing register (record of processing activities, POPIA s17 / PAIA)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_processing_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  purpose text NOT NULL,
  lawful_basis text NOT NULL,
  data_subjects text,
  recipients text,
  retention text,
  cross_border boolean NOT NULL DEFAULT false,
  special_pi boolean NOT NULL DEFAULT false,
  notes text,
  sort_order integer NOT NULL DEFAULT 100,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.data_processing_register ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "processing_read_managers" ON public.data_processing_register;
DROP POLICY IF EXISTS "processing_write_admins" ON public.data_processing_register;

CREATE POLICY "processing_read_managers"
ON public.data_processing_register
FOR SELECT
TO authenticated
USING (public.is_payroll_manager());

CREATE POLICY "processing_write_admins"
ON public.data_processing_register
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Seed the processing register with the activities this payroll system performs.
INSERT INTO public.data_processing_register
  (category, purpose, lawful_basis, data_subjects, recipients, retention, cross_border, special_pi, sort_order)
VALUES
  ('Employee master data',
   'Administer employment and process payroll',
   'Contractual necessity; legal obligation',
   'Employees', 'Payroll administrators; SARS', '5 years after termination', true, false, 10),
  ('Remuneration & tax (PAYE/UIF/SDL)',
   'Calculate pay, deductions and statutory contributions',
   'Legal obligation (Income Tax Act, UIF Act, BCEA)',
   'Employees', 'SARS; UIF; Dept. of Labour', '5 years (SARS)', true, false, 20),
  ('Banking details',
   'Disburse salaries via EFT',
   'Contractual necessity',
   'Employees', 'Employer bank', '5 years', true, false, 30),
  ('Biometric / clock-in data',
   'Verify attendance and working hours',
   'Consent (special personal information)',
   'Employees', 'Biometric device provider', 'Duration of employment', true, true, 40),
  ('Medical scheme membership',
   'Apply medical-aid tax credits',
   'Legal obligation; consent',
   'Employees', 'SARS', '5 years', true, true, 50),
  ('Contact details (email/mobile)',
   'Send payslips and payroll notifications',
   'Contractual necessity; consent (marketing-style)',
   'Employees', 'Resend (email); SMS Portal (SMS)', 'Duration of employment', true, false, 60),
  ('Emergency contacts',
   'Contact next of kin in emergencies',
   'Legitimate interest',
   'Employees and their nominated contacts', 'Employer', 'Duration of employment', false, false, 70)
ON CONFLICT DO NOTHING;

-- Seed an initial DRAFT privacy notice for admins to review, complete and publish.
INSERT INTO public.privacy_policies (id, version, title, summary, effective_date, published, body)
VALUES (
  '00000000-0000-0000-0000-0000000000b1',
  '1.0-draft',
  'Employee Privacy Notice',
  'How we collect, use, store and protect your personal information for payroll.',
  NULL,
  false,
  E'# Employee Privacy Notice (DRAFT)\n\n_This is a starter template. Review with your Information Officer / legal advisor and publish once finalised._\n\n## 1. Who we are\n[Company name] ("we", "us") is the responsible party for the personal information processed in this payroll system. Our Information Officer is listed in the company''s POPIA settings.\n\n## 2. What we collect\nIdentity and contact details, banking details, tax and statutory numbers, remuneration, attendance/biometric data, medical-scheme membership, and emergency contacts.\n\n## 3. Why we process it (lawful basis)\nTo administer your employment and pay you, to meet legal obligations (SARS, UIF, BCEA), and, where applicable, with your consent (e.g. biometric attendance).\n\n## 4. Who we share it with\nSARS, the UIF, your bank, and our processors (email, SMS and biometric providers) under appropriate operator agreements.\n\n## 5. Where it is stored\nData is hosted by Supabase in the EU. The EU offers protection comparable to POPIA (section 72).\n\n## 6. How long we keep it\nPayroll records are retained for at least 5 years as required by law, after which personal information is anonymised or deleted.\n\n## 7. Your rights\nYou may request access to, or correction of, your personal information, object to processing, or lodge a complaint with the Information Regulator.\n\n## 8. Security\nWe protect your information with access controls, encryption in transit and at rest, audit logging and row-level security.\n\n## 9. Contact\nContact our Information Officer (see POPIA settings) for any privacy request.'
)
ON CONFLICT (id) DO NOTHING;
