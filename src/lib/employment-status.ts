import { format, parseISO } from "date-fns";
import type { MockEmployee } from "@/lib/mock-data-interfaces";

export type EmploymentExitType = "Resignation" | "Termination";
export type EmploymentStatus = "Active" | "Resigned" | "Terminated";

export function getEmploymentStatus(
  employee: Pick<MockEmployee, "terminationDate" | "employmentExitType"> | null | undefined
): EmploymentStatus {
  if (!employee?.terminationDate) return "Active";
  if (employee.employmentExitType === "Resignation") return "Resigned";
  return "Terminated";
}

export function isCurrentlyEmployed(
  employee: Pick<MockEmployee, "terminationDate" | "employmentExitType"> | null | undefined
): boolean {
  return getEmploymentStatus(employee) === "Active";
}

export function formatEmploymentStatusDetail(
  employee: Pick<MockEmployee, "terminationDate" | "employmentExitType" | "employmentExitReason">
): string {
  const status = getEmploymentStatus(employee);
  if (status === "Active") return "Active";
  let dateLabel = employee.terminationDate || "";
  if (employee.terminationDate) {
    try {
      dateLabel = format(parseISO(employee.terminationDate), "d MMM yyyy");
    } catch {
      dateLabel = employee.terminationDate;
    }
  }
  const reason = employee.employmentExitReason?.trim();
  return reason ? `${status} · ${dateLabel} · ${reason}` : `${status} · ${dateLabel}`;
}

/** Label for employee pickers so leavers stay identifiable. */
export function formatEmployeePickerLabel(
  employee: Pick<
    MockEmployee,
    "firstName" | "lastName" | "customEmployeeId" | "terminationDate" | "employmentExitType"
  >,
  options?: { includeCode?: boolean }
): string {
  const name = `${employee.firstName} ${employee.lastName}`.trim();
  const code =
    options?.includeCode && employee.customEmployeeId ? ` (${employee.customEmployeeId})` : "";
  const status = getEmploymentStatus(employee);
  return status === "Active" ? `${name}${code}` : `${name}${code} · ${status}`;
}
