// Plain-text SMS bodies shared by notification edge functions.
// Keep messages short (ideally <=160 chars) to limit per-message cost.

function formatZar(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return "R" + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface PayslipSmsData {
  companyName: string;
  employeeName: string;
  periodLabel: string;
  netPay?: number;
  portalUrl?: string;
}

export function renderPayslipSms(data: PayslipSmsData): string {
  const firstName = data.employeeName.split(" ")[0] || "there";
  const net = typeof data.netPay === "number" ? ` Net pay ${formatZar(data.netPay)}.` : "";
  const link = data.portalUrl ? ` View: ${data.portalUrl}` : "";
  return `${data.companyName}: Hi ${firstName}, your payslip for ${data.periodLabel} is ready.${net}${link}`.trim();
}

export interface ReminderSmsData {
  companyName: string;
  recipientName?: string;
  message: string;
}

export function renderReminderSms(data: ReminderSmsData): string {
  const name = data.recipientName ? `${data.recipientName.split(" ")[0]}, ` : "";
  return `${data.companyName}: ${name}action needed before payroll: ${data.message}`.trim();
}

export function renderTestSms(companyName: string): string {
  return `${companyName}: Test SMS - your SMS Portal integration is working.`;
}
