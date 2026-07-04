-- Welcome email: contact Melanie Kanasashi, and list outstanding payroll profile items.
UPDATE public.message_templates
SET
  body = E'<p style="margin:0 0 16px;font-size:14px;">Hi {{firstName}},</p>\n<p style="margin:0 0 16px;font-size:14px;">Welcome to <strong>{{companyName}}</strong>. You are officially part of the Kan Printers family, and we hope you will enjoy your employment with us.</p>\n<p style="margin:0 0 16px;font-size:14px;">We are pleased to have you join the team as <strong>{{jobTitle}}</strong>, starting <strong>{{startDate}}</strong>.</p>\n<p style="margin:0 0 16px;font-size:14px;">Our HR and payroll team is here to support you throughout your journey with us. If you have any questions, please get in contact with <strong>{{hrContactName}}</strong>.</p>\n{{outstandingItemsHtml}}\n<p style="margin:0;font-size:14px;">Once again, welcome aboard — we wish you every success with Kan Printers / Kan Screenprinters.</p>',
  description = 'Sent automatically when a new employee record is created. Lists outstanding profile details and directs questions to HR.',
  updated_at = now()
WHERE template_key = 'employee_welcome_email';

UPDATE public.message_templates
SET
  body = '{{companyName}}: Welcome {{firstName}}! You are officially part of the Kan Printers family. We hope you enjoy your employment with us. Questions? Contact {{hrContactName}}. {{outstandingItemsText}}',
  updated_at = now()
WHERE template_key = 'employee_welcome_sms';
