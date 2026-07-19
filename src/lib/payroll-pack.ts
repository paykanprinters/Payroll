import { REPORT_CATALOG, type ReportGenerateContext } from "@/lib/report-catalog";
import { wrapReportHtml } from "@/lib/report-html-styles";

export type PayrollPackOrientation = "portrait" | "landscape";

export const PAYROLL_PACK_REPORT_IDS = ["payroll-readiness", "bank-transfer", "emp201"] as const;

export type PayrollPackReportId = (typeof PAYROLL_PACK_REPORT_IDS)[number];

export type PayrollPackItem = {
  id: PayrollPackReportId;
  title: string;
  html: string;
  orientation: PayrollPackOrientation;
  filename: string;
};

export type BuildPayrollPackOptions = {
  ctx: ReportGenerateContext;
  periodLabel: string;
  /** When false, skip EMP201 (yearly periods). Default: include when catalog allows. */
  includeEmp201?: boolean;
};

/**
 * Build stakeholder payroll pack PDFs: readiness + bank transfer + EMP201 (monthly).
 * Skips reports that are not available for the current period type.
 */
export function buildPayrollPackItems(options: BuildPayrollPackOptions): PayrollPackItem[] {
  const { ctx, periodLabel } = options;
  const includeEmp201 = options.includeEmp201 ?? ctx.periodType === "monthly";
  const items: PayrollPackItem[] = [];

  for (const id of PAYROLL_PACK_REPORT_IDS) {
    if (id === "emp201" && !includeEmp201) continue;

    const report = REPORT_CATALOG.find((item) => item.id === id);
    if (!report?.generate) continue;
    if (!report.periodTypes.includes(ctx.periodType)) continue;

    const raw = report.generate(ctx);
    const html = wrapReportHtml(raw, {
      periodLabel,
      confidentiality: report.confidentiality,
    });
    const orientation: PayrollPackOrientation = /readiness/i.test(report.title) ? "landscape" : "portrait";
    const slug = report.title.replace(/\s+/g, "-");
    const periodSlug = periodLabel.replace(/\s+/g, "-");

    items.push({
      id,
      title: report.title,
      html,
      orientation,
      filename: `${slug}-${periodSlug}.pdf`,
    });
  }

  return items;
}
