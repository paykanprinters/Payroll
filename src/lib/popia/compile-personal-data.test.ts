import { describe, expect, it } from "vitest";
import { compilePersonalDataExport, countExportRecords } from "@/lib/popia/compile-personal-data";
import { MockEmployee } from "@/lib/mock-data-interfaces";

const employee = {
  id: "emp-1",
  customEmployeeId: "KAN001",
  firstName: "Thandi",
  lastName: "Nkosi",
  email: "thandi@example.com",
  jobTitle: "Operator",
  startDate: "2024-01-01",
} as MockEmployee;

describe("compilePersonalDataExport", () => {
  it("builds subject metadata from the employee", () => {
    const exp = compilePersonalDataExport({ employee, generatedAt: new Date("2026-06-29T10:00:00.000Z") });
    expect(exp.subject.employeeId).toBe("emp-1");
    expect(exp.subject.employeeNumber).toBe("KAN001");
    expect(exp.subject.fullName).toBe("Thandi Nkosi");
    expect(exp.subject.email).toBe("thandi@example.com");
    expect(exp.generatedAt).toBe("2026-06-29T10:00:00.000Z");
  });

  it("includes the full profile and all sections", () => {
    const exp = compilePersonalDataExport({
      employee,
      payslips: [{ id: "p1" }, { id: "p2" }],
      leave: [{ id: "l1" }],
    });
    expect((exp.profile as Record<string, unknown>).id).toBe("emp-1");
    const payslips = exp.sections.find((s) => s.key === "payslips");
    expect(payslips?.count).toBe(2);
    const leave = exp.sections.find((s) => s.key === "leave");
    expect(leave?.count).toBe(1);
    // Missing datasets default to empty sections.
    expect(exp.sections.find((s) => s.key === "loans")?.count).toBe(0);
  });

  it("counts related records across sections", () => {
    const exp = compilePersonalDataExport({
      employee,
      payslips: [{ id: "p1" }, { id: "p2" }],
      timesheets: [{ id: "t1" }],
      notifications: [{ id: "n1" }],
    });
    expect(countExportRecords(exp)).toBe(4);
  });

  it("handles a subject with no related records", () => {
    const exp = compilePersonalDataExport({ employee });
    expect(countExportRecords(exp)).toBe(0);
    expect(exp.sections).toHaveLength(7);
  });
});
