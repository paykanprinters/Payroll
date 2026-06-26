import { format, isSameMonth, isSameYear } from "date-fns";
import type { MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";
import { calculatePayPeriodDetails } from "@/lib/payroll-calculations";

export type BulkExportMode = "monthly" | "weekly";

export interface PayCycleFilterSettings {
  cutOffDay: number;
  payDayOffset: number;
}

export const DEFAULT_PAY_CYCLE_FILTER_SETTINGS: PayCycleFilterSettings = {
  cutOffDay: 2,
  payDayOffset: 0,
};

export function payslipMatchesBulkPeriod(
  payslip: MockPayslip,
  employee: MockEmployee,
  selectedDate: Date,
  mode: BulkExportMode,
  settings: PayCycleFilterSettings
): boolean {
  const [startPeriodStr] = payslip.payPeriod.split(" - ");

  if (mode === "monthly" && employee.payFrequency === "Monthly") {
    const payslipStartDate = new Date(startPeriodStr);
    return isSameMonth(payslipStartDate, selectedDate) && isSameYear(payslipStartDate, selectedDate);
  }

  if (mode === "weekly" && (employee.payFrequency === "Weekly" || employee.payFrequency === "Bi-Weekly")) {
    const { payPeriodStart } = calculatePayPeriodDetails(
      selectedDate,
      employee.payFrequency === "Bi-Weekly" ? "Bi-Weekly" : "Weekly",
      settings.cutOffDay,
      settings.payDayOffset
    );
    return startPeriodStr === format(payPeriodStart, "yyyy-MM-dd");
  }

  return false;
}

export function filterPayslipsForBulkPeriod(
  payslips: MockPayslip[],
  employees: MockEmployee[],
  selectedDate: Date,
  mode: BulkExportMode,
  settings: PayCycleFilterSettings = DEFAULT_PAY_CYCLE_FILTER_SETTINGS
): MockPayslip[] {
  return payslips.filter((p) => {
    const employee = employees.find((emp) => emp.id === p.employeeId);
    if (!employee) return false;
    return payslipMatchesBulkPeriod(p, employee, selectedDate, mode, settings);
  });
}
