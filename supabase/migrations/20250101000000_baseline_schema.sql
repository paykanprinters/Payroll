-- Baseline public schema for fresh Supabase projects.
-- Generated from production metadata. Safe on existing DBs (IF NOT EXISTS).
-- RLS policies, functions, and incremental changes live in later migrations.
-- Regenerate: node scripts/generate-baseline-schema.mjs scripts/data/columns.json

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  severity text NOT NULL DEFAULT 'info'::text,
  module text NOT NULL DEFAULT 'system'::text,
  message text
);

CREATE TABLE IF NOT EXISTS public.biometric_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_name text NOT NULL,
  zone_name text NOT NULL,
  device_type text NOT NULL,
  device_model text NOT NULL,
  device_category text NOT NULL,
  punch_type text NOT NULL,
  location_id text,
  enabled boolean DEFAULT true,
  ip_address text NOT NULL,
  port_number text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_details (
  id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  companylegalname text,
  companytradingname text,
  companyregistrationnumber text,
  companytaxnumber text,
  vatregistrationnumber text,
  industry text,
  payereferencenumber text,
  uifreferencenumber text,
  sdlreferencenumber text,
  coidaregistrationnumber text,
  physicaladdress text,
  postaladdress text,
  maincontactnumber text,
  alternativecontactnumber text,
  companyemail text,
  companywebsite text,
  bankname text,
  accountholdername text,
  accountnumber text,
  branchcode text,
  accounttype text,
  logourl text,
  logowidth integer,
  logoheight integer,
  logofit text,
  updated_at timestamp with time zone DEFAULT now(),
  active_tax_year integer,
  biometric_api_url text
);

CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  consent_type text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  method text,
  notes text,
  source text NOT NULL DEFAULT 'admin'::text,
  granted_at timestamp with time zone,
  revoked_at timestamp with time zone,
  recorded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_breach_incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium'::text,
  status text NOT NULL DEFAULT 'open'::text,
  discovered_at timestamp with time zone,
  occurred_at timestamp with time zone,
  affected_count integer,
  affected_description text,
  regulator_notified boolean NOT NULL DEFAULT false,
  regulator_notified_at timestamp with time zone,
  subjects_notified boolean NOT NULL DEFAULT false,
  subjects_notified_at timestamp with time zone,
  remediation text,
  reported_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_processing_register (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.deduction_components (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  code text,
  amount numeric NOT NULL DEFAULT 0,
  amount_type text NOT NULL DEFAULT 'fixed'::text,
  effective_start date,
  effective_end date,
  pre_tax boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.earning_components (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  code text,
  amount numeric NOT NULL DEFAULT 0,
  amount_type text NOT NULL DEFAULT 'fixed'::text,
  effective_start date,
  effective_end date,
  taxable boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_component_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  employee_id uuid NOT NULL,
  component_type text NOT NULL,
  component_id uuid NOT NULL,
  override_amount numeric,
  effective_start date,
  effective_end date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  personal_id text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  job_title text NOT NULL,
  salary numeric,
  hourly_rate numeric,
  start_date date NOT NULL,
  id_number text,
  phone_number text,
  emergency_contact_name text,
  emergency_contact_number text,
  emergency_contact_address text,
  address_line1 text,
  address_line2 text,
  city text,
  province text,
  postal_code text,
  tax_reference_number text,
  uif_number text,
  bank_name text,
  bank_account_holder text,
  iban_number text,
  routing_swift_code text,
  bank_account_type text,
  date_of_birth date,
  gender text,
  department text,
  work_location text,
  date_of_confirmation date,
  origin_country text,
  employment_type text,
  portal_access boolean DEFAULT false,
  fathers_name text,
  mol_id text,
  permanent_address text,
  payment_mode text,
  pay_frequency text,
  standard_daily_hours numeric DEFAULT 8,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  custom_employee_id text,
  ignored_incomplete_fields text[] DEFAULT '{}'::text[],
  user_id uuid,
  medical_aid_member boolean NOT NULL DEFAULT false,
  medical_aid_dependants integer NOT NULL DEFAULT 0,
  retirement_fund_contribution_percent numeric NOT NULL DEFAULT 0,
  retirement_fund_contribution_fixed numeric NOT NULL DEFAULT 0,
  anonymized_at timestamp with time zone,
  anonymized_by uuid,
  leave_cycle_start_date date,
  leave_opening_annual_balance numeric(6,2),
  leave_opening_sick_balance numeric(6,2),
  leave_opening_family_balance numeric(6,2),
  annual_leave_entitlement_days numeric(4,1),
  termination_date date
);

CREATE TABLE IF NOT EXISTS public.generated_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  report_title text NOT NULL,
  report_type text NOT NULL,
  content_html text NOT NULL,
  generated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leave_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  leave_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days integer NOT NULL,
  working_days integer NOT NULL,
  reason text,
  document_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'Approved'::text,
  submitted_at timestamp with time zone,
  submitted_by uuid,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  rejection_reason text,
  source text NOT NULL DEFAULT 'admin'::text
);

CREATE TABLE IF NOT EXISTS public.loans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  loan_type text NOT NULL,
  loan_amount numeric NOT NULL,
  repayment_amount numeric NOT NULL,
  frequency text NOT NULL,
  start_date date NOT NULL,
  remaining_balance numeric NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  paused boolean DEFAULT false,
  notes text,
  deduction_history jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  freeze_mode text,
  freeze_start_date date,
  freeze_end_date date,
  freeze_cycles_remaining integer
);

CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  channel text NOT NULL,
  category text NOT NULL,
  name text NOT NULL,
  description text,
  subject text,
  body text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  include_logo boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'email'::text,
  category text NOT NULL,
  recipient text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'sent'::text,
  provider_id text,
  error text,
  metadata jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_name text,
  from_email text,
  reply_to text,
  admin_email text,
  cc_admins boolean NOT NULL DEFAULT false,
  send_payslip_emails boolean NOT NULL DEFAULT true,
  send_reminders boolean NOT NULL DEFAULT true,
  portal_url text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  sms_enabled boolean NOT NULL DEFAULT false,
  sms_sender_id text,
  send_payslip_sms boolean NOT NULL DEFAULT false,
  send_sms_reminders boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.overtime_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  weekday_ot_multiplier numeric NOT NULL DEFAULT 1.5,
  saturday_ot_multiplier numeric NOT NULL DEFAULT 1.5,
  sunday_ot_multiplier numeric NOT NULL DEFAULT 2.0,
  holiday_worked_multiplier numeric NOT NULL DEFAULT 2.0,
  holiday_non_worked_multiplier numeric NOT NULL DEFAULT 1.5,
  night_shift_start text,
  night_shift_end text,
  night_shift_multiplier numeric DEFAULT 1.25,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pay_cycle_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pay_cycle_type text NOT NULL DEFAULT 'Weekly'::text,
  cut_off_day integer NOT NULL DEFAULT 5,
  pay_day_offset integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_batch_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  net_pay numeric NOT NULL,
  account_holder text,
  bank_name text,
  account_number text,
  branch_code text,
  status text NOT NULL DEFAULT 'Pending'::text,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  user_id uuid,
  bank_format text NOT NULL DEFAULT 'EFT-CSV'::text,
  total_items integer NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payroll_run_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  payslip_id uuid,
  pay_period text NOT NULL,
  gross_earnings numeric NOT NULL,
  total_deductions numeric NOT NULL,
  net_pay numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  period_start date NOT NULL,
  period_end date NOT NULL,
  pay_cycle_type text NOT NULL DEFAULT 'Weekly'::text,
  status text NOT NULL DEFAULT 'Draft'::text,
  approved_by uuid,
  approved_at timestamp with time zone,
  locked_at timestamp with time zone,
  paid_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  cancelled_by uuid,
  cancellation_reason text
);

CREATE TABLE IF NOT EXISTS public.payroll_savings_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  original_amount numeric NOT NULL,
  override_amount numeric,
  amount_paid numeric NOT NULL DEFAULT 0,
  remaining_balance numeric,
  status text NOT NULL DEFAULT 'pending'::text,
  paused boolean NOT NULL DEFAULT false,
  pause_start_date date,
  next_payment_date date,
  pause_reason text,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payslip_design_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  show_company_logo boolean DEFAULT true,
  show_company_details boolean DEFAULT true,
  show_employee_details boolean DEFAULT true,
  show_earnings_breakdown boolean DEFAULT true,
  show_deductions_breakdown boolean DEFAULT true,
  show_leave_summary boolean DEFAULT true,
  show_bank_details boolean DEFAULT true,
  show_ytd boolean DEFAULT true,
  show_hourly_rate boolean DEFAULT true,
  section_order text[] DEFAULT ARRAY['Earnings'::text, 'Deductions'::text],
  layout_size text DEFAULT 'A4'::text,
  earnings_deductions_layout text DEFAULT 'deductions-left-earnings-right'::text,
  payslip_logo_url text,
  payslip_logo_width numeric DEFAULT 100,
  payslip_logo_height numeric DEFAULT 50,
  payslip_logo_fit text DEFAULT 'contain'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  show_employee_id_number boolean DEFAULT false,
  show_employee_tax_ref_number boolean DEFAULT false,
  show_employee_address boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.payslips (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid,
  pay_period text NOT NULL,
  pay_date text NOT NULL,
  gross_earnings numeric NOT NULL,
  total_deductions numeric NOT NULL,
  net_pay numeric NOT NULL,
  earnings_breakdown jsonb DEFAULT '[]'::jsonb,
  deductions_breakdown jsonb DEFAULT '[]'::jsonb,
  leave_summary jsonb DEFAULT '{}'::jsonb,
  ytd_gross_earnings numeric DEFAULT 0,
  ytd_total_deductions numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  company_name text,
  company_address text,
  company_logo_url text
);

CREATE TABLE IF NOT EXISTS public.popia_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  information_officer_name text,
  information_officer_email text,
  information_officer_phone text,
  deputy_officer_name text,
  deputy_officer_email text,
  retention_years integer NOT NULL DEFAULT 5,
  data_residency_note text,
  privacy_policy_url text,
  regulator_complaint_url text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.privacy_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  version text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  summary text,
  effective_date date,
  published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE IF NOT EXISTS public.privacy_policy_acceptances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL,
  policy_version text NOT NULL,
  user_id uuid,
  employee_id uuid,
  accepted_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.public_holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  date date NOT NULL,
  recurring boolean DEFAULT true,
  visible_in_calendar boolean DEFAULT true,
  departments text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_design_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  default_report_paper_size text DEFAULT 'A4'::text,
  include_company_logo boolean DEFAULT true,
  include_company_details boolean DEFAULT true,
  report_content_font_size numeric DEFAULT 14,
  irp5_content_font_size numeric DEFAULT 12,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  show_page_border boolean NOT NULL DEFAULT true,
  page_border_radius_px integer NOT NULL DEFAULT 12,
  page_sheet_inset_mm numeric(6,2) NOT NULL DEFAULT 8,
  page_content_padding_mm numeric(6,2) NOT NULL DEFAULT 8,
  page_border_width_px numeric(6,2) NOT NULL DEFAULT 1.5
);

CREATE TABLE IF NOT EXISTS public.run_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  user_id uuid,
  snapshot_type text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saving_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  amount numeric NOT NULL,
  frequency text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tax_brackets_paye (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tax_year integer,
  min_income numeric(18,2) NOT NULL,
  max_income numeric(18,2),
  rate numeric(5,4) NOT NULL,
  deduction numeric(18,2) DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tax_rates_uif_sdl (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tax_year integer,
  uif_rate numeric(5,4) NOT NULL,
  uif_cap numeric(18,2) NOT NULL,
  sdl_rate numeric(5,4) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tax_years (
  year integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  rebates jsonb
);

CREATE TABLE IF NOT EXISTS public.timesheets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  date date NOT NULL,
  time_in text,
  tea_start text,
  tea_end text,
  lunch_start text,
  lunch_end text,
  time_out text,
  total_work_hours numeric,
  overtime_hours numeric,
  late_arrival boolean DEFAULT false,
  early_departure boolean DEFAULT false,
  absent boolean DEFAULT false,
  status text NOT NULL DEFAULT 'Draft'::text,
  submitted_by text,
  submitted_at timestamp with time zone,
  approved_by text,
  approved_at timestamp with time zone,
  audit_log jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.todos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message text NOT NULL,
  level text NOT NULL,
  module text NOT NULL,
  action_url text,
  status text NOT NULL DEFAULT 'pending'::text,
  assigned_to text,
  employee_id uuid,
  related_field text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  assigned_user_id uuid
);

CREATE TABLE IF NOT EXISTS public.user_dashboard_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  widget_key text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  section text NOT NULL DEFAULT 'main'::text,
  position integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.user_tax_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  apply_paye boolean DEFAULT false,
  apply_sdl boolean DEFAULT false,
  enable_irp5_export boolean DEFAULT false,
  irp5_content_font_size numeric DEFAULT 12,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  pro_rate_uif_cap_by_frequency boolean DEFAULT false,
  apply_medical_aid_tax_credit boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'Staff'::text,
  status text NOT NULL DEFAULT 'Active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_hours_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  daily_start_time text NOT NULL,
  daily_end_time text NOT NULL,
  work_days text[] NOT NULL,
  overtime_threshold_hours numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  break_duration_minutes numeric,
  friday_start_time text,
  friday_end_time text
);
