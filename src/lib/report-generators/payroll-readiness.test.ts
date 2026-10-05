import { describe, expect, it } from "vitest";
import { assessPayrollReadiness } from "@/lib/payroll-readiness";
import { generatePayrollReadinessReportContent } from "@/lib/report-generators/payroll-readiness";
import type { MockCompanyDetails, MockEmployee, TimesheetEntry } from "@/lib/mock-data-interfaces";

const baseEmployee = (overrides: Partial<MockEmployee> = {}): MockEmployee => ({
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
  ...overrides,
});

const company: MockCompanyDetails = {
  id: "00000000-0000-0000-0000-000000000000",
  companyLegalName: "Kan Printers",
  companyTaxNumber: "9000000000",
};

describe("assessPayrollReadiness", () => {
  it("marks complete employees as ready", () => {
    const result = assessPayrollReadiness({
      employees: [baseEmployee()],
      companyDetails: company,
      timesheets: [
        {
          id: "ts-1",
          employeeId: "emp-1",
          date: "2026-07-10",
          timeIn: "08:00",
          timeOut: "17:00",
          totalWorkHours: 8,
          overtimeHours: 0,
          lateArrival: false,
          earlyDeparture: false,
          absent: false,
          status: "Approved",
        } satisfies TimesheetEntry,
      ],
      selectedDate: new Date("2026-07-15"),
      periodType: "monthly",
    });

    expect(result.totals.readyCount).toBe(1);
    expect(result.totals.blockedCount).toBe(0);
    expect(result.employees[0]?.status).toBe("ready");
  });

  it("flags missing bank and tax details as blocked", () => {
    const result = assessPayrollReadiness({
      employees: [
        baseEmployee({
          taxReferenceNumber: "",
          accountNumber: "",
          branchCode: undefined,
        }),
      ],
      companyDetails: company,
      selectedDate: new Date("2026-07-15"),
      periodType: "monthly",
    });

    expect(result.totals.blockedCount).toBe(1);
    expect(result.employees[0]?.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["missing_tax_reference", "missing_account_number", "missing_branch_code"])
    );
  });

  it("treats missing timesheets as attention, not blocked", () => {
    const result = assessPayrollReadiness({
      employees: [baseEmployee()],
      companyDetails: company,
      timesheets: [],
      selectedDate: new Date("2026-07-15"),
      periodType: "monthly",
    });

    expect(result.employees[0]?.status).toBe("attention");
    expect(result.employees[0]?.issues[0]?.code).toBe("missing_timesheet");
  });

  it("does not flag salary employees who have no timesheets", () => {
    const result = assessPayrollReadiness({
      employees: [baseEmployee({ salary: 4500, hourlyRate: 0, payFrequency: "Weekly" })],
      companyDetails: company,
      timesheets: [],
      selectedDate: new Date("2026-07-15"),
      periodType: "monthly",
    });

    expect(result.employees[0]?.issues.some((issue) => issue.code === "missing_timesheet")).toBe(false);
    expect(result.employees[0]?.status).toBe("ready");
  });
});

describe("generatePayrollReadinessReportContent", () => {
  it("renders summary and outstanding rows", () => {
    const html = generatePayrollReadinessReportContent(
      [
        baseEmployee({ id: "emp-ready", customEmployeeId: "KP001" }),
        baseEmployee({
          id: "emp-blocked",
          customEmployeeId: "KP002",
          firstName: "John",
          lastName: "Smith",
          taxReferenceNumber: "",
          personalId: "",
        }),
      ],
      { ...company, companyTaxNumber: "" },
      [],
      new Date("2026-07-15"),
      "monthly"
    );

    expect(html).toContain("Executive summary");
    expect(html).toContain("Outstanding employees");
    expect(html).toContain("John Smith");
    expect(html).toContain("Company tax number");
    expect(html).toContain("Blocked");
  });
});
