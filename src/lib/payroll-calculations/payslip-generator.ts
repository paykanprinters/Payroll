import { eachDayOfInterval, isWeekend, format, isSameMonth, parseISO, isWithinInterval, differenceInYears, differenceInCalendarDays, startOfDay, endOfDay } from "date-fns";
import { MockEmployee, Loan, SavingPlan, LeaveEntry, MockPayslip, TimesheetEntry, LoanDeductionHistoryEntry } from "../mock-data-interfaces";
import { PayrollSavingsEntry } from "@/lib/savings-types";
import { TaxTables } from "@/hooks/use-tax-tables";
import { calculatePAYE, calculateWorkingDays } from "@/lib/payroll-calculations";
import { v4 as uuidv4 } from 'uuid';
import { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries";
import { bankersRound } from "@/lib/utils";
import type { WorkHoursSettings } from "@/hooks/use-work-hours-settings";
import type { PublicHoliday } from "@/hooks/use-public-holidays";

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const computeWeeklyScheduledHours = (settings?: WorkHoursSettings | null): number => {
  if (!settings) return 35;
  const selected = new Set((settings.workDays || []).map(d => d.toLowerCase()));
  const has = (name: string) => selected.has(name.toLowerCase());

  const dailyStart = settings.dailyStartTime || "09:00";
  const dailyEnd = settings.dailyEndTime || "17:00";
  const friStart = settings.fridayStartTime || dailyStart;
  const friEnd = settings.fridayEndTime || dailyEnd;
  const breakMinutes = settings.breakDurationMinutes || 0;
  const isPaid = settings.paidLunch === true;

  const baseMinutes = Math.max(0, timeToMinutes(dailyEnd) - timeToMinutes(dailyStart));
  const friMinutes = Math.max(0, timeToMinutes(friEnd) - timeToMinutes(friStart));
  const subtract = isPaid ? 0 : breakMinutes;

  const baseHours = Math.max(0, (baseMinutes - subtract) / 60);
  const friHours = Math.max(0, (friMinutes - subtract) / 60);

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

const isSameMonthDay = (isoA: string, isoB: string) => {
  const a = parseISO(isoA);
  const b = parseISO(isoB);
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

const dayIsHolidayForEmployee = (dateISO: string, employee: MockEmployee, holidays: PublicHoliday[]): PublicHoliday | null => {
  const d = parseISO(dateISO);
  for (const h of holidays) {
    const match =
      (h.recurring ? isSameMonthDay(h.date, dateISO) : h.date === dateISO);
    if (!match) continue;
    // Departments filter
    if (h.departments && h.departments.length > 0) {
      if (!employee.department || !h.departments.includes(employee.department)) continue;
    }
    return h;
  }
  return null;
};

const scheduledHoursForDay = (dateISO: string, settings?: WorkHoursSettings | null): number => {
  if (!settings) return 0;
  const paidLunch = settings.paidLunch === true;
  const subtract = paidLunch ? 0 : (settings.breakDurationMinutes || 0);
  const d = parseISO(dateISO);
  const isFriday = d.getDay() === 5;
  const start = isFriday && settings.fridayStartTime ? settings.fridayStartTime : (settings.dailyStartTime || "09:00");
  const end = isFriday && settings.fridayEndTime ? settings.fridayEndTime : (settings.dailyEndTime || "17:00");
  const minutes = Math.max(0, timeToMinutes(end) - timeToMinutes(start) - subtract);
  return Math.max(0, minutes / 60);
};

/**
 * Calculate earnings including public holiday rules:
 * - Holiday falling on a selected regular workday:
 *    - If no timesheet: pay scheduled hours at 1.5x (do not count toward regular threshold)
 *    - If worked: pay recorded hours at 2.0x (do not count toward regular threshold)
 * - Non-holiday hours: apply weekly threshold across weekday+weekend hours, then overtime:
 *    - Weekday/Saturday @1.5x; Sunday @2.0x
 */
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
  const hourly = deriveHourlyRate(emp, workHoursSettings);
  const workDaysSet = new Set((workHoursSettings?.workDays || []).map(d => d.toLowerCase()));

  let weekdayPaidHours = 0;
  let saturdayPaidHours = 0;
  let sundayPaidHours = 0;

  let holidayWorkedHours = 0;      // 2.0x
  let holidayNonWorkedHours = 0;   // 1.5x scheduled

  // Group timesheets by date to detect holidays
  const timesheetsByDate: Record<string, TimesheetEntry[]> = {};
  approvedTimesheetsForPeriod.forEach(ts => {
    if (!timesheetsByDate[ts.date]) timesheetsByDate[ts.date] = [];
    timesheetsByDate[ts.date].push(ts);
  });

  // Iterate day by day within pay period to capture non-worked holidays
  const allDays = eachDayOfInterval({ start: payPeriodStart, end: payPeriodEnd });
  allDays.forEach(day => {
    const iso = format(day, "yyyy-MM-dd");
    const holiday = dayIsHolidayForEmployee(iso, emp, holidays);
    if (holiday) {
      // Only consider if holiday falls on selected regular workday
      const dayName = format(day, "EEEE");
      const isSelectedWorkDay = workDaysSet.has(dayName.toLowerCase());
      if (!isSelectedWorkDay) return;
      const entries = timesheetsByDate[iso] || [];
      if (entries.length === 0) {
        // No timesheet → scheduled hours at 1.5x
        const sched = scheduledHoursForDay(iso, workHoursSettings);
        holidayNonWorkedHours += sched;
      } else {
        // Worked hours at 2.0x
        const hours = entries.reduce((s, e) => s + (e.totalWorkHours || 0), 0);
        holidayWorkedHours += hours;
      }
    } else {
      // Non-holiday: later we add weekday/weekend hours from timesheets loop
    }
  });

  // Classify non-holiday timesheet hours
  approvedTimesheetsForPeriod.forEach(ts => {
    const isHoliday = !!dayIsHolidayForEmployee(ts.date, emp, holidays);
    const hours = ts.totalWorkHours || 0;
    if (isHoliday) {
      // already handled in holiday buckets; do not include in threshold pools
      return;
    }
    const date = parseISO(ts.date);
    const dow = date.getDay(); // 0 Sun, 6 Sat
    if (dow === 0) {
      sundayPaidHours += hours;
    } else if (dow === 6) {
      saturdayPaidHours += hours;
    } else {
      weekdayPaidHours += hours;
    }
  });

  // Threshold across non-holiday hours only
  let thresholdForPeriod = weeklyThreshold;
  if (emp.payFrequency === "Bi-Weekly") {
    thresholdForPeriod = weeklyThreshold * 2;
  } else if (emp.payFrequency === "Monthly") {
    const daysInPeriod = differenceInCalendarDays(payPeriodEnd, payPeriodStart) + 1;
    const approxWeeks = Math.max(1, Math.round(daysInPeriod / 7));
    thresholdForPeriod = weeklyThreshold * approxWeeks;
  }

  const totalNonHolidayHours = weekdayPaidHours + saturdayPaidHours + sundayPaidHours;
  const regularHours = Math.min(totalNonHolidayHours, thresholdForPeriod);
  let remainingOT = Math.max(0, totalNonHolidayHours - thresholdForPeriod);

  // Allocate OT: Sunday → Saturday → Weekday
  const overtimeSundayHours = Math.min(sundayPaidHours, remainingOT); remainingOT -= overtimeSundayHours;
  const overtimeSaturdayHours = Math.min(saturdayPaidHours, remainingOT); remainingOT -= overtimeSaturdayHours;
  const overtimeWeekdayHours = Math.min(weekdayPaidHours, remainingOT); remainingOT -= overtimeWeekdayHours;

  // Base pay: regular non-holiday hours for hourly staff, or salary with unpaid leave pro-rate
  let basicSalary = 0;
  if (emp.hourlyRate && emp.hourlyRate > 0) {
    basicSalary = regularHours * hourly;
  } else if (emp.salary && emp.salary > 0) {
    basicSalary = emp.salary;
    let unpaidLeaveDaysInPeriod = 0;
    const employeeUnpaidLeave = leaveRecords.filter(rec =>
      rec.employeeId === emp.id &&
      rec.leaveType === "Unpaid Leave" &&
      (
        isWithinInterval(new Date(rec.startDate), { start: payPeriodStart, end: payPeriodEnd }) ||
        isWithinInterval(new Date(rec.endDate), { start: payPeriodStart, end: payPeriodEnd }) ||
        (new Date(rec.startDate) < payPeriodStart && new Date(rec.endDate) > payPeriodEnd)
      )
    );
    employeeUnpaidLeave.forEach(rec => {
      const leaveStart = new Date(rec.startDate);
      const leaveEnd = new Date(rec.endDate);
      const overlapStart = leaveStart > payPeriodStart ? leaveStart : payPeriodStart;
      const overlapEnd = leaveEnd < payPeriodEnd ? leaveEnd : payPeriodEnd;
      unpaidLeaveDaysInPeriod += calculateWorkingDays(overlapStart, overlapEnd);
    });
    if (unpaidLeaveDaysInPeriod > 0) {
      const workingDaysInPeriod = calculateWorkingDays(payPeriodStart, payPeriodEnd) || 1;
      const dailyRate = (emp.salary as number) / workingDaysInPeriod;
      basicSalary -= dailyRate * unpaidLeaveDaysInPeriod;
    }
  }

  // Overtime amounts
  const weekdayOvertimeAmount = bankersRound((hourly > 0 ? overtimeWeekdayHours * hourly * 1.5 : 0), 2);
  const saturdayOvertimeAmount = bankersRound((hourly > 0 ? overtimeSaturdayHours * hourly * 1.5 : 0), 2);
  const sundayOvertimeAmount = bankersRound((hourly > 0 ? overtimeSundayHours * hourly * 2.0 : 0), 2);

  // Holiday amounts
  const holidayNonWorkedAmount = bankersRound((hourly > 0 ? holidayNonWorkedHours * hourly * 1.5 : 0), 2);
  const holidayWorkedAmount = bankersRound((hourly > 0 ? holidayWorkedHours * hourly * 2.0 : 0), 2);

  const roundedBasic = bankersRound(basicSalary, 2);

  const earningsBreakdown: { name: string; amount: number }[] = [{
    name: (emp.hourlyRate && emp.hourlyRate > 0) ? `Regular Hours (${regularHours.toFixed(2)}h)` : "Basic Salary",
    amount: roundedBasic
  }];

  if (weekdayOvertimeAmount > 0) earningsBreakdown.push({ name: `Overtime (Weekday ${overtimeWeekdayHours.toFixed(2)}h @1.5x)`, amount: weekdayOvertimeAmount });
  if (saturdayOvertimeAmount > 0) earningsBreakdown.push({ name: `Weekend Overtime (Sat ${overtimeSaturdayHours.toFixed(2)}h @1.5x)`, amount: saturdayOvertimeAmount });
  if (sundayOvertimeAmount > 0) earningsBreakdown.push({ name: `Weekend Overtime (Sun ${overtimeSundayHours.toFixed(2)}h @2.0x)`, amount: sundayOvertimeAmount });

  if (holidayNonWorkedAmount > 0) earningsBreakdown.push({ name: `Public Holiday (no timesheet ${holidayNonWorkedHours.toFixed(2)}h @1.5x)`, amount: holidayNonWorkedAmount });
  if (holidayWorkedAmount > 0) earningsBreakdown.push({ name: `Public Holiday (worked ${holidayWorkedHours.toFixed(2)}h @2.0x)`, amount: holidayWorkedAmount });

  // Mock bonus unchanged
  if (emp.id === "EMP004" && isSameMonth(payPeriodStart, new Date())) {
    earningsBreakdown.push({ name: "Bonus", amount: bankersRound(2000, 2) });
  }

  const grossEarnings = bankersRound(earningsBreakdown.reduce((sum, e) => sum + e.amount, 0), 2);
  return { earningsBreakdown, grossEarnings };
};

const calculateDeductions = (
  emp: MockEmployee,
  grossEarnings: number,
  processingLoans: Loan[],
  processingSavingPlans: SavingPlan[],
  taxTables: TaxTables,
  userTaxSettings: UserTaxSettings | null,
  payPeriodStart: Date,
  payPeriodEnd: Date,
  payPeriodString: string,
  payrollSavingsEntries: PayrollSavingsEntry[] | null
) => {
  let totalDeductions = 0;
  const deductionsBreakdown: { name: string; amount: number }[] = [];
  const savingPaymentsToRecord: { planId: string; employeeId: string; amount: number }[] = [];

  const applyPAYEFlag = userTaxSettings?.applyPaye ?? true;
  const applySDLFlag = userTaxSettings?.applySdl ?? true;

  const { payeBrackets, uifSdlRates, taxYearDetails } = taxTables;

  let employeeAge: number | null = null;
  if (emp.dateOfBirth) {
    employeeAge = differenceInYears(new Date(), new Date(emp.dateOfBirth));
  }

  // UIF first
  let uif = 0;
  if (uifSdlRates) {
    const monthlyCap = uifSdlRates.uif_cap;
    const uifRate = uifSdlRates.uif_rate;

    const getCapForFrequency = (freq: MockEmployee["payFrequency"] | undefined, monthlyCapValue: number) => {
      if (!freq) return monthlyCapValue;
      if (freq === "Weekly") return monthlyCapValue / 4.3333;
      if (freq === "Bi-Weekly") return monthlyCapValue / 2.1667;
      return monthlyCapValue;
    };

    const shouldProRate = userTaxSettings?.proRateUifCapByFrequency === true;
    const capToUse = shouldProRate ? getCapForFrequency(emp.payFrequency, monthlyCap) : monthlyCap;

    const uifRaw = Math.min(grossEarnings * uifRate, capToUse);
    uif = bankersRound(uifRaw, 2);
  } else {
    uif = bankersRound(Math.min(grossEarnings * 0.01, 177.12), 2);
  }

  const taxableIncomeForPAYE = Math.max(0, grossEarnings - uif);
  if (payeBrackets && payeBrackets.length > 0 && applyPAYEFlag && emp.payFrequency) {
    const paye = calculatePAYE(
      taxableIncomeForPAYE,
      payeBrackets,
      taxYearDetails,
      employeeAge,
      emp.payFrequency
    );
    if (paye > 0) {
      const roundedPAYE = bankersRound(paye, 2);
      deductionsBreakdown.push({ name: "PAYE", amount: roundedPAYE });
      totalDeductions += roundedPAYE;
    }
  }

  deductionsBreakdown.push({ name: "UIF", amount: uif });
  totalDeductions += uif;

  if (uifSdlRates && applySDLFlag) {
    const sdlRaw = taxableIncomeForPAYE * uifSdlRates.sdl_rate + uif; // conservative; keep prior behavior if needed
    const sdl = bankersRound(sdlRaw, 2);
    deductionsBreakdown.push({ name: "SDL", amount: sdl });
    totalDeductions += sdl;
  } else if (!uifSdlRates && applySDLFlag) {
    const sdl = bankersRound(grossEarnings * 0.01, 2);
    deductionsBreakdown.push({ name: "SDL", amount: sdl });
    totalDeductions += sdl;
  }

  // Loans
  const isFullPeriod = (frequency: "Monthly" | "Weekly" | "Bi-Weekly", start: Date, end: Date): boolean => {
    if (frequency === "Monthly") {
      return format(start, 'dd') === '01' && format(end, 'dd') === format(new Date(end.getFullYear(), end.getMonth() + 1, 0), 'dd');
    } else if (frequency === "Weekly") {
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) === 6;
    } else if (frequency === "Bi-Weekly") {
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) === 13;
    }
    return false;
  };

  processingLoans.forEach(loan => {
    if (loan.employeeId === emp.id && loan.status !== "completed" && new Date(loan.startDate) <= payPeriodEnd) {
      if (loan.paused) {
        const pauseEntry: LoanDeductionHistoryEntry = {
          date: format(payPeriodEnd, 'yyyy-MM-dd'),
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
        if (isFullPeriod(employeePayFrequency, payPeriodStart, payPeriodEnd)) {
          deductionAmount = loan.repaymentAmount;
        }
      } else if (employeePayFrequency === "Monthly" && loan.frequency === "weekly") {
        if (isFullPeriod("Monthly", payPeriodStart, payPeriodEnd)) {
          deductionAmount = loan.repaymentAmount * 4;
        }
      } else if (employeePayFrequency === "Bi-Weekly" && loan.frequency === "weekly") {
        if (isFullPeriod("Bi-Weekly", payPeriodStart, payPeriodEnd)) {
          deductionAmount = loan.repaymentAmount * 2;
        }
      }

      if (deductionAmount > 0) {
        const roundedLoanDeduction = bankersRound(deductionAmount, 2);
        deductionsBreakdown.push({ name: `Loan Repayment`, amount: roundedLoanDeduction });
        totalDeductions += roundedLoanDeduction;
        loan.remainingBalance -= roundedLoanDeduction;
        const deductionEntry: LoanDeductionHistoryEntry = {
          date: format(payPeriodEnd, 'yyyy-MM-dd'),
          amount: roundedLoanDeduction,
          type: "deduction",
          notes: `Payroll deduction for pay period ${payPeriodString}`,
        };
        loan.deductionHistory.push(deductionEntry);
        if (loan.remainingBalance <= 0) {
          loan.status = "completed";
          loan.remainingBalance = 0;
        }
      }
    }
  });

  // Savings
  processingSavingPlans.forEach(plan => {
    if (plan.employeeId === emp.id && plan.status === "active" && new Date(plan.startDate) <= payPeriodEnd) {
      if (!plan.endDate || new Date(plan.endDate) >= payPeriodStart) {
        let deductionAmount = 0;
        const employeePayFrequency = emp.payFrequency;

        const entryForPlan = null; // entries handled elsewhere
        const isPaused = false;
        const baseAmount = plan.amount;

        if (isPaused) return;

        if (plan.frequency === employeePayFrequency?.toLowerCase()) {
          if (isFullPeriod(employeePayFrequency, payPeriodStart, payPeriodEnd)) deductionAmount = baseAmount;
        } else if (employeePayFrequency === "Monthly" && plan.frequency === "weekly") {
          if (isFullPeriod("Monthly", payPeriodStart, payPeriodEnd)) deductionAmount = baseAmount * 4;
        } else if (employeePayFrequency === "Bi-Weekly" && plan.frequency === "weekly") {
          if (isFullPeriod("Bi-Weekly", payPeriodStart, payPeriodEnd)) deductionAmount = baseAmount * 2;
        }

        if (deductionAmount > 0) {
          const roundedSavings = bankersRound(deductionAmount, 2);
          deductionsBreakdown.push({ name: `Savings`, amount: roundedSavings });
          totalDeductions += roundedSavings;
        }
      }
    }
  });

  totalDeductions = bankersRound(totalDeductions, 2);
  return { deductionsBreakdown, totalDeductions, savingPaymentsToRecord: [] };
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
): { payslips: MockPayslip[]; updatedLoans: Loan[]; updatedSavingPlans: SavingPlan[]; savingPaymentsToRecord: { planId: string; employeeId: string; amount: number }[] } => {
  const payslipsForPeriod: MockPayslip[] = [];
  const payPeriodString = `${format(payPeriodStart, "yyyy-MM-dd")} - ${format(payPeriodEnd, "yyyy-MM-dd")}`;
  const payDateString = format(payPeriodEnd, "dd/MM/yyyy");

  const processingLoans: Loan[] = JSON.parse(JSON.stringify(initialLoans));
  const processingSavingPlans: SavingPlan[] = JSON.parse(JSON.stringify(initialSavingPlans));
  const savingPaymentsToRecord: { planId: string; employeeId: string; amount: number }[] = [];

  employees.forEach(emp => {
    const approvedTimesheetsForPeriod = timesheets.filter(ts => {
      const isEmployeeMatch = ts.employeeId === emp.id;
      const isApprovedOrLockedOrSubmitted = ts.status === "Approved" || ts.status === "Locked" || ts.status === "Submitted";
      const tsDate = parseISO(ts.date);
      const isWithin = isWithinInterval(tsDate, { start: startOfDay(payPeriodStart), end: endOfDay(payPeriodEnd) });
      return isEmployeeMatch && isApprovedOrLockedOrSubmitted && isWithin;
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

    const { deductionsBreakdown, totalDeductions } = calculateDeductions(
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
      leaveSummary: { annual: 0, sick: 0, unpaid: 0 },
      ytdGrossEarnings: 0,
      ytdTotalDeductions: 0,
    });
  });

  return { payslips: payslipsForPeriod, updatedLoans: processingLoans, updatedSavingPlans: processingSavingPlans, savingPaymentsToRecord };
};