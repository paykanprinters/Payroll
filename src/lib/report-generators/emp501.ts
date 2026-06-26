import type { MockCompanyDetails, MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";
import { buildEmployeeTaxCertificate } from "@/lib/irp5-certificate";
import { computeEmp201Totals, type Emp201Totals } from "./emp201";
import {
  filterPayslipsForSarsTaxYear,
  getSarsTaxYearBounds,
  getSarsTaxYearPeriodLabel,
  parsePayslipPeriodStart,
  taxYearFromSelectedDate,
} from "@/lib/tax-year-period";
import { format } from "date-fns";

/**
 * EMP501 — Annual Employer Reconciliation Declaration (COMP-14).
 *
 * Reconciles the three figures SARS requires to agree at year-end:
 *   1. Monthly liability declared on each EMP201 (PAYE + SDL + UIF), summed
 *      across the 12 months of the tax year.
 *   2. The total value of the employee tax certificates (IRP5 / IT3(a)).
 *   3. (In a full submission) payments actually made to SARS — not modelled here.
 *
 * Because both the monthly EMP201 totals and the certificates are derived from
 * the same payslips, PAYE and the employee UIF portion should reconcile exactly.
 * Any non-zero difference flags payslips that fall outside the tax-year window or
 * data that did not flow through to a certificate.
 */

export interface Emp501MonthlyLine {
  /** Month key, e.g. "2026-03". */
  monthKey: string;
  /** Display label, e.g. "March 2026". */
  monthLabel: string;
  totals: Emp201Totals;
}

export interface Emp501CertificateTotals {
  certificateCount: number;
  irp5Count: number;
  it3aCount: number;
  paye: number;
  uifEmployee: number;
  grossRemuneration: number;
  nonTaxableIncome: number;
  medicalTaxCredit: number;
}

export interface Emp501ReconciliationLine {
  label: string;
  /** Liability per the monthly EMP201 declarations. */
  perEmp201: number;
  /** Equivalent total from the employee tax certificates. */
  perCertificates: number;
  /** perEmp201 − perCertificates (zero when balanced). */
  difference: number;
}

export interface Emp501Reconciliation {
  taxYear: number;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  monthly: Emp501MonthlyLine[];
  /** Sum of all monthly EMP201 declarations for the year. */
  emp201YearTotals: Emp201Totals;
  certificateTotals: Emp501CertificateTotals;
  reconciliation: Emp501ReconciliationLine[];
  isBalanced: boolean;
  /** Employees whose certificates carry validation errors. */
  certificateErrorCount: number;
}

const monthLabelFromKey = (monthKey: string): string => {
  const [y, m] = monthKey.split("-").map(Number);
  return format(new Date(y, (m ?? 1) - 1, 1), "MMMM yyyy");
};

/** Group tax-year payslips by calendar month (chronological Mar → Feb). */
function groupPayslipsByMonth(payslips: MockPayslip[]): Map<string, MockPayslip[]> {
  const groups = new Map<string, MockPayslip[]>();
  for (const p of payslips) {
    const start = parsePayslipPeriodStart(p.payPeriod);
    if (!start) continue;
    const monthKey = format(start, "yyyy-MM");
    const bucket = groups.get(monthKey) ?? [];
    bucket.push(p);
    groups.set(monthKey, bucket);
  }
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

const sumEmp201 = (lines: Emp501MonthlyLine[]): Emp201Totals =>
  lines.reduce<Emp201Totals>(
    (acc, l) => ({
      payslipCount: acc.payslipCount + l.totals.payslipCount,
      paye: acc.paye + l.totals.paye,
      uifEmployee: acc.uifEmployee + l.totals.uifEmployee,
      uifEmployer: acc.uifEmployer + l.totals.uifEmployer,
      uifTotal: acc.uifTotal + l.totals.uifTotal,
      sdl: acc.sdl + l.totals.sdl,
      eti: acc.eti + l.totals.eti,
      totalPayable: acc.totalPayable + l.totals.totalPayable,
    }),
    {
      payslipCount: 0,
      paye: 0,
      uifEmployee: 0,
      uifEmployer: 0,
      uifTotal: 0,
      sdl: 0,
      eti: 0,
      totalPayable: 0,
    }
  );

/** Tolerance for treating a reconciliation difference as balanced (rounding noise). */
const RECON_TOLERANCE = 0.01;

/** Compute the full EMP501 reconciliation for a SARS tax year. */
export function computeEmp501Reconciliation(
  employees: MockEmployee[],
  allPayslips: MockPayslip[],
  companyDetails: MockCompanyDetails | null,
  taxYear: number
): Emp501Reconciliation {
  const payslipsForYear = filterPayslipsForSarsTaxYear(allPayslips, taxYear);
  const bounds = getSarsTaxYearBounds(taxYear);

  const monthly: Emp501MonthlyLine[] = [...groupPayslipsByMonth(payslipsForYear).entries()].map(
    ([monthKey, slips]) => ({
      monthKey,
      monthLabel: monthLabelFromKey(monthKey),
      totals: computeEmp201Totals(slips),
    })
  );

  const emp201YearTotals = sumEmp201(monthly);

  const certificateTotals: Emp501CertificateTotals = {
    certificateCount: 0,
    irp5Count: 0,
    it3aCount: 0,
    paye: 0,
    uifEmployee: 0,
    grossRemuneration: 0,
    nonTaxableIncome: 0,
    medicalTaxCredit: 0,
  };
  let certificateErrorCount = 0;

  for (const employee of employees) {
    const empPayslips = filterPayslipsForSarsTaxYear(allPayslips, taxYear, employee.id);
    if (empPayslips.length === 0) continue;

    const cert = buildEmployeeTaxCertificate(employee, empPayslips, companyDetails, taxYear);
    certificateTotals.certificateCount += 1;
    if (cert.certificateType === "IRP5") certificateTotals.irp5Count += 1;
    else certificateTotals.it3aCount += 1;
    certificateTotals.paye += cert.totals.payeDeducted;
    certificateTotals.uifEmployee += cert.totals.uifContributions;
    certificateTotals.grossRemuneration += cert.totals.grossRemuneration;
    certificateTotals.nonTaxableIncome += cert.totals.nonTaxableIncome;
    certificateTotals.medicalTaxCredit += cert.totals.medicalTaxCredit;
    certificateErrorCount += cert.validation.errors.length;
  }

  const reconciliation: Emp501ReconciliationLine[] = [
    {
      label: "PAYE (employees' tax)",
      perEmp201: emp201YearTotals.paye,
      perCertificates: certificateTotals.paye,
      difference: emp201YearTotals.paye - certificateTotals.paye,
    },
    {
      label: "UIF — employee portion (1%)",
      perEmp201: emp201YearTotals.uifEmployee,
      perCertificates: certificateTotals.uifEmployee,
      difference: emp201YearTotals.uifEmployee - certificateTotals.uifEmployee,
    },
  ];

  const isBalanced = reconciliation.every((r) => Math.abs(r.difference) <= RECON_TOLERANCE);

  return {
    taxYear,
    periodLabel: getSarsTaxYearPeriodLabel(taxYear),
    periodStart: bounds.start,
    periodEnd: bounds.end,
    monthly,
    emp201YearTotals,
    certificateTotals,
    reconciliation,
    isBalanced,
    certificateErrorCount,
  };
}

const money = (n: number) =>
  n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const generateEmp501ReportContent = (
  payslips: MockPayslip[],
  employees: MockEmployee[],
  selectedDate: Date | undefined,
  _periodType: "monthly" | "yearly",
  companyDetails: MockCompanyDetails | null = null
): string => {
  if (!selectedDate) {
    return `<p>Select a tax year to generate the EMP501 reconciliation.</p>`;
  }

  const taxYear = taxYearFromSelectedDate(selectedDate);
  const recon = computeEmp501Reconciliation(employees, payslips, companyDetails, taxYear);

  if (recon.monthly.length === 0) {
    return `<p>No payslip data found for tax year ${taxYear} (${recon.periodLabel}) to reconcile.</p>`;
  }

  const monthlyRows = recon.monthly
    .map(
      (m) => `
      <tr class="border-b">
        <td class="py-2 px-4">${m.monthLabel}</td>
        <td class="py-2 px-4 text-right">${money(m.totals.paye)}</td>
        <td class="py-2 px-4 text-right">${money(m.totals.sdl)}</td>
        <td class="py-2 px-4 text-right">${money(m.totals.uifTotal)}</td>
        <td class="py-2 px-4 text-right">${money(m.totals.totalPayable)}</td>
      </tr>`
    )
    .join("");

  const reconRows = recon.reconciliation
    .map((r) => {
      const balanced = Math.abs(r.difference) <= RECON_TOLERANCE;
      return `
      <tr class="border-b">
        <td class="py-2 px-4">${r.label}</td>
        <td class="py-2 px-4 text-right">${money(r.perEmp201)}</td>
        <td class="py-2 px-4 text-right">${money(r.perCertificates)}</td>
        <td class="py-2 px-4 text-right ${balanced ? "" : "text-red-600 font-semibold"}">${money(r.difference)}</td>
      </tr>`;
    })
    .join("");

  const statusBanner = recon.isBalanced
    ? `<div class="mb-4 rounded border border-green-300 bg-green-50 p-3 text-green-800">
        <p class="font-semibold">Reconciliation balanced</p>
        <p>EMP201 monthly declarations agree with the employee tax certificates for this tax year.</p>
      </div>`
    : `<div class="mb-4 rounded border border-red-300 bg-red-50 p-3 text-red-800">
        <p class="font-semibold">Reconciliation out of balance</p>
        <p>The EMP201 totals do not match the certificate totals. Review the differences below before submitting EMP501.</p>
      </div>`;

  const certErrorBanner =
    recon.certificateErrorCount > 0
      ? `<div class="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">
          <p class="font-semibold">${recon.certificateErrorCount} certificate validation error(s)</p>
          <p>Some certificates are missing required fields — fix before final submission.</p>
        </div>`
      : "";

  return `
    <p>EMP501 Employer Reconciliation for tax year <strong>${taxYear}</strong> (${recon.periodLabel}).</p>
    <p class="text-sm text-muted-foreground">
      ${recon.certificateTotals.certificateCount} certificate(s):
      ${recon.certificateTotals.irp5Count} IRP5, ${recon.certificateTotals.it3aCount} IT3(a).
    </p>
    <br/>
    ${statusBanner}
    ${certErrorBanner}

    <h4 class="text-md font-semibold mb-2">Monthly EMP201 declarations</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Month</th>
          <th class="py-2 px-4 text-right">PAYE (R)</th>
          <th class="py-2 px-4 text-right">SDL (R)</th>
          <th class="py-2 px-4 text-right">UIF 2% (R)</th>
          <th class="py-2 px-4 text-right">Total (R)</th>
        </tr>
      </thead>
      <tbody>
        ${monthlyRows}
        <tr class="border-b font-semibold">
          <td class="py-2 px-4">Year total</td>
          <td class="py-2 px-4 text-right">${money(recon.emp201YearTotals.paye)}</td>
          <td class="py-2 px-4 text-right">${money(recon.emp201YearTotals.sdl)}</td>
          <td class="py-2 px-4 text-right">${money(recon.emp201YearTotals.uifTotal)}</td>
          <td class="py-2 px-4 text-right">${money(recon.emp201YearTotals.totalPayable)}</td>
        </tr>
      </tbody>
    </table>
    <br/>

    <h4 class="text-md font-semibold mb-2">Reconciliation: EMP201 vs tax certificates</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Line</th>
          <th class="py-2 px-4 text-right">Per EMP201 (R)</th>
          <th class="py-2 px-4 text-right">Per certificates (R)</th>
          <th class="py-2 px-4 text-right">Difference (R)</th>
        </tr>
      </thead>
      <tbody>
        ${reconRows}
      </tbody>
    </table>
    <br/>
    <p class="text-sm text-muted-foreground">
      SDL has no employee-certificate counterpart and reconciles only at EMP201 level. UIF is
      compared on the employee (1%) portion, which is the amount reflected on certificates.
      Verify against your SARS eFiling EMP501 and actual payments before submission.
    </p>
  `;
};
