import { describe, expect, it } from "vitest";
import { buildPayrollPackItems } from "@/lib/payroll-pack";
import type { ReportGenerateContext } from "@/lib/report-catalog";
import type { MockCompanyDetails, MockEmployee } from "@/lib/mock-data-interfaces";
import type { ReportGenerateContext } from "@/lib/report-catalog";
import { buildPayrollPackItems } from "@/lib/payroll-pack";

const employee: MockEmployee = {
  id: "emp-1",
  customEmployeeId: "KP001",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  jobTitle: "Operator",
  startDate: "2024-01-01",
  department: "Print",
  personalId: "3",
  idNumber: "9001015800083",
  phoneNumber: "0820000000",
  taxReferenceNumber: "0123456789",
  bankName: "FNB",
  bankAccountHolder: "Jane Doe",
  accountNumber: "1234567890",
  branchCode: "250655",
  salary: 25000,
};

const company: MockCompanyDetails = {
  id: "00000000-0000-0000-0000-000000000000",
  companyLegalName: "Kan Printers",
  companyTaxNumber: "9000000000",
};

function baseCtx(overrides: Partial<ReportGenerateContext> = {}): ReportGenerateContext {
  return {
    employees: [employee],
    payslips: [],
    leaveRecords: [],
    timesheets: [],
    companyDetails: company,
    selectedDate: new Date("2026-07-15"),
    periodType: "monthly",
    auditLevel: "standard",
    reportDesignSettings: {
      defaultReportPaperSize: "A4",
      includeCompanyLogo: true,
      includeCompanyDetails: true,
      reportContentFontSize: 12,
      irp5ContentFontSize: 10,
    },
    ...overrides,
  };
}

describe("buildPayrollPackItems", () => {
  it("includes readiness, bank transfer, and EMP201 for monthly periods", () => {
    const items = buildPayrollPackItems({
      ctx: baseCtx(),
      periodLabel: "July 2026",
    });
    expect(items.map((i) => i.id)).toEqual(["payroll-readiness", "bank-transfer", "emp201"]);
    expect(items[0]?.orientation).toBe("landscape");
    expect(items[1]?.orientation).toBe("portrait");
    expect(items[0]?.html).toMatch(/Reporting period/);
  });

  it("skips EMP201 for yearly periods", () => {
    const items = buildPayrollPackItems({
      ctx: baseCtx({ periodType: "yearly" }),
      periodLabel: "2026",
    });
    expect(items.map((i) => i.id)).toEqual(["payroll-readiness", "bank-transfer"]);
  });
});
