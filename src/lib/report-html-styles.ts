export type ReportConfidentiality = "standard" | "sensitive" | "statutory";

export function wrapReportHtml(
  body: string,
  meta: {
    periodLabel: string;
    generatedAt?: Date;
    confidentiality?: ReportConfidentiality;
  }
): string {
  const generated = (meta.generatedAt ?? new Date()).toLocaleString("en-ZA");
  const confidentialityBanner =
    meta.confidentiality === "sensitive"
      ? `<div style="margin-bottom:12px;padding:10px 12px;background:#fff7ed;border:1px solid #fdba74;border-radius:8px;font-size:13px;color:#9a3412"><strong>Confidential</strong> — contains employee payment and banking details. Handle according to your data protection policy.</div>`
      : meta.confidentiality === "statutory"
        ? `<div style="margin-bottom:12px;padding:10px 12px;background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;font-size:13px;color:#1e40af"><strong>Statutory report</strong> — verify figures against source payslips before SARS or audit submission.</div>`
        : "";

  return `
    ${confidentialityBanner}
    <div style="margin-bottom:16px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;line-height:1.5">
      <p style="margin:0"><strong>Reporting period:</strong> ${meta.periodLabel}</p>
      <p style="margin:6px 0 0 0;color:#64748b">Generated ${generated}</p>
    </div>
    ${body}
    <hr style="margin:24px 0 12px;border:none;border-top:1px solid #e2e8f0" />
    <p style="font-size:11px;color:#64748b;line-height:1.45;margin:0">
      Internal payroll report. Reconcile totals with the payslip register before sharing externally.
    </p>
  `;
}

export function reportNoDataMessage(periodLabel: string, hint?: string): string {
  return `
    <div style="padding:16px;border:1px dashed #cbd5e1;border-radius:8px;background:#f8fafc;text-align:center">
      <p style="margin:0;font-weight:600">No data for ${periodLabel}</p>
      <p style="margin:8px 0 0 0;font-size:13px;color:#64748b">
        ${hint || "Run payroll for this period or adjust the reporting window above."}
      </p>
    </div>
  `;
}
