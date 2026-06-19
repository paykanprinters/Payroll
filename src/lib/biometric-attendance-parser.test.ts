import { describe, expect, it } from "vitest";
import {
  aggregateBiometricPunches,
  biometricLogTextToTimesheetRows,
  filterPunchesByDateRange,
  findEmployeeByClockId,
  normalizeBiometricLogText,
  parseBiometricLogText,
  validateBiometricTimesheetRow,
} from "@/lib/biometric-attendance-parser";
import { MockEmployee } from "@/lib/mock-data-interfaces";

const employees: MockEmployee[] = [
  {
    id: "emp-1",
    customEmployeeId: "KP001",
    personalId: "3",
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    jobTitle: "Operator",
    startDate: "2020-01-01",
  },
  {
    id: "emp-2",
    customEmployeeId: "KP002",
    personalId: "7",
    firstName: "John",
    lastName: "Smith",
    email: "john@example.com",
    jobTitle: "Operator",
    startDate: "2020-01-01",
  },
];

describe("parseBiometricLogText", () => {
  it("parses 2026 attendance lines", () => {
    const text = [
      "<Attendance>: 3 : 2026-06-18 07:39:23 (1, 0)",
      "<Attendance>: 3 : 2026-06-18 17:04:12 (1, 0)",
    ].join("\n");

    expect(parseBiometricLogText(text)).toEqual([
      {
        clockId: "3",
        date: "2026-06-18",
        time: "07:39",
        raw: "<Attendance>: 3 : 2026-06-18 07:39:23",
      },
      {
        clockId: "3",
        date: "2026-06-18",
        time: "17:04",
        raw: "<Attendance>: 3 : 2026-06-18 17:04:12",
      },
    ]);
  });

  it("finds attendance lines inside JSON-like blobs", () => {
    const blob =
      '"07:39:23 (1, 0)","<Attendance>: 3 : 2026-06-18 07:39:23 (1, 0)","<Attendance>: 3 : 2026-06-18 17:04:12 (1, 0)"';

    expect(parseBiometricLogText(blob)).toHaveLength(2);
    expect(parseBiometricLogText(blob)[0].date).toBe("2026-06-18");
  });

  it("parses JSON array responses from FastAPI", () => {
    const json = JSON.stringify([
      "<Attendance>: 3 : 2026-06-18 07:39:23 (1, 0)",
      "<Attendance>: 3 : 2026-06-18 17:04:12 (1, 0)",
    ]);

    expect(normalizeBiometricLogText(json)).toContain("<Attendance>: 3");
    expect(parseBiometricLogText(json)).toHaveLength(2);
  });
});

describe("findEmployeeByClockId", () => {
  it("matches numeric clock IDs to employee personalId", () => {
    expect(findEmployeeByClockId(employees, "3")?.id).toBe("emp-1");
    expect(findEmployeeByClockId(employees, "03")?.id).toBe("emp-1");
  });
});

describe("aggregateBiometricPunches", () => {
  it("uses earliest and latest punch as in/out", () => {
    const punches = parseBiometricLogText(
      [
        "<Attendance>: 3 : 2026-06-18 17:04:12 (1, 0)",
        "<Attendance>: 3 : 2026-06-18 07:39:23 (1, 0)",
      ].join("\n")
    );

    const { aggregatedRows, errors } = aggregateBiometricPunches(punches, employees);

    expect(errors.filter((e) => e.error.includes("Only one punch"))).toHaveLength(0);
    expect(aggregatedRows).toHaveLength(1);
    expect(aggregatedRows[0]).toMatchObject({
      employeeId: "emp-1",
      csvPersonalId: "3",
      date: "2026-06-18",
      timeIn: "07:39",
      timeOut: "17:04",
    });
  });

  it("reports unknown clock IDs", () => {
    const punches = parseBiometricLogText("<Attendance>: 99 : 2026-06-18 07:39:23 (1, 0)");
    const { aggregatedRows, errors } = aggregateBiometricPunches(punches, employees);

    expect(aggregatedRows).toHaveLength(0);
    expect(errors[0]?.personalIdAttempted).toBe("99");
  });

  it("warns when only one punch exists for a day", () => {
    const punches = parseBiometricLogText("<Attendance>: 3 : 2026-06-18 07:39:23 (1, 0)");
    const { errors } = aggregateBiometricPunches(punches, employees);

    expect(errors.some((e) => e.error.includes("Only one punch"))).toBe(true);
  });
});

describe("validateBiometricTimesheetRow", () => {
  it("rejects equal in/out times", () => {
    const row = validateBiometricTimesheetRow(
      {
        employeeId: "emp-1",
        csvPersonalId: "3",
        date: "2026-06-18",
        timeIn: "07:39",
        timeOut: "07:39",
      },
      employees
    );

    expect(row._isValid).toBe(false);
    expect(row._errors[0]).toContain("Time Out must be later");
  });
});

describe("biometricLogTextToTimesheetRows", () => {
  it("filters by date range using YYYY-MM-DD", () => {
    const text = [
      "<Attendance>: 3 : 2026-06-17 07:39:23 (1, 0)",
      "<Attendance>: 3 : 2026-06-18 07:39:23 (1, 0)",
      "<Attendance>: 3 : 2026-06-18 17:04:12 (1, 0)",
    ].join("\n");

    const { aggregatedRows, punchCount } = biometricLogTextToTimesheetRows(
      text,
      employees,
      "2026-06-18",
      "2026-06-18"
    );

    expect(punchCount).toBe(2);
    expect(aggregatedRows).toHaveLength(1);
    expect(aggregatedRows[0].date).toBe("2026-06-18");
  });
});

describe("filterPunchesByDateRange", () => {
  it("applies inclusive bounds", () => {
    const punches = parseBiometricLogText(
      [
        "<Attendance>: 3 : 2026-06-17 07:39:23 (1, 0)",
        "<Attendance>: 3 : 2026-06-18 07:39:23 (1, 0)",
      ].join("\n")
    );

    expect(filterPunchesByDateRange(punches, "2026-06-18", "2026-06-18")).toHaveLength(1);
  });
});
