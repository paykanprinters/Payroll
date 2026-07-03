-- Editable email/SMS message templates with per-template enable switches.

CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  channel text NOT NULL CHECK (channel IN ('email', 'sms')),
  category text NOT NULL CHECK (category IN ('onboarding', 'payslip', 'payroll', 'portal', 'system')),
  name text NOT NULL,
  description text,
  subject text,
  body text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  include_logo boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_templates_read_managers" ON public.message_templates;
DROP POLICY IF EXISTS "message_templates_write_admins" ON public.message_templates;

CREATE POLICY "message_templates_read_managers"
ON public.message_templates
FOR SELECT
TO authenticated
USING (public.is_payroll_manager());

CREATE POLICY "message_templates_write_admins"
ON public.message_templates
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Broaden delivery log categories for welcome/onboarding messages.
ALTER TABLE public.notification_log
  DROP CONSTRAINT IF EXISTS notification_log_category_check;

ALTER TABLE public.notification_log
  ADD CONSTRAINT notification_log_category_check
  CHECK (category IN ('payslip', 'reminder', 'test', 'other', 'welcome', 'onboarding'));

-- Seed templates. Use {{variable}} placeholders rendered server-side.
INSERT INTO public.message_templates (
  template_key, channel, category, name, description, subject, body, enabled, include_logo
) VALUES
(
  'employee_welcome_email',
  'email',
  'onboarding',
  'New employee welcome email',
  'Sent automatically when a new employee record is created.',
  'Welcome to {{companyName}}',
  E'<p style="margin:0 0 16px;font-size:14px;">Hi {{firstName}},</p>\n<p style="margin:0 0 16px;font-size:14px;">Welcome to <strong>{{companyName}}</strong>. You are officially part of the Kan Printers family, and we hope you will enjoy your employment with us.</p>\n<p style="margin:0 0 16px;font-size:14px;">We are pleased to have you join the team as <strong>{{jobTitle}}</strong>, starting <strong>{{startDate}}</strong>.</p>\n<p style="margin:0 0 16px;font-size:14px;">Our HR and payroll team is here to support you throughout your journey with us. If you have any questions, simply reply to this email.</p>\n<p style="margin:0;font-size:14px;">Once again, welcome aboard — we wish you every success with Kan Printers / Kan Screenprinters.</p>',
  true,
  true
),
(
  'employee_welcome_sms',
  'sms',
  'onboarding',
  'New employee welcome SMS',
  'Sent automatically when a new employee record is created (requires mobile number).',
  NULL,
  '{{companyName}}: Welcome {{firstName}}! You are officially part of the Kan Printers family. We hope you enjoy your employment with us. Welcome aboard!',
  true,
  false
),
(
  'payslip_ready_email',
  'email',
  'payslip',
  'Payslip ready email',
  'Used when payslips are emailed. The built-in payslip layout still applies until this template is wired to delivery.',
  'Your payslip for {{periodLabel}}',
  E'<p style="margin:0 0 16px;font-size:14px;">Hi {{firstName}},</p>\n<p style="margin:0 0 16px;font-size:14px;">Your payslip for <strong>{{periodLabel}}</strong> is ready.</p>\n<p style="margin:0;font-size:14px;">Net pay: <strong>{{netPay}}</strong></p>',
  false,
  true
),
(
  'payslip_ready_sms',
  'sms',
  'payslip',
  'Payslip ready SMS',
  'Short SMS when a payslip is available.',
  NULL,
  '{{companyName}}: Hi {{firstName}}, your payslip for {{periodLabel}} is ready. Net pay {{netPay}}.',
  false,
  false
),
(
  'payroll_reminder_email',
  'email',
  'payroll',
  'Payroll reminder email',
  'Digest email for outstanding payroll tasks before a run is finalised.',
  'Action needed before payroll: {{runLabel}}',
  E'<p style="margin:0 0 16px;font-size:14px;">Hi {{firstName}},</p>\n<p style="margin:0 0 16px;font-size:14px;">The following items need attention before payroll can be finalised{{runLabel}}:</p>\n<p style="margin:0;font-size:14px;">{{reminderList}}</p>',
  false,
  true
),
(
  'payroll_reminder_sms',
  'sms',
  'payroll',
  'Payroll reminder SMS',
  'Short SMS for payroll blockers and reminders.',
  NULL,
  '{{companyName}}: {{firstName}}, action needed before payroll — {{reminderMessage}}',
  false,
  false
),
(
  'portal_access_email',
  'email',
  'portal',
  'Staff portal access',
  'Invite employees to the staff self-service portal (future automation).',
  'Your {{companyName}} staff portal access',
  E'<p style="margin:0 0 16px;font-size:14px;">Hi {{firstName}},</p>\n<p style="margin:0 0 16px;font-size:14px;">You can now access the staff portal to view payslips, leave balances and more.</p>\n<p style="margin:0;font-size:14px;"><a href="{{portalUrl}}">Open staff portal</a></p>',
  false,
  true
)
ON CONFLICT (template_key) DO NOTHING;
