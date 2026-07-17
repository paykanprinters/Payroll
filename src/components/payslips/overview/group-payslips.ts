import { format, isValid, parseISO } from "date-fns";
import type { MockPayslip } from "@/lib/mock-data-interfaces";

export type EmployeePayslipGroup = {
  employeeId: string;
  name: string;
  customId: string;
  payslips: MockPayslip[];
  totalNet: number;
  latestPeriodLabel: string;
};

const formatPayPeriod = (payPeriod: string) => {
  const [startStr, endStr] = payPeriod.split(" - ").map((s) => s.trim());
  if (!startStr || !endStr) return payPeriod;

  const start = parseISO(startStr);
  const end = parseISO(endStr);
  if (!isValid(start) || !isValid(end)) return payPeriod;

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) return `${format(start, "dd")}–${format(end, "dd MMM yyyy")}`;
  if (sameYear) return `${format(start, "dd MMM")} – ${format(end, "dd MMM yyyy")}`;
  return `${format(start, "dd MMM yyyy")} – ${format(end, "dd MMM yyyy")}`;
};

export function groupPayslipsByEmployee(
  payslips: MockPayslip[],
  getEmployeeName: (employeeId: string) => string,
  getEmployeeCustomId: (employeeId: string) => string
): EmployeePayslipGroup[] {
  const byEmployee = new Map<string, MockPayslip[]>();

  payslips.forEach((payslip) => {
    const list = byEmployee.get(payslip.employeeId) || [];
    list.push(payslip);
    byEmployee.set(payslip.employeeId, list);
  });

  const groups: EmployeePayslipGroup[] = [];
  byEmployee.forEach((employeePayslips, employeeId) => {
    const sorted = [...employeePayslips].sort((a, b) => b.payPeriod.localeCompare(a.payPeriod));
    const totalNet = sorted.reduce(
      (sum, payslip) =>
        sum +
        (typeof payslip.netPay === "number" && Number.isFinite(payslip.netPay)
          ? payslip.netPay
          : 0),
      0
    );

    groups.push({
      employeeId,
      name: getEmployeeName(employeeId),
      customId: getEmployeeCustomId(employeeId),
      payslips: sorted,
      totalNet,
      latestPeriodLabel: sorted[0] ? formatPayPeriod(sorted[0].payPeriod) : "—",
    });
  });

  return groups.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
