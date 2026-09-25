import { describe, expect, it } from "vitest";
import { generateNewHiresTerminationsReportContent } from "@/lib/report-generators/new-hires-terminations";
import { generateEmployeeDemographicsReportContent } from "@/lib/report-generators/employee-demographics";
import type { MockEmployee } from "@/lib/mock-data-interfaces";

const employees: Array<MockEmployee & { terminationDate?: string }> = [
  {
    id: "1",
    customEmployeeId: "KP001",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    jobTitle: "Engineer",
    department: "Design",
    startDate: "2026-07-05",
    salary: 35000,
  },
  {
    id: "2",
    customEmployeeId: "KP002",
    firstName: "Grace",
    lastName: "Hopper",
    email: "grace@example.com",
    jobTitle: "Operator",
    department: "Print",
    startDate: "2024-01-01",
    salary: 22000,
  },
  {
    id: "3",
    customEmployeeId: "KP003",
    firstName: "Alan",
    lastName: "Turing",
    email: "alan@example.com",
    jobTitle: "Analyst",
    department: "Finance",
    startDate: "2023-01-01",
    terminationDate: "2026-07-12",
    salary: 45000,
  },
];

describe("generateNewHiresTerminationsReportContent", () => {
  it("lists real hires and terminations without inventing exit dates", () => {
    const html = generateNewHiresTerminationsReportContent(employees, new Date("2026-07-15"), "monthly");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("Alan Turing");
    expect(html).toContain("2026-07-12");
    expect(html).not.toContain("Mock Termination");
    expect(html).not.toContain("mock data");
  });

  it("shows empty terminations when no exit dates exist", () => {
    const html = generateNewHiresTerminationsReportContent(
      employees.map(({ terminationDate: _t, ...rest }) => rest),
      new Date("2026-07-15"),
      "monthly"
    );
    expect(html).toContain("No terminations recorded");
    expect(html).not.toContain("Termination dates are not stored");
  });
});

describe("generateEmployeeDemographicsReportContent", () => {
  it("counts active workforce for the period, not only new hires", () => {
    const html = generateEmployeeDemographicsReportContent(employees, new Date("2026-07-15"), "monthly");
    expect(html).toContain("2 employees");
    expect(html).toContain("Design");
    expect(html).toContain("Print");
    expect(html).not.toContain("mock data");
  });

  it("excludes people terminated before the period", () => {
    const earlierExit = [
      ...employees.slice(0, 2),
      { ...employees[2], terminationDate: "2026-06-01" },
    ];
    const html = generateEmployeeDemographicsReportContent(earlierExit, new Date("2026-07-15"), "monthly");
    expect(html).toContain("2 employees");
  });
});
