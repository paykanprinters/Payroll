import { eachDayOfInterval, isWeekend, format, isSameMonth, isSameYear, parseISO, isWithinInterval, differenceInYears } from "date-fns";
import { MockEmployee, Loan, SavingPlan, LeaveEntry, MockPayslip, TimesheetEntry, LoanDeductionHistoryEntry } from "../mock-data-interfaces";
import { TaxTables } from "@/hooks/use-tax-tables";
import { calculatePAYE, calculateWorkingDays } from "@/lib/payroll-calculations";
import { v4 as uuidv4 } from 'uuid';
import { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries";

/**
 * Calculates earnings for an employee for a given pay period.
 */
const calculateEarnings = (
  emp: MockEmployee,
  approvedTimesheetsForPeriod: TimesheetEntry[],
  leaveRecords: LeaveEntry[],
  payPeriodStart: Date,
  payPeriodEnd: Date
) => {
  let basicSalary = 0;
  let totalOvertimeAmount = 0;
  let unpaidLeaveDaysInPeriod = 0;

  // Aggregate regular and overtime hours from approved timesheets
  let totalApprovedRegularHours = 0;
  let totalApprovedOvertimeHours = 0;
  approvedTimesheetsForPeriod.forEach(ts => {
    totalApprovedRegularHours += (ts.totalWorkHours - ts.overtimeHours);
    totalApprovedOvertimeHours += ts.overtimeHours;
  });

  // Determine basic salary based on hourly rate or fixed salary
  if (emp.hourlyRate !== undefined && emp.hourlyRate !== null && emp.hourlyRate > 0) {
    // For hourly employees, basic salary is based on approved regular hours
    basicSalary = totalApprovedRegularHours * emp.hourlyRate;
  } else if (emp.salary !== undefined && emp.salary !== null && emp.salary > 0) {
    // For salaried employees, use their fixed salary
    basicSalary = emp.salary;
  } else {
    // Fallback if neither valid salary nor hourly rate is defined
    basicSalary = 0;
  }

  // Handle unpaid leave deductions from basic salary
  if (basicSalary > 0) {
    const employeeUnpaidLeave = leaveRecords.filter(rec =>
      rec.employeeId === emp.id &&
      rec.leaveType === "Unpaid Leave" &&
      // Check if leave period overlaps with the pay period
      (isWithinInterval(new Date(rec.startDate), { start: payPeriodStart, end: payPeriodEnd }) ||
      isWithinInterval(new Date(rec.endDate), { start: payPeriodStart, end: payPeriodEnd }) ||
      (new Date(rec.startDate) < payPeriodStart && new Date(rec.endDate) > payPeriodEnd))
    );
    
    employeeUnpaidLeave.forEach(rec => {
      const leaveStart = new Date(rec.startDate);
      const leaveEnd = new Date(rec.endDate);
      // Calculate the overlap interval
      const overlapStart = leaveStart > payPeriodStart ? leaveStart : payPeriodStart;
      const overlapEnd = leaveEnd < payPeriodEnd ? leaveEnd : payPeriodEnd;
      unpaidLeaveDaysInPeriod += calculateWorkingDays(overlapStart, overlapEnd);
    });

    if (unpaidLeaveDaysInPeriod > 0) {
      let dailyRate = 0;
      if (emp.salary && emp.payFrequency === "Monthly" && emp.salary > 0) {
        // For monthly salaried employees, assume 20 working days in a month for daily rate
        dailyRate = emp.salary / 20;
      } else if (emp.hourlyRate && emp.hourlyRate > 0 && emp.standardDailyHours !== undefined && emp.standardDailyHours !== null && emp.standardDailyHours > 0) {
        // For hourly employees, daily rate is hourly rate * standard daily hours
        dailyRate = emp.hourlyRate * emp.standardDailyHours;
      }
      
      if (dailyRate > 0) {
        basicSalary -= dailyRate * unpaidLeaveDaysInPeriod;
      }
    }
  }

  // Calculate overtime amount
  if (totalApprovedOvertimeHours > 0) {
    let effectiveHourlyRate = 0;
    if (emp.hourlyRate !== undefined && emp.hourlyRate !== null && emp.hourlyRate > 0) {
      effectiveHourlyRate = emp.hourlyRate;
    } else if (emp.salary !== undefined && emp.salary !== null && emp.salary > 0 && emp.standardDailyHours !== undefined && emp.standardDailyHours !== null && emp.standardDailyHours > 0) {
      // For salaried employees, derive an effective hourly rate for overtime calculation
      // Assuming 20 working days in a month and standard daily hours
      effectiveHourlyRate = emp.salary / (20 * emp.standardDailyHours);
    }

    if (effectiveHourlyRate > 0) {
      totalOvertimeAmount = totalApprovedOvertimeHours * effectiveHourlyRate * 1.5; // 1.5x for overtime
    }
  }

  const earningsBreakdown = [{ name: "Basic Salary", amount: basicSalary }];
  if (totalOvertimeAmount > 0) {
    earningsBreakdown.push({ name: "Overtime", amount: totalOvertimeAmount });
  }
  // Mock bonus logic, keep as is for now
  if (emp.id === "EMP004" && isSameMonth(payPeriodStart, new Date())) {
    earningsBreakdown.push({ name: "Bonus", amount: 2000 });
  }

  const grossEarnings = earningsBreakdown.reduce((sum, e) => sum + e.amount, 0);
  return { earningsBreakdown, grossEarnings, unpaidLeaveDaysInPeriod };
};

/**
 * Calculates deductions for an employee for a given pay period, including statutory, loans, and savings.
 * This function now takes mutable copies of loans and saving plans and modifies them directly.
 */
const calculateDeductions = (
  emp: MockEmployee,
  grossEarnings: number,
  processingLoans: Loan[], // Now mutable copy
  processingSavingPlans: SavingPlan[], // Now mutable copy
  taxTables: TaxTables,
  userTaxSettings: UserTaxSettings | null, // New parameter for user tax settings
  payPeriodStart: Date,
  payPeriodEnd: Date,
  payPeriodString: string
) => {
  let totalDeductions = 0;
  const deductionsBreakdown: { name: string; amount: number }[] = [];

  const applyPAYEFlag = userTaxSettings?.applyPaye ?? true;
  const applySDLFlag = userTaxSettings?.applySdl ?? true;

  const { payeBrackets, uifSdlRates, taxYearDetails } = taxTables;

  // Calculate employee age for rebates
  let employeeAge: number | null = null;
  if (emp.dateOfBirth) {
    employeeAge = differenceInYears(new Date(), new Date(emp.dateOfBirth));
  }

  // PAYE (Pay As You Earn)
  if (payeBrackets && payeBrackets.length > 0 && applyPAYEFlag && emp.payFrequency) { // Ensure payFrequency is available
    const paye = calculatePAYE(grossEarnings, payeBrackets, taxYearDetails, employeeAge, emp.payFrequency);
    if (paye > 0) {
      deductionsBreakdown.push({ name: "PAYE", amount: paye });
      totalDeductions += paye;
    }
  }

  // UIF (Unemployment Insurance Fund) & SDL (Skills Development Levy)
  if (uifSdlRates) {
    const uif = Math.min(grossEarnings * uifSdlRates.uif_rate, uifSdlRates.uif_cap);
    deductionsBreakdown.push({ name: "UIF", amount: uif });
    totalDeductions += uif;

    if (applySDLFlag) {
      const sdl = grossEarnings * uifSdlRates.sdl_rate;
      deductionsBreakdown.push({ name: "SDL", amount: sdl });
      totalDeductions += sdl;
    }
  } else {
    // Fallback for UIF/SDL if rates are not loaded (should ideally not happen in live mode)
    const uif = Math.min(grossEarnings * 0.01, 177.12); // Mock UIF cap
    deductionsBreakdown.push({ name: "UIF", amount: uif });
    totalDeductions += uif;
    if (applySDLFlag) {
      const sdl = grossEarnings * 0.01;
      deductionsBreakdown.push({ name: "SDL", amount: sdl });
      totalDeductions += sdl;
    }
  }

  // Helper to determine if the current pay period is a "full" period for a given frequency
  const isFullPeriod = (frequency: "Monthly" | "Weekly" | "Bi-Weekly", periodStart: Date, periodEnd: Date): boolean => {
    if (frequency === "Monthly") {
      // A full month period starts on the 1st and ends on the last day of the same month
      return format(periodStart, 'dd') === '01' && isSameMonth(periodStart, periodEnd) && format(periodEnd, 'dd') === format(new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 0), 'dd');
    } else if (frequency === "Weekly") {
      // A full week period is exactly 7 days (difference in days is 6)
      return (payPeriodEnd.getTime() - payPeriodStart.getTime()) / (1000 * 60 * 60 * 24) === 6;
    } else if (frequency === "Bi-Weekly") {
      // A full bi-weekly period is exactly 14 days (difference in days is 13)
      return (payPeriodEnd.getTime() - payPeriodStart.getTime()) / (1000 * 60 * 60 * 24) === 13;
    }
    return false;
  };

  // Process Loan Deductions
  processingLoans.forEach(loan => {
    // Check if loan is for this employee, not completed, and its start date is within or before the pay period end
    if (loan.employeeId === emp.id && loan.status !== "completed" && new Date(loan.startDate) <= payPeriodEnd) {
      // If loan is paused, record the pause and reset status for next period
      if (loan.paused) {
        const pauseEntry: LoanDeductionHistoryEntry = {
          date: format(payPeriodEnd, 'yyyy-MM-dd'),
          amount: 0,
          type: "pause",
          notes: `Deduction paused for pay period ${payPeriodString}`,
        };
        loan.deductionHistory.push(pauseEntry);
        loan.paused = false; // Reset paused status after processing for this period
        return; // Skip deduction for this period
      }

      let deductionAmount = 0;
      const employeePayFrequency = emp.payFrequency; // Use the actual enum type

      if (loan.frequency === employeePayFrequency?.toLowerCase()) { // Compare string to lowercase string
        // Direct match: loan frequency matches employee's pay frequency
        if (isFullPeriod(employeePayFrequency, payPeriodStart, payPeriodEnd)) {
          deductionAmount = loan.repaymentAmount;
        }
      } else if (employeePayFrequency === "Monthly" && loan.frequency === "weekly") {
        // Monthly paid employee with a weekly loan deduction
        if (isFullPeriod("Monthly", payPeriodStart, payPeriodEnd)) {
          deductionAmount = loan.repaymentAmount * 4; // Assume 4 weeks in a month for simplification
        }
      } else if (employeePayFrequency === "Bi-Weekly" && loan.frequency === "weekly") {
        // Bi-weekly paid employee with a weekly loan deduction
        // Assume a bi-weekly payslip covers two weekly deductions
        if (isFullPeriod("Bi-Weekly", payPeriodStart, payPeriodEnd)) { // Check if the current period is a full bi-week
            deductionAmount = loan.repaymentAmount * 2; // Apply two weekly deductions
        }
      }
      // Other frequency mismatches are not handled by this simplified logic, resulting in 0 deduction.

      if (deductionAmount > 0) {
        deductionsBreakdown.push({ name: `Loan Repayment (${loan.id})`, amount: deductionAmount });
        totalDeductions += deductionAmount;
        loan.remainingBalance -= deductionAmount;
        const deductionEntry: LoanDeductionHistoryEntry = {
          date: format(payPeriodEnd, 'yyyy-MM-dd'),
          amount: deductionAmount,
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

  // Process Savings Deductions (similar logic to loans)
  processingSavingPlans.forEach(plan => {
    // Check if saving plan is for this employee, active, and its start date is within or before the pay period end
    if (plan.employeeId === emp.id && plan.status === "active" && new Date(plan.startDate) <= payPeriodEnd) {
      // Check if the plan has an end date and if it's already passed the current pay period start
      if (!plan.endDate || new Date(plan.endDate) >= payPeriodStart) {
        let deductionAmount = 0;
        const employeePayFrequency = emp.payFrequency;

        if (plan.frequency === employeePayFrequency?.toLowerCase()) {
          if (isFullPeriod(employeePayFrequency, payPeriodStart, payPeriodEnd)) {
            deductionAmount = plan.amount;
          }
        } else if (employeePayFrequency === "Monthly" && plan.frequency === "weekly") {
          if (isFullPeriod("Monthly", payPeriodStart, payPeriodEnd)) {
            deductionAmount = plan.amount * 4;
          }
        } else if (employeePayFrequency === "Bi-Weekly" && plan.frequency === "weekly") {
            if (isFullPeriod("Bi-Weekly", payPeriodStart, payPeriodEnd)) {
                deductionAmount = plan.amount * 2;
            }
        }

        if (deductionAmount > 0) {
          deductionsBreakdown.push({ name: `Savings (${plan.id})`, amount: deductionAmount });
          totalDeductions += deductionAmount;
        }
      }
    }
  });
  return { deductionsBreakdown, totalDeductions };
};

/**
 * Calculates leave summary for an employee for a given pay period.
 */
const calculateLeaveSummary = (
  emp: MockEmployee,
  leaveRecords: LeaveEntry[],
  payPeriodStart: Date,
  payPeriodEnd: Date,
  unpaidLeaveDaysInPeriod: number
) => {
  let annualLeaveTaken = 0;
  let sickLeaveTaken = 0;

  const employeeLeave = leaveRecords.filter(rec => rec.employeeId === emp.id);
  employeeLeave.forEach(rec => {
    const leaveStart = new Date(rec.startDate);
    const leaveEnd = new Date(rec.endDate);
    
    // Check if leave record overlaps with the pay period
    if (isWithinInterval(leaveStart, { start: payPeriodStart, end: payPeriodEnd }) || 
        isWithinInterval(leaveEnd, { start: payPeriodStart, end: payPeriodEnd }) ||
        (leaveStart < payPeriodStart && leaveEnd > payPeriodEnd)) {
      
      const overlapStart = leaveStart > payPeriodStart ? leaveStart : payPeriodStart;
      const overlapEnd = leaveEnd < payPeriodEnd ? leaveEnd : payPeriodEnd;
      
      // Count only working days within the overlap
      const daysInOverlap = eachDayOfInterval({start: overlapStart, end: overlapEnd}).filter(day => !isWeekend(day)).length;

      if (rec.leaveType === "Annual Leave") annualLeaveTaken += daysInOverlap;
      else if (rec.leaveType === "Sick Leave") sickLeaveTaken += daysInOverlap;
    }
  });

  // These are mock remaining days. In a real system, these would come from a leave balance system.
  const mockAnnualLeaveBalance = 20;
  const mockSickLeaveBalance = 10;

  return {
    annual: mockAnnualLeaveBalance - annualLeaveTaken,
    sick: mockSickLeaveBalance - sickLeaveTaken,
    unpaid: unpaidLeaveDaysInPeriod,
  };
};

/**
 * Generates payslips for a specific pay period for all employees.
 * Also returns updated loan and saving plan data based on deductions.
 *
 * @param employees All mock employees.
 * @param initialLoans Initial mock loans (immutable input).
 * @param initialSavingPlans Initial mock saving plans (immutable input).
 * @param leaveRecords All mock leave records.
 * @param timesheets All mock timesheet entries.
 * @param payPeriodStart The start date of the target pay period (Date object).
 * @param payPeriodEnd The end date of the target pay period (Date object).
 * @param taxTables The fetched tax tables (PAYE brackets, UIF/SDL rates, taxYearDetails).
 * @param userTaxSettings The user-specific tax settings (apply PAYE/SDL flags).
 * @returns An object containing an array of generated MockPayslips for the period,
 *          and the updated loans and saving plans data.
 */
export const generatePayslipsForPeriod = (
  employees: MockEmployee[],
  initialLoans: Loan[], // Immutable input
  initialSavingPlans: SavingPlan[], // Immutable input
  leaveRecords: LeaveEntry[],
  timesheets: TimesheetEntry[],
  payPeriodStart: Date,
  payPeriodEnd: Date,
  taxTables: TaxTables,
  userTaxSettings: UserTaxSettings | null
): { payslips: MockPayslip[]; updatedLoans: Loan[]; updatedSavingPlans: SavingPlan[] } => {
  const payslipsForPeriod: MockPayslip[] = [];
  const payPeriodString = `${format(payPeriodStart, "yyyy-MM-dd")} - ${format(payPeriodEnd, "yyyy-MM-dd")}`;
  const payDateString = format(payPeriodEnd, "dd/MM/yyyy");

  // Create deep copies of loans and saving plans to modify during this run
  const processingLoans: Loan[] = JSON.parse(JSON.stringify(initialLoans));
  const processingSavingPlans: SavingPlan[] = JSON.parse(JSON.stringify(initialSavingPlans));

  employees.forEach(emp => {
    // Filter timesheets for the current employee and period, including 'Submitted' status
    const approvedTimesheetsForPeriod = timesheets.filter(ts => {
      const isEmployeeMatch = ts.employeeId === emp.id;
      const isApprovedOrLockedOrSubmitted = ts.status === "Approved" || ts.status === "Locked" || ts.status === "Submitted";
      const isWithinPeriod = isWithinInterval(parseISO(ts.date), { start: payPeriodStart, end: payPeriodEnd });
      return isEmployeeMatch && isApprovedOrLockedOrSubmitted && isWithinPeriod;
    });

    const { earningsBreakdown, grossEarnings, unpaidLeaveDaysInPeriod } = calculateEarnings(
      emp,
      approvedTimesheetsForPeriod,
      leaveRecords,
      payPeriodStart,
      payPeriodEnd
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
      payPeriodString
    );

    const netPay = grossEarnings - totalDeductions;

    const leaveSummary = calculateLeaveSummary(
      emp,
      leaveRecords,
      payPeriodStart,
      payPeriodEnd,
      unpaidLeaveDaysInPeriod
    );

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
      ytdGrossEarnings: 0, // YTD will be calculated externally
      ytdTotalDeductions: 0, // YTD will be calculated externally
    });
  });
  return { payslips: payslipsForPeriod, updatedLoans: processingLoans, updatedSavingPlans: processingSavingPlans };
};