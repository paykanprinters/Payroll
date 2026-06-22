import { describe, it, expect } from "vitest";
import {
  buildTodosAdminSummary,
  filterTodos,
  formatTodoRelatedField,
  getTodoModules,
} from "@/lib/todos-admin-summary";
import type { ToDoEntry } from "@/lib/mock-data-interfaces";

const sampleTodos: ToDoEntry[] = [
  {
    id: "1",
    message: "Missing tax number",
    level: "critical",
    module: "Employees",
    status: "pending",
    relatedField: "taxReferenceNumber",
  },
  {
    id: "2",
    message: "Timesheet not approved",
    level: "warning",
    module: "Timesheet",
    status: "pending",
  },
  {
    id: "3",
    message: "Review payslip design",
    level: "info",
    module: "Payslips",
    status: "done",
  },
];

describe("filterTodos", () => {
  it("filters by severity, module, and search", () => {
    const result = filterTodos(sampleTodos, {
      severity: "critical",
      module: "Employees",
      search: "tax",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });
});

describe("buildTodosAdminSummary", () => {
  it("summarizes filtered todo metrics", () => {
    const summary = buildTodosAdminSummary(sampleTodos);
    expect(summary.pendingInView).toBe(2);
    expect(summary.completedInView).toBe(1);
    expect(summary.criticalInView).toBe(1);
    expect(summary.warningInView).toBe(1);
    expect(summary.infoInView).toBe(0);
    expect(summary.moduleDistribution).toHaveLength(3);
  });
});

describe("getTodoModules", () => {
  it("returns sorted unique modules", () => {
    expect(getTodoModules(sampleTodos)).toEqual(["Employees", "Payslips", "Timesheet"]);
  });
});

describe("formatTodoRelatedField", () => {
  it("splits camelCase field names", () => {
    expect(formatTodoRelatedField("taxReferenceNumber")).toBe("tax Reference Number");
  });
});
