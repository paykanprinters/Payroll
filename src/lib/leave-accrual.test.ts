import { describe, it, expect } from "vitest";
import { format, parseISO } from "date-fns";
import {
  annualLeaveAdvanceDays,
  BCEA_LEAVE_DEFAULTS,
  computeEmployeeLeaveBalance,
  formatLeaveBalance,
  getAnnualLeaveCycle,
  getSickLeaveCycle,
  sumLeaveTakenInRange,
  validateLeaveAgainstBalance,
} from "./leave-accrual";
import type { LeaveEntry, MockEmployee } from "@/lib/mock-data-interfaces";

const baseEmployee: MockEmployee = {
  id: "emp-1",
  customEmployeeId: "KP001",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  jobTitle: "Operator",
  startDate: "2024-01-01",
};

function leave(partial: Partial<LeaveEntry> & Pick<LeaveEntry, "leaveType" | "startDate" | "endDate">): LeaveEntry {
  return {
    id: partial.id || `leave-${partial.startDate}`,
    employeeId: partial.employeeId || baseEmployee.id,
    totalDays: partial.totalDays ?? partial.workingDays ?? 1,
    workingDays: partial.workingDays ?? 1,
    status: partial.status ?? "Approved",
    ...partial,
  };
}

describe("getAnnualLeaveCycle", () => {
  it("returns the cycle containing the as-of date", () => {
    const anchor = parseISO("2024-01-01");
    const cycle = getAnnualLeaveCycle(parseISO("2025-06-15"), anchor);
    expect(format(cycle.cycleStart, "yyyy-MM-dd")).toBe("2025-01-01");
    expect(format(cycle.cycleEnd, "yyyy-MM-dd")).toBe("2025-12-31");
  });
});

describe("getSickLeaveCycle", () => {
  it("uses a 36-month window from employment anchor", () => {
    const anchor = parseISO("2024-01-01");
    const cycle = getSickLeaveCycle(parseISO("2025-06-15"), anchor);
    expect(format(cycle.cycleStart, "yyyy-MM-dd")).toBe("2024-01-01");
    expect(format(cycle.cycleEnd, "yyyy-MM-dd")).toBe("2026-12-31");
  });
});

describe("computeEmployeeLeaveBalance", () => {
  it("gives the full annual entitlement from 1 January on the company leave year", () => {
    const longServing = { ...baseEmployee, startDate: "2004-10-16" };
    const snapshot = computeEmployeeLeaveBalance(longServing, [], parseISO("2027-01-08"));
    expect(snapshot.annual.cycleStart).toBe("2027-01-01");
    expect(snapshot.annual.cycleEnd).toBe("2027-12-31");
    expect(snapshot.annual.entitled).toBe(15);
    expect(snapshot.annual.remaining).toBe(15);
  });

  it("pro-rates annual leave in the year someone starts or leaves", () => {
    const starter = { ...baseEmployee, startDate: "2026-07-01" };
    expect(computeEmployeeLeaveBalance(starter, [], parseISO("2026-07-02")).annual.entitled).toBe(
      round((184 / 365) * 15)
    );
    const leaver = { ...baseEmployee, terminationDate: "2024-03-31" };
    expect(computeEmployeeLeaveBalance(leaver, [], parseISO("2024-03-15")).annual.entitled).toBe(
      round((91 / 366) * 15)
    );
  });

  it("reduces annual remaining when approved leave is taken in cycle", () => {
    const records = [
      leave({
        id: "a1",
        leaveType: "Annual Leave",
        startDate: "2024-03-04",
        endDate: "2024-03-08",
        workingDays: 5,
      }),
    ];
    const snapshot = computeEmployeeLeaveBalance(baseEmployee, records, parseISO("2024-07-01"));
    expect(snapshot.annual.taken).toBe(5);
    expect(snapshot.annual.remaining).toBe(round(snapshot.annual.entitled - 5));
  });

  it("applies opening annual balance on first cycle", () => {
    const employee = { ...baseEmployee, leaveOpeningAnnualBalance: 3 };
    const snapshot = computeEmployeeLeaveBalance(employee, [], parseISO("2024-04-01"));
    expect(snapshot.annual.entitled).toBeGreaterThan(3);
  });

  it("uses sick qualifying accrual in first six months", () => {
    const snapshot = computeEmployeeLeaveBalance(baseEmployee, [], parseISO("2024-03-31"));
    expect(snapshot.sick.inQualifyingPeriod).toBe(true);
    expect(snapshot.sick.entitled).toBeGreaterThan(0);
    expect(snapshot.sick.entitled).toBeLessThan(5);
  });

  it("makes the full 30 sick days available after the first six months, less days already taken", () => {
    const records = [
      leave({ id: "s1", leaveType: "Sick Leave", startDate: "2024-03-04", endDate: "2024-03-05", workingDays: 2 }),
    ];
    const snapshot = computeEmployeeLeaveBalance(baseEmployee, records, parseISO("2024-08-01"));
    expect(snapshot.sick.inQualifyingPeriod).toBe(false);
    expect(snapshot.sick.entitled).toBe(30);
    expect(snapshot.sick.remaining).toBe(28);

    const nextCycle = computeEmployeeLeaveBalance(baseEmployee, records, parseISO("2027-01-04"));
    expect(nextCycle.sick.cycleStart).toBe("2027-01-01");
    expect(nextCycle.sick.remaining).toBe(30);
  });

  it("tracks family responsibility leave separately", () => {
    const records = [
      leave({
        id: "f1",
        leaveType: "Family Responsibility Leave",
        startDate: "2024-02-01",
        endDate: "2024-02-01",
        workingDays: 1,
      }),
    ];
    const snapshot = computeEmployeeLeaveBalance(baseEmployee, records, parseISO("2024-06-01"));
    expect(snapshot.familyResponsibility.taken).toBe(1);
    expect(snapshot.familyResponsibility.remaining).toBe(
      round(snapshot.familyResponsibility.entitled - 1)
    );
  });
});

describe("sumLeaveTakenInRange", () => {
  it("excludes pending leave", () => {
    const records = [
      leave({
        leaveType: "Annual Leave",
        startDate: "2024-03-04",
        endDate: "2024-03-04",
        workingDays: 1,
        status: "Pending",
      }),
    ];
    const taken = sumLeaveTakenInRange(
      baseEmployee.id,
      records,
      "Annual Leave",
      new Date("2024-01-01"),
      new Date("2024-12-31")
    );
    expect(taken).toBe(0);
  });
});

describe("validateLeaveAgainstBalance", () => {
  it("rejects annual leave that exceeds remaining balance", () => {
    const records = Array.from({ length: 14 }).map((_, index) =>
      leave({
        id: `bulk-${index}`,
        leaveType: "Annual Leave",
        startDate: "2024-02-01",
        endDate: "2024-02-01",
        workingDays: 1,
      })
    );
    const result = validateLeaveAgainstBalance(
      baseEmployee,
      records,
      {
        leaveType: "Annual Leave",
        startDate: "2024-06-03",
        endDate: "2024-06-07",
        workingDays: 5,
      },
      parseISO("2024-06-01")
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Insufficient annual leave");
      expect(result.advanceAllowed).toBe(true);
      expect(result.balanceAfter).toBeLessThan(0);
    }

    const advance = validateLeaveAgainstBalance(
      baseEmployee,
      records,
      { leaveType: "Annual Leave", startDate: "2024-06-03", endDate: "2024-06-07", workingDays: 5 },
      parseISO("2024-06-01"),
      { allowAdvance: true }
    );
    expect(advance.ok).toBe(true);
  });

  it("lets the annual balance go negative when leave was granted in advance", () => {
    const records = [
      leave({ id: "closure", leaveType: "Annual Leave", startDate: "2024-02-01", endDate: "2024-02-23", workingDays: 17 }),
    ];
    const snapshot = computeEmployeeLeaveBalance(baseEmployee, records, parseISO("2024-03-01"));
    expect(snapshot.annual.remaining).toBeLessThan(0);
    expect(annualLeaveAdvanceDays(snapshot.annual.remaining)).toBe(round(17 - snapshot.annual.entitled));
    expect(formatLeaveBalance(-2.5)).toBe("2.5 days in advance");
  });

  it("never allows sick leave in advance", () => {
    const result = validateLeaveAgainstBalance(
      baseEmployee,
      [],
      { leaveType: "Sick Leave", startDate: "2024-06-03", endDate: "2024-06-28", workingDays: 20 },
      parseISO("2024-06-01"),
      { allowAdvance: true }
    );
    expect(result.ok).toBe(false);
  });

  it("allows unpaid leave without balance checks", () => {
    const result = validateLeaveAgainstBalance(baseEmployee, [], {
      leaveType: "Unpaid Leave",
      startDate: "2024-06-03",
      endDate: "2024-06-07",
      workingDays: 5,
    });
    expect(result.ok).toBe(true);
  });
});

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

describe("BCEA_LEAVE_DEFAULTS", () => {
  it("documents statutory baseline values", () => {
    expect(BCEA_LEAVE_DEFAULTS.annualWorkingDaysPerCycle).toBe(15);
    expect(BCEA_LEAVE_DEFAULTS.sickDaysPer36MonthCycle).toBe(30);
    expect(BCEA_LEAVE_DEFAULTS.familyResponsibilityDaysPerCycle).toBe(3);
  });
});
