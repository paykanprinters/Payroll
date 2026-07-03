export type MessageTemplateCategory =
  | "onboarding"
  | "payslip"
  | "payroll"
  | "portal"
  | "system";

export type MessageTemplateChannel = "email" | "sms";

export interface MessageTemplate {
  id: string;
  templateKey: string;
  channel: MessageTemplateChannel;
  category: MessageTemplateCategory;
  name: string;
  description: string | null;
  subject: string | null;
  body: string;
  enabled: boolean;
  includeLogo: boolean;
  updatedAt: string | null;
}

export const MESSAGE_TEMPLATE_CATEGORIES: {
  id: MessageTemplateCategory;
  label: string;
  description: string;
}[] = [
  {
    id: "onboarding",
    label: "Onboarding",
    description: "Welcome messages when employees join the company.",
  },
  {
    id: "payslip",
    label: "Payslips",
    description: "Notifications when payslips are ready.",
  },
  {
    id: "payroll",
    label: "Payroll",
    description: "Reminders and alerts during payroll processing.",
  },
  {
    id: "portal",
    label: "Staff portal",
    description: "Staff self-service access and portal invites.",
  },
  {
    id: "system",
    label: "System",
    description: "Test and system messages.",
  },
];

export const TEMPLATE_VARIABLE_HELP = [
  "{{firstName}}",
  "{{lastName}}",
  "{{fullName}}",
  "{{companyName}}",
  "{{companyLegalName}}",
  "{{companyTradingName}}",
  "{{jobTitle}}",
  "{{startDate}}",
  "{{portalUrl}}",
  "{{replyEmail}}",
  "{{periodLabel}}",
  "{{netPay}}",
  "{{runLabel}}",
  "{{reminderMessage}}",
];
