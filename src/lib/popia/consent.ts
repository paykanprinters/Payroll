export const CONSENT_TYPES = [
  "data_processing",
  "biometric",
  "notifications_email",
  "notifications_sms",
  "third_party_sharing",
] as const;

export type ConsentType = (typeof CONSENT_TYPES)[number];

export interface ConsentTypeMeta {
  type: ConsentType;
  label: string;
  description: string;
  /** Special personal information under POPIA requires explicit consent. */
  specialPi: boolean;
}

export const CONSENT_TYPE_META: Record<ConsentType, ConsentTypeMeta> = {
  data_processing: {
    type: "data_processing",
    label: "Payroll data processing",
    description: "Processing of personal information to administer employment and pay.",
    specialPi: false,
  },
  biometric: {
    type: "biometric",
    label: "Biometric attendance",
    description: "Capture and use of biometric/clock-in data to verify attendance. Special personal information.",
    specialPi: true,
  },
  notifications_email: {
    type: "notifications_email",
    label: "Email notifications",
    description: "Receive payslips and payroll notifications by email.",
    specialPi: false,
  },
  notifications_sms: {
    type: "notifications_sms",
    label: "SMS notifications",
    description: "Receive payslip alerts and payroll reminders by SMS.",
    specialPi: false,
  },
  third_party_sharing: {
    type: "third_party_sharing",
    label: "Third-party sharing",
    description: "Sharing with processors beyond statutory recipients (e.g. benefit providers).",
    specialPi: false,
  },
};

export function consentTypeLabel(type: string): string {
  return (CONSENT_TYPE_META as Record<string, ConsentTypeMeta>)[type]?.label ?? type;
}
