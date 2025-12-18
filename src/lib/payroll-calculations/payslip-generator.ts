import { 
  eachDayOfInterval,
  format,
  parseISO,
  isWithinInterval,
  differenceInYears,
  differenceInCalendarDays,
  startOfDay,
  endOfDay,
  isSameMonth
} from "date-fns";
import { 
  MockEmployee, 
  Loan, 
  SavingPlan, 
  LeaveEntry, 
  MockPayslip, 
  TimesheetEntry, 
  LoanDeductionHistoryEntry 
} from "../mock-data-interfaces";
import { PayrollSavingsEntry } from "@/lib/savings-types";
import { TaxTables } from "@/hooks/use-tax-tables";
import { calculatePAYE, calculateWorkingDays } from "@/lib/payroll-calculations";
import { v4 as uuidv4 } from "uuid";
import { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries";
import { bankersRound } from "@/lib/utils";
import type { WorkHoursSettings } from "@/hooks/use-work-hours-settings";
import type { PublicHoliday } from "@/hooks/use-public-holidays";

/* ---------------------------- Utility functions ---------------------------- */

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const computeWeeklyScheduledHours = (settings?: WorkHoursSettings | null): number => {
  if (!settings) return 35; // Fallback Mon–Fri 09:00–17:00 w/ 60m unpaid lunch
  const selected = new Set((settings.workDays || []).map((d) => d.toLowerCase()));
  const has = (name: string) => selected.has(name.toLowerCase());

  const dailyStart = settings.dailyStartTime || "09:00";
  const dailyEnd = settings.dailyEndTime || "17:00";
  const friStart = settings.fridayStartTime || dailyStart;
  const friEnd = settings.fridayEndTime || dailyEnd;
  const breakMinutes = settings.breakDurationMinutes || 0;
  const isPaidLunch = settings.paidLunch === true;

  const subtract = isPaidLunch ? 0 : breakMinutes;
  const baseHours = Math.max(0, (timeToMinutes(dailyEnd) - timeToMinutes(dailyStart) - subtract) / 60);
  const friHours = Math.max(0, (timeToMinutes(friEnd) - timeToMinutes(friStart) - subtract) / 60);

  let total = 0;
  if (has("monday")) total += baseHours;
  if (has("tuesday")) total += baseHours;
  if (has("wednesday")) total += baseHours;
  if (has("thursday")) total += baseHours;
  if (has("friday")) total += friHours;
  if (has("saturday")) total += baseHours;
  if (has("sunday")) total += baseHours;
  return total;
};

const deriveHourlyRate = (emp: MockEmployee, settings?: WorkHoursSettings | null): number => {
  if (emp.hourlyRate && emp.hourlyRate > 0) return emp.hourlyRate;
  if (emp.salary && emp.salary > 0) {
    const weeklyHours = computeWeeklyScheduledHours(settings);
    if (weeklyHours <= 0) return 0;
    if (emp.payFrequency === "Weekly") return emp.salary / weeklyHours;
    if (emp.payFrequency === "Bi-Weekly") return emp.salary / (2 * weeklyHours);
    const monthlyHours = weeklyHours * 4.3333;
    return emp.salary / monthlyHours;
  }
  return 0;
};

const getWeeklyThreshold = (settings?: WorkHoursSettings | null): number => {
  const t = settings?.overtimeThresholdHours;
  return typeof t === "number" && t > 0 ? t : 41.25;
};

const computeThresholdForPeriod = (
  emp: MockEmployee,
  weeklyThreshold: number,
  periodStart: Date,
  periodEnd: Date
): number => {
  if (emp.payFrequency === "Bi-Weekly") {
    return weeklyThreshold * 2;
  }
  if (emp.payFrequency === "Monthly") {
    const daysInPeriod = differenceInCalendarDays(periodEnd, periodStart) + 1;
    const approxWeeks = Math.max(1, Math.round(daysInPeriod / 7));
    return weeklyThreshold * approxWeeks;
  }
  return weeklyThreshold; // Weekly
};

const isSameMonthDay = (isoA: string, isoB: string) => {
  const a = parseISO(isoA);
  const b = parseISO(isoB);
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

const dayIsHolidayForEmployee = (
  dateISO: string,
  employee: MockEmployee,
  holidays: PublicHoliday[]
): PublicHoliday | null => {
  for (const h of holidays) {
    const match = h.recurring ? isSameMonthDay(h.date, dateISO) : h.date === dateISO;
    if (!match) continue;

    // Department scoping if provided
    if (h.departments && h.departments.length > 0) {
      if (!employee.department || !h.departments.includes(employee.department)) continue;
    }
    return h;
  }
  return null;
};

const scheduledHoursForDay = (dateISO: string, settings?: WorkHoursSettings | null): number => {
  if (!settings) return 0;
  const isPaidLunch = settings.paidLunch === true;
  const subtract = isPaidLunch ? 0 : settings.breakDurationMinutes || 0;

  const d = parseISO(dateISO);
  const isFriday = d.getDay() === 5;
  const start = isFriday && settings.fridayStartTime ? settings.fridayStartTime : settings.dailyStartTime || "09:00";
  const end = isFriday && settings.fridayEndTime ? settings.fridayEndTime : settings.dailyEndTime || "17:00";

  const minutes = Math.max(0, timeToMinutes(end) - timeToMinutes(start) - subtract);
  return Math.max(0, minutes / 60);
};

const groupTimesheetsByDate = (entries: TimesheetEntry[]): Record<string, TimesheetEntry[]> => {
  const map: Record<string, TimesheetEntry[]> = {};
  entries.forEach((ts) => {
    (map[ts.date] ||= []).push(ts);
  });
  return map;
};

/* ------------------------- Earnings calculation helpers ------------------------- */

type NonHolidayHourBuckets = {
  weekdayPaidHours: number;
  saturdayPaidHours: number;
  sundayPaidHours: number;
};

type HolidayHourBuckets = {
  holidayWorkedHours: number;    // 2.0x when timesheet present
  holidayNonWorkedHours: number; // 1.5x when no timesheet (scheduled)
};

const collectHolidayBuckets = (
  emp: MockEmployee,
  approvedTs: TimesheetEntry[],
  periodStart: Date,
  periodEnd: Date,
  workDaysSet: Set<string>,
  settings?: WorkHoursSettings | null,
  holidays: PublicHoliday[] = []
): HolidayHourBuckets => {
  const buckets: HolidayHourBuckets = { holidayWorkedHours: 0, holidayNonWorkedHours: 0 };
  const tsByDate = groupTimesheetsByDate(approvedTs);

  const days = eachDayOfInterval({ start: periodStart, end: periodEnd });
  days.forEach((day) => {
    const iso = format(day, "yyyy-MM-dd");
    const holiday = dayIsHolidayForEmployee(iso, emp, holidays);
    if (!holiday) return;

    const dayName = format(day, "EEEE").toLowerCase();
    const isSelectedWorkDay = workDaysSet.has(dayName);
    if (!isSelectedWorkDay) return;

    const entries = tsByDate[iso] || [];
    if (entries.length === 0) {
      // No timesheet: scheduled hours paid @1.5x
      buckets.holidayNonWorkedHours += scheduledHoursForDay(iso, settings);
    } else {
      // Worked: recorded hours paid @2.0x
      buckets.holidayWorkedHours += entries.reduce((s, e) => s + (e.totalWorkHours || 0), 0);
    }
  });

  return buckets;
};

const collectNonHolidayBuckets = (
  emp: MockEmployee,
  approvedTs: TimesheetEntry[],
  holidays: PublicHoliday[] = []
): NonHolidayHourBuckets => {
  const res: NonHolidayHourBuckets = { weekdayPaidHours: 0, saturdayPaidHours: 0, sundayPaidHours: 0 };

  approvedTs.forEach((ts) => {
    const isHoliday = !!dayIsHolidayForEmployee(ts.date, emp, holidays);
    if (isHoliday) return; // handled separately

    const hours = ts.totalWorkHours || 0;
    const date = parseISO(ts.date);
    const dow = date.getDay(); // 0 Sun, 6 Sat

    if (dow === 0) res.sundayPaidHours += hours;
    else if (dow === 6) res.saturdayPaidHours += hours;
    else res.weekdayPaidHours += hours;
  });

  return res;
};

type OvertimeAllocation = {
  regularHours: number;
  overtimeWeekdayHours: number;
  overtimeSaturdayHours: number;
  overtimeSundayHours: number;
};

const allocateOvertime = (
  buckets: NonHolidayHourBuckets,
  thresholdForPeriod: number
): OvertimeAllocation => {
  const totalNonHoliday = buckets.weekdayPaidHours + buckets.saturdayPaidHours + buckets.sundayPaidHours;
  const regularHours = Math.min(totalNonHoliday, thresholdForPeriod);

  let remainingOT = Math.max(0, totalNonHoliday - thresholdForPeriod);

  const overtimeSundayHours = Math.min(buckets.sundayPaidHours, remainingOT);
  remainingOT -= overtimeSundayHours;

  const overtimeSaturdayHours = Math.min(buckets.saturdayPaidHours, remainingOT);
  remainingOT -= overtimeSaturdayHours;

  const overtimeWeekdayHours = Math.min(buckets.weekdayPaidHours, remainingOT);
  remainingOT -= overtimeWeekdayHours;

  return { regularHours, overtimeWeekdayHours, overtimeSaturdayHours, overtimeSundayHours };
};

const computeBasicSalary = (
  emp: MockEmployee,
  regularHours: number,
  hourlyRate: number,
  leaveRecords: LeaveEntry[],
  periodStart: Date,
  periodEnd: Date
): number => {
  // Hourly employees paid on regular non-holiday hours only
  if (emp.hourlyRate && emp.hourlyRate > 0) {
    return regularHours * hourlyRate;
  }

  // Salaried employees: pro-rate unpaid leave
  if (emp.salary && emp.salary > 0) {
    let basic = emp.salary;
    let unpaidLeaveDaysInPeriod = 0;

    const employeeUnpaidLeave = leaveRecords.filter(
      (rec) =>
        rec.employeeId === emp.id &&
        rec.leaveType === "Unpaid Leave" &&
        (isWithinInterval(new Date(rec.startDate), { start: periodStart, end: periodEnd }) ||
          isWithinInterval(new Date(rec.endDate), { start: periodStart, end: periodEnd }) ||
          (new Date(rec.startDate) < periodStart && new Date(rec.endDate) > periodEnd))
    );

    employeeUnpaidLeave.forEach((rec) => {
      const leaveStart = new Date(rec.startDate);
      const leaveEnd = new Date(rec.endDate);
      const overlapStart = leaveStart > periodStart ? leaveStart : periodStart;
      const overlapEnd = leaveEnd < periodEnd ? leaveEnd : periodEnd;
      unpaidLeaveDaysInPeriod += calculateWorkingDays(overlapStart, overlapEnd);
    });

    if (unpaidLeaveDaysInPeriod > 0) {
      const workingDaysInPeriod = calculateWorkingDays(periodStart, periodEnd) || 1;
      const dailyRate = (emp.salary as number) / workingDaysInPeriod;
      basic -= dailyRate * unpaidLeaveDaysInPeriod;
    }
    return basic;
  }

  return 0;
};

const computeHolidayAmounts = (
  holidayWorkedHours: number,
  holidayNonWorkedHours: number,
  hourlyRate: number
) => {
  const workedAmount = bankersRound(hourlyRate > 0 ? holidayWorkedHours * hourlyRate * 2.0 : 0, 2);
  const nonWorkedAmount = bankersRound(hourlyRate > 0 ? holidayNonWorkedHours * hourlyRate * 1.5 : 0, 2);
  return { workedAmount, nonWorkedAmount };
};

const computeOvertimeAmounts = (
  hourlyRate: number,
  overtimeWeekdayHours: number,
  overtimeSaturdayHours: number,
  overtimeSundayHours: number
) => {
  const weekdayAmount = bankersRound(hourlyRate > 0 ? overtimeWeekdayHours * hourlyRate * 1.5 : 0, 2);
  const saturdayAmount = bankersRound(hourlyRate > 0 ? overtimeSaturdayHours * hourlyRate * 1.5 : 0, 2);
  const sundayAmount = bankersRound(hourlyRate > 0 ? overtimeSundayHours * hourlyRate * 2.0 : 0, 2);
  return { weekdayAmount, saturdayAmount, sundayAmount };
};

const buildEarningsBreakdown = (
  emp: MockEmployee,
  regularHours: number,
  basicSalary: number,
  overtimeAmounts: { weekdayAmount: number; saturdayAmount: number; sundayAmount: number },
  overtimeHours: { overtimeWeekdayHours: number; overtimeSaturdayHours: number; overtimeSundayHours: number },
  holidayAmounts: { workedAmount: number; nonWorkedAmount: number },
  holidayHours: { holidayWorkedHours: number; holidayNonWorkedHours: number },
  periodStart: Date
): { earningsBreakdown: { name: string; amount: number }[]; grossEarnings: number } => {
  const roundedBasic = bankersRound(basicSalary, 2);
  const lines: { name: string; amount: number }[] = [
    {
      name: emp.hourlyRate && emp.hourlyRate > 0
        ? `Regular Hours (${regularHours.toFixed(2)}h)`
        : "Basic Salary",
      amount: roundedBasic,
    },
  ];

  if (overtimeAmounts.weekdayAmount > 0) {
    lines.push({
      name: `Overtime (Weekday ${overtimeHours.overtimeWeekdayHours.toFixed(2)}h @1.5x)`,
      amount: overtimeAmounts.weekdayAmount,
    });
  }
  if (overtimeAmounts.saturdayAmount > 0) {
    lines.push({
      name: `Weekend Overtime (Sat ${overtimeHours.overtimeSaturdayHours.toFixed(2)}h @1.5x)`,
      amount: overtimeAmounts.saturdayAmount,
    });
  }
  if (overtimeAmounts.sundayAmount > 0) {
    lines.push({
      name: `Weekend Overtime (Sun ${overtimeHours.overtimeSundayHours.toFixed(2)}h @2.0x)`,
      amount: overtimeAmounts.sundayAmount,
    });
  }

  if (holidayAmounts.nonWorkedAmount > 0) {
    lines.push({
      name: `Public Holiday (no timesheet ${holidayHours.holidayNonWorkedHours.toFixed(2)}h @1.5x)`,
      amount: holidayAmounts.nonWorkedAmount,
    });
  }
  if (holidayAmounts.workedAmount > 0) {
    lines.push({
      name: `Public Holiday (worked ${holidayHours.holidayWorkedHours.toFixed(2)}h @2.0x)`,
      amount: holidayAmounts.workedAmount,
    });
  }

  // Existing mock bonus behavior
  if (emp.id === "EMP004" && isSameMonth(periodStart, new Date())) {
    lines.push({ name: "Bonus", amount: bankersRound(2000, 2) });
  }

  const grossEarnings = bankersRound(lines.reduce((sum, e) => sum + e.amount, 0), 2);
  return { earningsBreakdown: lines, grossEarnings };
};

/* ---------------------------- Deductions helpers ---------------------------- */

const computeUIF = (
  grossEarnings: number,
  uifSdlRates: TaxTables["uifSdlRates"] | null,
  emp: MockEmployee,
  userTaxSettings: UserTaxSettings | null
) => {
  if (uifSdlRates) {
    const monthlyCap = uifSdlRates.uif_cap;
    const uifRate = uifSdlRates.uif_rate;
    const getCapForFrequency = (freq: MockEmployee["payFrequency"] | undefined) => {
      if (!freq) return monthlyCap;
      if (freq === "Weekly") return monthlyCap / 4.3333;
      if (freq === "Bi-Weekly") return monthlyCap / 2.1667;
      return monthlyCap;
    };
    const shouldProRate = userTaxSettings?.proRateUifCapByFrequency === true;
    const capToUse = shouldProRate ? getCapForFrequency(emp.payFrequency) : monthlyCap;
    return bankersRound(Math.min(grossEarnings * uifRate, capToUse), 2);
  }
  return bankersRound(Math.min(grossEarnings * 0.01, 177.12), 2);
};

const computePAYE = (
  taxableIncomeForPAYE: number,
  taxTables: TaxTables,
  emp: MockEmployee,
  userTaxSettings: UserTaxSettings | null
): number => {
  const applyPAYEFlag = userTaxSettings?.applyPaye ?? true;
  const { payeBrackets, taxYearDetails } = taxTables;
  if (!applyPAYEFlag || !payeBrackets || payeBrackets.length === 0 || !emp.payFrequency) return 0;

  let employeeAge: number | null = null;
  if (emp.dateOfBirth) {
    employeeAge = differenceInYears(new Date(), new Date(emp.dateOfBirth));
  }
  const paye = calculatePAYE(
    taxableIncomeForPAYE,
    payeBrackets,
    taxYearDetails,
    employeeAge,
    emp.payFrequency
  );
  return paye > 0 ? bankersRound(paye, 2) : 0;
};

const buildDeductions = (
  emp: MockEmployee,
  grossEarnings: number,
  loans: Loan[],
  savingPlans: SavingPlan[],
  taxTables: TaxTables,
  userTaxSettings: UserTaxSettings | null,
  periodStart: Date,
  periodEnd: Date,
  payPeriodString: string,
  payrollSavingsEntries: PayrollSavingsEntry[] | null
) => {
  let totalDeductions = 0;
  const deductionsBreakdown: { name: string; amount: number }[] = [];

  const uif = computeUIF(grossEarnings, taxTables.uifSdlRates, emp, userTaxSettings);
  const taxableForPAYE = Math.max(0, grossEarnings - uif);
  const paye = computePAYE(taxableForPAYE, taxTables, emp, userTaxSettings);

  deductionsBreakdown.push({ name: "UIF", amount: uif });
  totalDeductions += uif;

  if (paye > 0) {
    deductionsBreakdown.push({ name: "PAYE", amount: paye });
    totalDeductions += paye;
  }

  const applySDLFlag = userTaxSettings?.applySdl ?? true;
  if (applySDLFlag) {
    if (taxTables.uifSdlRates) {
      const sdlRaw = taxableForPAYE * taxTables.uifSdlRates.sdl_rate + uif;
      const sdl = bankersRound(sdlRaw, 2);
      deductionsBreakdown.push({ name: "SDL", amount: sdl });
      totalDeductions += sdl;
    } else {
      const sdl = bankersRound(grossEarnings * 0.01, 2);
      deductionsBreakdown.push({ name: "SDL", amount: sdl });
      totalDeductions += sdl;
    }
  }

  // Loans
  const isFullPeriod = (frequency: "Monthly" | "Weekly" | "Bi-Weekly", start: Date, end: Date): boolean => {
    if (frequency === "Monthly") {
      return (
        format(start, "dd") === "01" &&
        format(end, "dd") === format(new Date(end.getFullYear(), end.getMonth() + 1, 0), "dd")
      );
    }
    if (frequency === "Weekly") {
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) === 6;
    }
    if (frequency === "Bi-Weekly") {
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) === 13;
    }
    return false;
  };

  loans.forEach((loan) => {
    if (loan.employeeId !== emp.id || loan.status === "completed" || new Date(loan.startDate) > periodEnd) return;

    if (loan.paused) {
      const pauseEntry: LoanDeductionHistoryEntry = {
        date: format(periodEnd, "yyyy-MM-dd"),
        amount: 0,
        type: "pause",
        notes: `Deduction paused for pay period ${payPeriodString}`,
      };
      loan.deductionHistory.push(pauseEntry);
      loan.paused = false;
      return;
    }

    let deductionAmount = 0;
    const employeePayFrequency = emp.payFrequency;
    if (loan.frequency === employeePayFrequency?.toLowerCase()) {
      if (isFullPeriod(employeePayFrequency, periodStart, periodEnd)) {
        deductionAmount = loan.repaymentAmount;
      }
    } else if (employeePayFrequency === "Monthly" && loan.frequency === "weekly") {
      if (isFullPeriod("Monthly", periodStart, periodEnd)) deductionAmount = loan.repaymentAmount * 4;
    } else if (employeePayFrequency === "Bi-Weekly" && loan.frequency === "weekly") {
      if (isFullPeriod("Bi-Weekly", periodStart, periodEnd)) deductionAmount = loan.repaymentAmount * 2;
    }

    if (deductionAmount > 0) {
      const rounded = bankersRound(deductionAmount, 2);
      deductionsBreakdown.push({ name: "Loan Repayment", amount: rounded });
      totalDeductions += rounded;
      loan.remainingBalance -= rounded;

      const entry: LoanDeductionHistoryEntry = {
        date: format(periodEnd, "yyyy-MM-dd"),
        amount: rounded,
        type: "deduction",
        notes: `Payroll deduction for pay period ${payPeriodString}`,
      };
      loan.deductionHistory.push(entry);
      if (loan.remainingBalance <= 0) {
        loan.status = "completed";
        loan.remainingBalance = 0;
      }
    }
  });

  // Savings
  savingPlans.forEach((plan) => {
    if (plan.employeeId !== emp.id || plan.status !== "active" || new Date(plan.startDate) > periodEnd) return;
    if (plan.endDate && new Date(plan.endDate) < periodStart) return;

    const employeePayFrequency = emp.payFrequency;

    const entryForPlan = payrollSavingsEntries?.find(
      (e) => e.planId === plan.id && e.employeeId === emp.id
    ) || null;

    const isPaused = entryForPlan?.paused === true;
    if (isPaused) return;

    const baseAmount = entryForPlan ? (entryForPlan.overrideAmount ?? entryForPlan.originalAmount) : plan.amount;

    let deductionAmount = 0;
    if (plan.frequency === employeePayFrequency?.toLowerCase()) {
      if (isFullPeriod(employeePayFrequency, periodStart, periodEnd)) deductionAmount = baseAmount;
    } else if (employeePayFrequency === "Monthly" && plan.frequency === "weekly") {
      if (isFullPeriod("Monthly", periodStart, periodEnd)) deductionAmount = baseAmount * 4;
    } else if (employeePayFrequency === "Bi-Weekly" && plan.frequency === "weekly") {
      if (isFullPeriod("Bi-Weekly", periodStart, periodEnd)) deductionAmount = baseAmount * 2;
    }

    if (deductionAmount > 0) {
      const rounded = bankersRound(deductionAmount, 2);
      deductionsBreakdown.push({ name: "Savings", amount: rounded });
      totalDeductions += rounded;
    }
  });

  totalDeductions = bankersRound(totalDeductions, 2);
  return { deductionsBreakdown, totalDeductions };
};

/* ------------------------------- Main routine ------------------------------- */

const calculateEarnings = (
  emp: MockEmployee,
  approvedTimesheetsForPeriod: TimesheetEntry[],
  leaveRecords: LeaveEntry[],
  payPeriodStart: Date,
  payPeriodEnd: Date,
  workHoursSettings?: WorkHoursSettings | null,
  holidays: PublicHoliday[] = []
) => {
  const weeklyThreshold = getWeeklyThreshold(workHoursSettings);
  const hourlyRate = deriveHourlyRate(emp, workHoursSettings);
  const workDaysSet = new Set((workHoursSettings?.workDays || []).map((d) => d.toLowerCase()));

  const holidayBuckets = collectHolidayBuckets(
    emp,
    approvedTimesheetsForPeriod,
    payPeriodStart,
    payPeriodEnd,
    workDaysSet,
    workHoursSettings,
    holidays
  );

  const nonHolidayBuckets = collectNonHolidayBuckets(emp, approvedTimesheetsForPeriod, holidays);
  const thresholdForPeriod = computeThresholdForPeriod(emp, weeklyThreshold, payPeriodStart, payPeriodEnd);
  const overtimeAlloc = allocateOvertime(nonHolidayBuckets, thresholdForPeriod);

  const basicSalary = computeBasicSalary(
    emp,
    overtimeAlloc.regularHours,
    hourlyRate,
    leaveRecords,
    payPeriodStart,
    payPeriodEnd
  );

  const holidayAmounts = computeHolidayAmounts(
    holidayBuckets.holidayWorkedHours,
    holidayBuckets.holidayNonWorkedHours,
    hourlyRate
  );

  const overtimeAmounts = computeOvertimeAmounts(
    hourlyRate,
    overtimeAlloc.overtimeWeekdayHours,
    overtimeAlloc.overtimeSaturdayHours,
    overtimeAlloc.overtimeSundayHours
  );

  return buildEarningsBreakdown(
    emp,
    overtimeAlloc.regularHours,
    basicSalary,
    overtimeAmounts,
    {
      overtimeWeekdayHours: overtimeAlloc.overtimeWeekdayHours,
      overtimeSaturdayHours: overtimeAlloc.overtimeSaturdayHours,
      overtimeSundayHours: overtimeAlloc.overtimeSundayHours,
    },
    holidayAmounts,
    {
      holidayWorkedHours: holidayBuckets.holidayWorkedHours,
      holidayNonWorkedHours: holidayBuckets.holidayNonWorkedHours,
    },
    payPeriodStart
  );
};

export const generatePayslipsForPeriod = (
  employees: MockEmployee[],
  initialLoans: Loan[],
  initialSavingPlans: SavingPlan[],
  leaveRecords: LeaveEntry[],
  timesheets: TimesheetEntry[],
  payPeriodStart: Date,
  payPeriodEnd: Date,
  taxTables: TaxTables,
  userTaxSettings: UserTaxSettings | null,
  payrollSavingsEntries: PayrollSavingsEntry[] | null,
  workHoursSettings?: WorkHoursSettings | null,
  holidays: PublicHoliday[] = []
): { 
  payslips: MockPayslip[]; 
  updatedLoans: Loan[]; 
  updatedSavingPlans: SavingPlan[]; 
  savingPaymentsToRecord: { planId: string; employeeId: string; amount: number }[] 
} => {
  const payslipsForPeriod: MockPayslip[] = [];
  const payPeriodString = `${format(payPeriodStart, "yyyy-MM-dd")} - ${format(payPeriodEnd, "yyyy-MM-dd")}`;
  const payDateString = format(payPeriodEnd, "dd/MM/yyyy");

  // Create deep copies to mutate safely
  const processingLoans: Loan[] = JSON.parse(JSON.stringify(initialLoans));
  const processingSavingPlans: SavingPlan[] = JSON.parse(JSON.stringify(initialSavingPlans));
  const savingPaymentsToRecord: { planId: string; employeeId: string; amount: number }[] = [];

  employees.forEach((emp) => {
    const approvedTimesheetsForPeriod = timesheets.filter((ts) => {
      const isEmployeeMatch = ts.employeeId === emp.id;
      const eligibleStatus = ts.status === "Approved" || ts.status === "Locked" || ts.status === "Submitted";
      const tsDate = parseISO(ts.date);
      const inRange = isWithinInterval(tsDate, { start: startOfDay(payPeriodStart), end: endOfDay(payPeriodEnd) });
      return isEmployeeMatch && eligibleStatus && inRange;
    });

    const { earningsBreakdown, grossEarnings } = calculateEarnings(
      emp,
      approvedTimesheetsForPeriod,
      leaveRecords,
      payPeriodStart,
      payPeriodEnd,
      workHoursSettings,
      holidays
    );

    const { deductionsBreakdown, totalDeductions } = buildDeductions(
      emp,
      grossEarnings,
      processingLoans,
      processingSavingPlans,
      taxTables,
      userTaxSettings,
      payPeriodStart,
      payPeriodEnd,
      payPeriodString,
      payrollSavingsEntries
    );

    const netPay = bankersRound(grossEarnings - totalDeductions, 2);

    payslipsForPeriod.push({
      id: uuidv4(),
      employeeId: emp.id,
      payPeriod: payPeriodString,
      payDate: payDateString,
      grossEarnings,
      totalDeductions,
      netPay,
      earningsBreakdown,
      deductionsBreakdown,
      // Leave summary is basic here; a more detailed function can be plugged in later
      leaveSummary: { annual: 0, sick: 0, unpaid: 0 },
      ytdGrossEarnings: 0,
      ytdTotalDeductions: 0,
    });
  });

  return { 
    payslips: payslipsForPeriod, 
    updatedLoans: processingLoans, 
    updatedSavingPlans: processingSavingPlans, 
    savingPaymentsToRecord 
  };
};