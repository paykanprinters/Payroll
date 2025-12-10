import { eachDayOfInterval, isWeekend, format, isSameMonth, parseISO, isWithinInterval, differenceInYears, startOfWeek, differenceInCalendarDays, startOfDay, endOfDay } from "date-fns";
import { MockEmployee, Loan, SavingPlan, LeaveEntry, MockPayslip, TimesheetEntry, LoanDeductionHistoryEntry } from "../mock-data-interfaces";
import { PayrollSavingsEntry } from "@/lib/savings-types";
import { TaxTables } from "@/hooks/use-tax-tables";
import { calculatePAYE, calculateWorkingDays } from "@/lib/payroll-calculations";
import { v4 as uuidv4 } from 'uuid';
import { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries";
import { bankersRound } from "@/lib/utils";
import type { WorkHoursSettings } from "@/hooks/use-work-hours-settings";

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const computeWeeklyScheduledHours = (settings?: WorkHoursSettings | null): number => {
  if (!settings) {
    // Fallback Mon–Fri 09:00–17:00 with 60m unpaid lunch -> 35h/week
    return 35;
  }
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
  if (emp.hourlyRate !== undefined && emp.hourlyRate !== null && emp.hourlyRate > 0) return emp.hourlyRate;
  if (emp.salary !== undefined && emp.salary !== null && emp.salary > 0) {
    const weeklyHours = computeWeeklyScheduledHours(settings);
    if (weeklyHours <= 0) return 0;
    if (emp.payFrequency === "Weekly") {
      return emp.salary / weeklyHours;
    } else if (emp.payFrequency === "Bi-Weekly") {
      return emp.salary / (2 * weeklyHours);
    }
    // Monthly default
    const monthlyHours = weeklyHours * 4.3333;
    return emp.salary / monthlyHours;
  }
  return 0;
};

const getWeeklyThreshold = (settings?: WorkHoursSettings | null): number => {
  const t = settings?.overtimeThresholdHours;
  return typeof t === "number" && t > 0 ? t : 41.25;
};

const dayNameToIndex = (name: string): number | null => {
  switch (name.toLowerCase()) {
    case "sunday": return 0;
    case "monday": return 1;
    case "tuesday": return 2;
    case "wednesday": return 3;
    case "thursday": return 4;
    case "friday": return 5;
    case "saturday": return 6;
    default: return null;
  }
};

/**
 * Calculate earnings from timesheets using per-period threshold for overtime.
 * Strictly split total paid hours within the pay period into:
 * - Regular hours up to the threshold (e.g., 41.25 for weekly)
 * - Overtime hours for any balance above the threshold
 * Notes:
 * - Paid hours come from timesheets (totalWorkHours) which already deduct unpaid breaks.
 * - No special-casing for non-scheduled days; all paid hours count toward the threshold.
 */
const calculateEarnings = (
  emp: MockEmployee,
  approvedTimesheetsForPeriod: TimesheetEntry[],
  leaveRecords: LeaveEntry[],
  payPeriodStart: Date,
  payPeriodEnd: Date,
  workHoursSettings?: WorkHoursSettings | null
) => {
  const weeklyThreshold = getWeeklyThreshold(workHoursSettings);
  const hourly = deriveHourlyRate(emp, workHoursSettings);

  // Split hours into normal working-day hours vs weekend premium hours (non-working Sat/Sun)
  const workDaysSet = new Set((workHoursSettings?.workDays || []).map(d => d.toLowerCase()));
  let normalPaidHours = 0;
  let saturdayPremiumHours = 0;
  let sundayPremiumHours = 0;

  approvedTimesheetsForPeriod.forEach(ts => {
    const tsDate = parseISO(ts.date);
    const dayIdx = tsDate.getDay(); // 0=Sun,6=Sat
    const isSatNonWork = dayIdx === 6 && !workDaysSet.has("saturday");
    const isSunNonWork = dayIdx === 0 && !workDaysSet.has("sunday");
    const hours = ts.totalWorkHours || 0;

    if (isSatNonWork) {
      saturdayPremiumHours += hours;
    } else if (isSunNonWork) {
      sundayPremiumHours += hours;
    } else {
      normalPaidHours += hours;
    }
  });

  // Compute per-period overtime threshold based on employee pay frequency, applied ONLY to normal paid hours
  let thresholdForPeriod = weeklyThreshold;
  if (emp.payFrequency === "Bi-Weekly") {
    thresholdForPeriod = weeklyThreshold * 2;
  } else if (emp.payFrequency === "Monthly") {
    const daysInPeriod = differenceInCalendarDays(payPeriodEnd, payPeriodStart) + 1;
    const approxWeeks = Math.max(1, Math.round(daysInPeriod / 7));
    thresholdForPeriod = weeklyThreshold * approxWeeks;
  } // Weekly uses weeklyThreshold directly

  // Split normal hours by the period threshold; weekend premium hours are separate
  const regularHours = Math.min(normalPaidHours, thresholdForPeriod);
  const overtimeHours = Math.max(0, normalPaidHours - thresholdForPeriod);

  // Calculate base pay and overtime pay
  let basicSalary = 0;

  // Hourly employees: pay regular hours from timesheets (regularHours × hourly).
  if (emp.hourlyRate !== undefined && emp.hourlyRate !== null && emp.hourlyRate > 0) {
    basicSalary = regularHours * hourly;
  } else if (emp.salary !== undefined && emp.salary !== null && emp.salary > 0) {
    // Salaried employees:
    // - Monthly: lump sum, minus unpaid leave days
    // - Weekly/Bi-Weekly: full period salary, minus unpaid leave days (pro-rated by working days in that period)
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
      // Pro-rate by actual working days within the pay period
      const workingDaysInPeriod = calculateWorkingDays(payPeriodStart, payPeriodEnd) || 1;
      const dailyRate = (emp.salary as number) / workingDaysInPeriod;
      basicSalary -= dailyRate * unpaidLeaveDaysInPeriod;
    }
  }

  // Overtime paid at 1.5x using derived/effective hourly rate
  let totalOvertimeAmount = 0;
  if (overtimeHours > 0 && hourly > 0) {
    totalOvertimeAmount = overtimeHours * hourly * 1.5;
  }

  const roundedBasic = bankersRound(basicSalary, 2);
  const roundedOvertime = bankersRound(totalOvertimeAmount, 2);

  // Weekend premium overtime amounts (exclude from weekly threshold)
  const saturdayPremiumAmount = bankersRound((hourly > 0 ? saturdayPremiumHours * hourly * 1.5 : 0), 2);
  const sundayPremiumAmount = bankersRound((hourly > 0 ? sundayPremiumHours * hourly * 2.0 : 0), 2);

  // Make hours visible on earnings lines for clarity
  const earningsBreakdown = [{
    name: (emp.hourlyRate !== undefined && emp.hourlyRate !== null && emp.hourlyRate > 0)
      ? `Regular Hours (${regularHours.toFixed(2)}h)`
      : "Basic Salary",
    amount: roundedBasic
  }];
  if (roundedOvertime > 0) {
    earningsBreakdown.push({ name: `Overtime (${overtimeHours.toFixed(2)}h @1.5x)`, amount: roundedOvertime });
  }
  if (saturdayPremiumHours > 0) {
    earningsBreakdown.push({ name: `Weekend Overtime (Sat ${saturdayPremiumHours.toFixed(2)}h @1.5x)`, amount: saturdayPremiumAmount });
  }
  if (sundayPremiumHours > 0) {
    earningsBreakdown.push({ name: `Weekend Overtime (Sun ${sundayPremiumHours.toFixed(2)}h @2.0x)`, amount: sundayPremiumAmount });
  }
  // Mock bonus example remains
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

  // UIF first (employee contribution)
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

  // PAYE on taxable income excluding UIF
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

  // SDL (employer levy shown for compatibility if enabled)
  if (uifSdlRates && applySDLFlag) {
    const sdlRaw = grossEarnings * uifSdlRates.sdl_rate;
    const sdl = bankersRound(sdlRaw, 2);
    deductionsBreakdown.push({ name: "SDL", amount: sdl });
    totalDeductions += sdl;
  } else if (!uifSdlRates && applySDLFlag) {
    const sdl = bankersRound(grossEarnings * 0.01, 2);
    deductionsBreakdown.push({ name: "SDL", amount: sdl });
    totalDeductions += sdl;
  }

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

  // Loans
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

        const entryForPlan = payrollSavingsEntries?.find(e => e.planId === plan.id && e.employeeId === emp.id) || null;
        const isPaused = entryForPlan?.paused === true;
        const baseAmount = entryForPlan ? (entryForPlan.overrideAmount ?? entryForPlan.originalAmount) : plan.amount;

        if (isPaused) {
          return;
        }

        if (plan.frequency === employeePayFrequency?.toLowerCase()) {
          if (isFullPeriod(employeePayFrequency, payPeriodStart, payPeriodEnd)) {
            deductionAmount = baseAmount;
          }
        } else if (employeePayFrequency === "Monthly" && plan.frequency === "weekly") {
          if (isFullPeriod("Monthly", payPeriodStart, payPeriodEnd)) {
            deductionAmount = baseAmount * 4;
          }
        } else if (employeePayFrequency === "Bi-Weekly" && plan.frequency === "weekly") {
          if (isFullPeriod("Bi-Weekly", payPeriodStart, payPeriodEnd)) {
            deductionAmount = baseAmount * 2;
          }
        }

        if (deductionAmount > 0) {
          const roundedSavings = bankersRound(deductionAmount, 2);
          deductionsBreakdown.push({ name: `Savings`, amount: roundedSavings });
          totalDeductions += roundedSavings;
          if (entryForPlan) {
            savingPaymentsToRecord.push({ planId: plan.id, employeeId: emp.id, amount: roundedSavings });
          }
        }
      }
    }
  });

  totalDeductions = bankersRound(totalDeductions, 2);
  return { deductionsBreakdown, totalDeductions, savingPaymentsToRecord };
};

const calculateLeaveSummary = (
  emp: MockEmployee,
  leaveRecords: LeaveEntry[],
  payPeriodStart: Date,
  payPeriodEnd: Date
) => {
  let annualLeaveTaken = 0;
  let sickLeaveTaken = 0;

  const employeeLeave = leaveRecords.filter(rec => rec.employeeId === emp.id);
  employeeLeave.forEach(rec => {
    const leaveStart = new Date(rec.startDate);
    const leaveEnd = new Date(rec.endDate);

    if (isWithinInterval(leaveStart, { start: payPeriodStart, end: payPeriodEnd }) || 
        isWithinInterval(leaveEnd, { start: payPeriodStart, end: payPeriodEnd }) ||
        (leaveStart < payPeriodStart && leaveEnd > payPeriodEnd)) {
      const overlapStart = leaveStart > payPeriodStart ? leaveStart : payPeriodStart;
      const overlapEnd = leaveEnd < payPeriodEnd ? leaveEnd : payPeriodEnd;
      const daysInOverlap = eachDayOfInterval({start: overlapStart, end: overlapEnd}).filter(day => !isWeekend(day)).length;

      if (rec.leaveType === "Annual Leave") annualLeaveTaken += daysInOverlap;
      else if (rec.leaveType === "Sick Leave") sickLeaveTaken += daysInOverlap;
    }
  });

  const mockAnnualLeaveBalance = 20;
  const mockSickLeaveBalance = 10;

  return {
    annual: mockAnnualLeaveBalance - annualLeaveTaken,
    sick: mockSickLeaveBalance - sickLeaveTaken,
    unpaid: 0,
  };
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
  workHoursSettings?: WorkHoursSettings | null
): { payslips: MockPayslip[]; updatedLoans: Loan[]; updatedSavingPlans: SavingPlan[]; savingPaymentsToRecord: { planId: string; employeeId: string; amount: number }[] } => {
  const payslipsForPeriod: MockPayslip[] = [];
  const payPeriodString = `${format(payPeriodStart, "yyyy-MM-dd")} - ${format(payPeriodEnd, "yyyy-MM-dd")}`;
  const payDateString = format(payPeriodEnd, "dd/MM/yyyy");
  const savingPaymentsToRecord: { planId: string; employeeId: string; amount: number }[] = [];

  const processingLoans: Loan[] = JSON.parse(JSON.stringify(initialLoans));
  const processingSavingPlans: SavingPlan[] = JSON.parse(JSON.stringify(initialSavingPlans));

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
      workHoursSettings
    );

    const { deductionsBreakdown, totalDeductions, savingPaymentsToRecord: empSavingPayments } = calculateDeductions(
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

    if (empSavingPayments.length > 0) {
      savingPaymentsToRecord.push(...empSavingPayments);
    }

    const netPay = bankersRound(grossEarnings - totalDeductions, 2);
    const leaveSummary = calculateLeaveSummary(emp, leaveRecords, payPeriodStart, payPeriodEnd);

    payslipsForPeriod.push({
      id: uuidv4(),
      employeeId: emp.id,
      payPeriod: payPeriodString,
      payDate: payDateString,
      grossEarnings: grossEarnings,
      totalDeductions: totalDeductions,
      netPay: netPay,
      earningsBreakdown: earningsBreakdown,
      deductionsBreakdown: deductionsBreakdown,
      leaveSummary: leaveSummary,
      ytdGrossEarnings: 0,
      ytdTotalDeductions: 0,
    });
  });
  return { payslips: payslipsForPeriod, updatedLoans: processingLoans, updatedSavingPlans: processingSavingPlans, savingPaymentsToRecord };
};