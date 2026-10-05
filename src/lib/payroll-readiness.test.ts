import { describe, expect, it } from "vitest";
import {
  canApprovePayrollRun,
  canGeneratePayrollItems,
  computePayrollRunBlockers,
  PROFILE_FIELD_CHECKS,
  type ReadinessBlocker,
} from "@/lib/payroll-readiness";
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

const periodStart = new Date("2026-07-01");
const periodEnd = new Date("2026-07-31");

const approvedTimesheet = (overrides: Partial<TimesheetEntry> = {}): TimesheetEntry => ({
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
  ...overrides,
});

describe("PROFILE_FIELD_CHECKS", () => {
  it("includes bank/tax critical fields that block payroll runs", () => {
    const blocking = PROFILE_FIELD_CHECKS.filter((f) => f.blocksPayrollRun);
    expect(blocking.map((f) => f.key)).toEqual(
      expect.arrayContaining([
        "taxReferenceNumber",
        "accountNumber",
        "branchCode",
        "bankName",
        "bankAccountHolder",
      ])
    );
  });
});

describe("canGeneratePayrollItems / canApprovePayrollRun", () => {
  it("allows generate when only timesheet warnings exist", () => {
    const blockers: ReadinessBlocker[] = [
      {
        type: "TIMESHEET_SUBMITTED",
        employeeId: "emp-1",
        severity: "warning",
        message: "Submitted timesheets awaiting approval",
      },
    ];
    expect(canGeneratePayrollItems(blockers)).toBe(true);
    expect(canApprovePayrollRun(blockers)).toBe(false);
  });

  it("blocks generate and approve on error severity", () => {
    const blockers: ReadinessBlocker[] = [
      {
        type: "BANK_INFO",
        employeeId: "emp-1",
        severity: "error",
        message: "Missing bank details",
      },
    ];
    expect(canGeneratePayrollItems(blockers)).toBe(false);
    expect(canApprovePayrollRun(blockers)).toBe(false);
  });

  it("blocks approve on missing/draft timesheets but allows generate", () => {
    for (const type of ["MISSING_TIMESHEET", "TIMESHEET_DRAFT", "TIMESHEET_SUBMITTED"] as const) {
      const blockers: ReadinessBlocker[] = [
        { type, employeeId: "emp-1", severity: "warning", message: type },
      ];
      expect(canGeneratePayrollItems(blockers)).toBe(true);
      expect(canApprovePayrollRun(blockers)).toBe(false);
    }
  });

  it("allows both when no blockers", () => {
    expect(canGeneratePayrollItems([])).toBe(true);
    expect(canApprovePayrollRun([])).toBe(true);
  });
});

describe("computePayrollRunBlockers", () => {
  it("returns bank error when account details missing", () => {
    const blockers = computePayrollRunBlockers({
      employees: [baseEmployee({ accountNumber: "", branchCode: "" })],
      timesheets: [approvedTimesheet()],
      companyDetails: company,
      userTaxSettings: null,
      periodStart,
      periodEnd,
      taxTables: { brackets: [{ min: 0, max: null, rate: 0.18, base: 0 }] } as never,
      activeTaxYear: 2026,
    });

    expect(blockers.some((b) => b.type === "BANK_INFO" && b.severity === "error")).toBe(true);
    expect(canGeneratePayrollItems(blockers)).toBe(false);
  });

  it("skips bank and tax-reference blockers for cash-paid employees", () => {
    const blockers = computePayrollRunBlockers({
      employees: [
        baseEmployee({
          paymentMode: "Cash",
          taxReferenceNumber: "",
          bankName: "",
          bankAccountHolder: "",
          accountNumber: "",
          branchCode: "",
          trackTax: true,
        }),
      ],
      timesheets: [approvedTimesheet()],
      companyDetails: company,
      userTaxSettings: { userId: "u1", applyPaye: true, applySdl: true, enableIrp5Export: false, irp5ContentFontSize: 12 },
      periodStart,
      periodEnd,
      taxTables: { brackets: [{ min: 0, max: null, rate: 0.18, base: 0 }] } as never,
      activeTaxYear: 2026,
    });

    expect(blockers.some((b) => b.type === "BANK_INFO")).toBe(false);
    expect(blockers.some((b) => b.type === "EMPLOYEE_TAX_INFO")).toBe(false);
  });

  it("returns TIMESHEET_SUBMITTED warning for submitted sheets", () => {
    const blockers = computePayrollRunBlockers({
      employees: [baseEmployee()],
      timesheets: [approvedTimesheet({ status: "Submitted" })],
      companyDetails: company,
      userTaxSettings: null,
      periodStart,
      periodEnd,
      taxTables: { brackets: [{ min: 0, max: null, rate: 0.18, base: 0 }] } as never,
      activeTaxYear: 2026,
    });

    expect(blockers.some((b) => b.type === "TIMESHEET_SUBMITTED")).toBe(true);
    expect(canGeneratePayrollItems(blockers)).toBe(true);
    expect(canApprovePayrollRun(blockers)).toBe(false);
  });

  it("does not warn about missing timesheets for weekly salary employees", () => {
    const blockers = computePayrollRunBlockers({
      employees: [
        baseEmployee({
          id: "salary-1",
          firstName: "Glenore",
          lastName: "Kanasachi",
          payFrequency: "Weekly",
          salary: 4500,
          hourlyRate: 0,
        }),
      ],
      timesheets: [],
      companyDetails: company,
      userTaxSettings: null,
      periodStart,
      periodEnd,
      taxTables: { brackets: [{ min: 0, max: null, rate: 0.18, base: 0 }] } as never,
      activeTaxYear: 2026,
    });

    expect(blockers.some((b) => b.type === "MISSING_TIMESHEET")).toBe(false);
  });

  it("still warns when an hourly employee has no timesheets", () => {
    const blockers = computePayrollRunBlockers({
      employees: [baseEmployee({ hourlyRate: 85, salary: 0, payFrequency: "Weekly" })],
      timesheets: [],
      companyDetails: company,
      userTaxSettings: null,
      periodStart,
      periodEnd,
      taxTables: { brackets: [{ min: 0, max: null, rate: 0.18, base: 0 }] } as never,
      activeTaxYear: 2026,
    });

    expect(blockers.some((b) => b.type === "MISSING_TIMESHEET")).toBe(true);
  });
});
