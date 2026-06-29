// Pure HTML email templates shared by notification edge functions.
// No imports — keep these portable and side-effect free.

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatZar(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return "R " + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface ShellOptions {
  companyName: string;
  heading: string;
  bodyHtml: string;
  footerNote?: string;
}

/** Wraps body content in a consistent, email-client-safe shell (inline styles only). */
export function renderEmailShell(opts: ShellOptions): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#111827;padding:20px 28px;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;">${escapeHtml(opts.companyName)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${escapeHtml(opts.heading)}</h1>
                ${opts.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                <p style="margin:0;font-size:12px;color:#6b7280;">
                  ${opts.footerNote ? escapeHtml(opts.footerNote) + "<br/>" : ""}
                  This is an automated message from ${escapeHtml(opts.companyName)} Payroll. &copy; ${year}.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export interface PayslipEmailData {
  companyName: string;
  employeeName: string;
  periodLabel: string;
  netPay: number;
  grossEarnings?: number;
  totalDeductions?: number;
  hasAttachment: boolean;
  portalUrl?: string;
}

export function renderPayslipEmail(data: PayslipEmailData): { subject: string; html: string } {
  const subject = `Your payslip for ${data.periodLabel}`;
  const rows: string[] = [
    `<tr><td style="padding:6px 0;color:#6b7280;">Pay period</td><td style="padding:6px 0;text-align:right;font-weight:bold;">${escapeHtml(data.periodLabel)}</td></tr>`,
  ];
  if (typeof data.grossEarnings === "number") {
    rows.push(`<tr><td style="padding:6px 0;color:#6b7280;">Gross earnings</td><td style="padding:6px 0;text-align:right;">${formatZar(data.grossEarnings)}</td></tr>`);
  }
  if (typeof data.totalDeductions === "number") {
    rows.push(`<tr><td style="padding:6px 0;color:#6b7280;">Total deductions</td><td style="padding:6px 0;text-align:right;">${formatZar(data.totalDeductions)}</td></tr>`);
  }
  rows.push(`<tr><td style="padding:10px 0 0;color:#111827;font-weight:bold;border-top:1px solid #e5e7eb;">Net pay</td><td style="padding:10px 0 0;text-align:right;font-weight:bold;color:#047857;border-top:1px solid #e5e7eb;">${formatZar(data.netPay)}</td></tr>`);

  const attachmentLine = data.hasAttachment
    ? `<p style="margin:0 0 16px;font-size:14px;">Your detailed payslip is attached to this email as a PDF.</p>`
    : `<p style="margin:0 0 16px;font-size:14px;">You can view and download your detailed payslip from the staff portal.</p>`;

  const portalButton = data.portalUrl
    ? `<p style="margin:20px 0 0;"><a href="${escapeHtml(data.portalUrl)}" style="background:#111827;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px;display:inline-block;">Open staff portal</a></p>`
    : "";

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:14px;">Hi ${escapeHtml(data.employeeName)},</p>
    <p style="margin:0 0 16px;font-size:14px;">Your payslip for <strong>${escapeHtml(data.periodLabel)}</strong> is ready.</p>
    ${attachmentLine}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:8px 0;">
      ${rows.join("\n")}
    </table>
    ${portalButton}
  `;

  return {
    subject,
    html: renderEmailShell({
      companyName: data.companyName,
      heading: "Payslip available",
      bodyHtml,
      footerNote: "This email contains confidential salary information intended only for the named recipient.",
    }),
  };
}

export interface ReminderEmailData {
  companyName: string;
  recipientName?: string;
  runLabel?: string;
  items: string[];
}

export function renderReminderEmail(data: ReminderEmailData): { subject: string; html: string } {
  const subject = data.runLabel
    ? `Action needed before payroll: ${data.runLabel}`
    : "Action needed before payroll can be finalised";

  const list = data.items.length
    ? `<ul style="margin:0 0 16px;padding-left:20px;font-size:14px;">${data.items
        .map((i) => `<li style="margin:4px 0;">${escapeHtml(i)}</li>`)
        .join("")}</ul>`
    : `<p style="margin:0 0 16px;font-size:14px;">There are outstanding items that need your attention before payroll can be finalised.</p>`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:14px;">Hi${data.recipientName ? " " + escapeHtml(data.recipientName) : ""},</p>
    <p style="margin:0 0 16px;font-size:14px;">The following items are blocking payroll${data.runLabel ? ` for <strong>${escapeHtml(data.runLabel)}</strong>` : ""} and need to be resolved:</p>
    ${list}
    <p style="margin:0;font-size:14px;">Please action these as soon as possible so the payroll run can be completed on time.</p>
  `;

  return {
    subject,
    html: renderEmailShell({
      companyName: data.companyName,
      heading: "Payroll reminder",
      bodyHtml,
    }),
  };
}

export function renderTestEmail(companyName: string): { subject: string; html: string } {
  return {
    subject: `Test email from ${companyName} Payroll`,
    html: renderEmailShell({
      companyName,
      heading: "Email is working",
      bodyHtml: `<p style="margin:0;font-size:14px;">This is a test email confirming that your Resend integration is configured correctly. If you received this, payslip and reminder emails will be delivered from this address.</p>`,
    }),
  };
}
