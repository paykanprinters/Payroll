import { MockEmployee } from "@/lib/mock-data-interfaces";

export interface EmployeesAdminSummary {
  total: number;
  salaryCount: number;
  hourlyCount: number;
  portalEnabledCount: number;
  portalLinkedCount: number;
  jobTitleDistribution: { name: string; value: number }[];
  averageSalaryByJobTitle: { name: string; salary: number }[];
}

export function buildEmployeesAdminSummary(employees: MockEmployee[]): EmployeesAdminSummary {
  const jobTitleMap = new Map<string, number>();
  const salarySumByJobTitle = new Map<string, { sum: number; count: number }>();

  let salaryCount = 0;
  let hourlyCount = 0;
  let portalEnabledCount = 0;
  let portalLinkedCount = 0;

  employees.forEach((emp) => {
    const title = emp.jobTitle?.trim() || "Unassigned";
    jobTitleMap.set(title, (jobTitleMap.get(title) || 0) + 1);

    const hasSalary = emp.salary != null && emp.salary > 0;
    const hasHourly = emp.hourlyRate != null && emp.hourlyRate > 0;
    if (hasSalary) salaryCount += 1;
    if (hasHourly) hourlyCount += 1;

    if (emp.portalAccess === true) portalEnabledCount += 1;
    if (emp.userId) portalLinkedCount += 1;

    const current = salarySumByJobTitle.get(title) || { sum: 0, count: 0 };
    salarySumByJobTitle.set(title, {
      sum: current.sum + (emp.salary || 0) + (emp.hourlyRate ? emp.hourlyRate * 160 : 0),
      count: current.count + 1,
    });
  });

  return {
    total: employees.length,
    salaryCount,
    hourlyCount,
    portalEnabledCount,
    portalLinkedCount,
    jobTitleDistribution: Array.from(jobTitleMap.entries()).map(([name, value]) => ({ name, value })),
    averageSalaryByJobTitle: Array.from(salarySumByJobTitle.entries()).map(([name, data]) => ({
      name,
      salary: data.count > 0 ? data.sum / data.count : 0,
    })),
  };
}
