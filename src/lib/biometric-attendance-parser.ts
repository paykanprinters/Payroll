import { format, isValid, max, min, parse } from "date-fns";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import type { AggregationError, ParsedTimesheetRow } from "@/hooks/use-timesheet-import";

/** Default Kan Printers biometric attendance log endpoint */
export const DEFAULT_BIOMETRIC_API_URL = "http://102.69.157.253:8000/logs";

/** Attendance logs use ISO dates: YYYY-MM-DD HH:mm:ss */
export const BIOMETRIC_DATE_FORMAT = "yyyy-MM-dd";

/**
 * Parses lines like:
 * `<Attendance>: 3 : 2026-06-18 07:39:23 (1, 0)`
 * where `3` is the biometric clock ID (maps to employee Personal ID).
 */
const ATTENDANCE_LINE_PATTERN =
  /<Attendance>\s*:\s*(\d+)\s*:\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/gi;

export type BiometricPunch = {
  clockId: string;
  date: string;
  time: string;
  raw: string;
};

function extractLogTextFromJson(body: unknown): string {
  if (typeof body === "string") return body;
  if (Array.isArray(body)) {
    return body.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join("\n");
  }
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["logs", "data", "entries", "items", "lines", "content", "text"]) {
      const value = record[key];
      if (typeof value === "string") return value;
      if (Array.isArray(value)) return extractLogTextFromJson(value);
    }
    return JSON.stringify(body);
  }
  return String(body ?? "");
}

/** Normalize JSON arrays, quoted CSV blobs, or plain text from the biometric API. */
export function normalizeBiometricLogText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      return extractLogTextFromJson(JSON.parse(trimmed));
    } catch {
      // Fall through — scan as plain text (partial JSON fragments still contain attendance lines).
    }
  }

  return trimmed;
}

export function parseBiometricLogText(text: string): BiometricPunch[] {
  const normalized = normalizeBiometricLogText(text);
  if (!normalized) return [];

  const punches: BiometricPunch[] = [];
  const seen = new Set<string>();

  for (const match of normalized.matchAll(ATTENDANCE_LINE_PATTERN)) {
    const clockId = match[1].trim();
    const date = match[2];
    const timeWithSeconds = match[3];
    const raw = match[0];
    const dedupeKey = `${clockId}|${date}|${timeWithSeconds.slice(0, 5)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    punches.push({
      clockId,
      date,
      time: timeWithSeconds.slice(0, 5),
      raw,
    });
  }

  return punches;
}

export function filterPunchesByDateRange(
  punches: BiometricPunch[],
  startDate?: string,
  endDate?: string
): BiometricPunch[] {
  return punches.filter((punch) => {
    if (startDate && punch.date < startDate) return false;
    if (endDate && punch.date > endDate) return false;
    return true;
  });
}

function normalizeClockId(value: string | number | undefined | null): string {
  return String(value ?? "").trim();
}

function clockIdsMatch(
  employeeValue: string | number | undefined | null,
  clockId: string
): boolean {
  const left = normalizeClockId(employeeValue);
  const right = normalizeClockId(clockId);
  if (!left || !right) return false;
  if (left === right) return true;

  const leftNum = Number(left);
  const rightNum = Number(right);
  if (!Number.isNaN(leftNum) && !Number.isNaN(rightNum) && leftNum === rightNum) {
    return true;
  }

  return false;
}

export function findEmployeeByClockId(
  employees: MockEmployee[],
  clockId: string
): MockEmployee | undefined {
  return employees.find(
    (emp) =>
      clockIdsMatch(emp.personalId, clockId) || clockIdsMatch(emp.customEmployeeId, clockId)
  );
}

export function aggregateBiometricPunches(
  punches: BiometricPunch[],
  employees: MockEmployee[]
): {
  aggregatedRows: Omit<ParsedTimesheetRow, "_isValid" | "_errors">[];
  errors: AggregationError[];
} {
  const employeeDailyPunches = new Map<string, Map<string, Date[]>>();
  const errors: AggregationError[] = [];

  for (const punch of punches) {
    const employee = findEmployeeByClockId(employees, punch.clockId);
    if (!employee) {
      errors.push({
        originalRow: { raw: punch.raw },
        personalIdAttempted: punch.clockId,
        dateAttempted: punch.date,
        error: `Clock ID '${punch.clockId}' not found — set Personal ID (Clock ID) on the employee record.`,
      });
      continue;
    }

    const punchDateTime = parse(`${punch.date} ${punch.time}`, `${BIOMETRIC_DATE_FORMAT} HH:mm`, new Date());
    if (!isValid(punchDateTime)) {
      errors.push({
        originalRow: { raw: punch.raw },
        personalIdAttempted: punch.clockId,
        dateAttempted: punch.date,
        error: `Could not parse punch time '${punch.date} ${punch.time}'.`,
      });
      continue;
    }

    if (!employeeDailyPunches.has(employee.id)) {
      employeeDailyPunches.set(employee.id, new Map());
    }
    const dailyPunches = employeeDailyPunches.get(employee.id)!;

    if (!dailyPunches.has(punch.date)) {
      dailyPunches.set(punch.date, []);
    }
    dailyPunches.get(punch.date)!.push(punchDateTime);
  }

  const aggregatedRows: Omit<ParsedTimesheetRow, "_isValid" | "_errors">[] = [];

  employeeDailyPunches.forEach((dailyPunchesMap, employeeId) => {
    const employee = employees.find((e) => e.id === employeeId);
    dailyPunchesMap.forEach((punchTimes, date) => {
      if (punchTimes.length === 0) return;

      const earliest = min(punchTimes);
      const latest = max(punchTimes);
      const timeIn = format(earliest, "HH:mm");
      const timeOut = format(latest, "HH:mm");

      if (punchTimes.length === 1) {
        errors.push({
          originalRow: {},
          personalIdAttempted: employee?.personalId || employee?.customEmployeeId || "Unknown",
          dateAttempted: date,
          error: `Only one punch for clock ID '${employee?.personalId || "?"}' on ${date} — add clock-out or edit Time Out manually.`,
        });
      }

      aggregatedRows.push({
        employeeId,
        csvPersonalId: employee?.personalId || employee?.customEmployeeId || "Unknown",
        date,
        timeIn,
        timeOut,
      });
    });
  });

  aggregatedRows.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return a.csvPersonalId.localeCompare(b.csvPersonalId, undefined, { numeric: true });
  });

  return { aggregatedRows, errors };
}

const HHMM_RE = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateBiometricTimesheetRow(
  row: Omit<ParsedTimesheetRow, "_isValid" | "_errors">,
  employees: MockEmployee[]
): ParsedTimesheetRow {
  const errors: string[] = [];
  const normalizedDate = (row.date || "").replace(/\//g, "-");

  if (!ISO_DATE_RE.test(normalizedDate)) {
    errors.push("Invalid date format. Expected YYYY-MM-DD from biometric logs.");
  }
  if (!HHMM_RE.test(row.timeIn)) errors.push("Invalid Time In (HH:mm).");
  if (!HHMM_RE.test(row.timeOut)) errors.push("Invalid Time Out (HH:mm).");

  if (HHMM_RE.test(row.timeIn) && HHMM_RE.test(row.timeOut)) {
    const [ih, im] = row.timeIn.split(":").map(Number);
    const [oh, om] = row.timeOut.split(":").map(Number);
    if (oh * 60 + om <= ih * 60 + im) {
      errors.push("Time Out must be later than Time In (earliest punch = in, latest = out).");
    }
  }

  if (!employees.some((e) => e.id === row.employeeId)) {
    errors.push("Employee not found — check Clock ID on the employee record.");
  }

  return {
    ...row,
    date: normalizedDate,
    _isValid: errors.length === 0,
    _errors: errors,
  };
}

export function biometricLogTextToTimesheetRows(
  logText: string,
  employees: MockEmployee[],
  startDate?: string,
  endDate?: string
): {
  aggregatedRows: Omit<ParsedTimesheetRow, "_isValid" | "_errors">[];
  errors: AggregationError[];
  punchCount: number;
} {
  const allPunches = parseBiometricLogText(logText);
  const punches = filterPunchesByDateRange(allPunches, startDate, endDate);
  const { aggregatedRows, errors } = aggregateBiometricPunches(punches, employees);

  if (allPunches.length > 0 && punches.length === 0) {
    errors.unshift({
      originalRow: {},
      personalIdAttempted: "N/A",
      dateAttempted: `${startDate || "?"} – ${endDate || "?"}`,
      error: "No attendance punches found in the selected date range.",
    });
  }

  if (allPunches.length === 0 && logText.trim()) {
    errors.unshift({
      originalRow: {},
      personalIdAttempted: "N/A",
      dateAttempted: "N/A",
      error: "No attendance lines matched `<Attendance>: {clockId} : YYYY-MM-DD HH:mm:ss`.",
    });
  }

  return { aggregatedRows, errors, punchCount: punches.length };
}
