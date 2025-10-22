import { eachDayOfInterval, isWeekend, format, isSameMonth, isSameYear, parseISO, isWithinInterval } from "date-fns";
import { MockEmployee, Loan, SavingPlan, LeaveEntry, MockPayslip, TimesheetEntry, LoanDeductionHistoryEntry } from "../mock-data-interfaces";
import { TaxTables } from "@/hooks/use-tax-tables"; // Import TaxTables interface
import { calculatePAYE, calculateWorkingDays } from "@/lib/payroll-calculations"; // Import from new utility
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating unique IDs

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

  const totalApprovedRegularHours = approvedTimesheetsForPeriod.reduce((sum, ts) => sum + (ts.totalWorkHours - ts.overtimeHours), 0);
  const totalApprovedOvertimeHours = approvedTimesheetsForPeriod.reduce((sum, ts) => sum + ts.overtimeHours, 0);

  console.log(`[calculateEarnings] Employee: ${emp.firstName} ${emp.lastName} (${emp.id})`);
  console.log(`[calculateEarnings] Pay Period: ${format(payPeriodStart, 'yyyy-MM-dd')} to ${format(payPeriodEnd, 'yyyy-MM-dd')}`);
  console.log(`[calculateEarnings] Total Approved Regular Hours: ${totalApprovedRegularHours}`);
  console.log(`[calculateEarnings] Total Approved Overtime Hours: ${totalApprovedOvertimeHours}`);
  console.log(`[calculateEarnings] Employee Hourly Rate: ${emp.hourlyRate}`);
  console.log(`[calculateEarnings] Employee Salary: ${emp.salary}`);
  console.log(`[calculateEarnings] Employee Employment Type: ${emp.employmentType}`);

  // Determine basic salary based on hourly rate or fixed salary
  if (emp.hourlyRate !== undefined && emp.hourlyRate !== null) {
    // If hourly rate is defined, use it for basic salary calculation
    basicSalary = totalApprovedRegularHours * emp.hourlyRate;
    console.log(`[calculateEarnings] Hourly employee basicSalary calculated: ${basicSalary} (Hours: ${totalApprovedRegularHours} * Rate: ${emp.hourlyRate})`);
  } else if (emp.salary !== undefined && emp.salary !== null) {
    // If salary is defined, use it
    basicSalary = emp.salary;
    console.log(`[calculateEarnings] Salaried employee basicSalary: ${basicSalary}`);
  } else {
    // Fallback if neither salary nor hourly rate is explicitly defined (should ideally not happen with validation)
    console.warn(`[calculateEarnings] Employee ${emp.firstName} ${emp.lastName} has neither salary nor hourly rate defined. Basic salary set to 0.`);
    basicSalary = 0;
  }

  // Handle unpaid leave deductions from basic salary
  if (basicSalary > 0) {
    const employeeUnpaidLeave = leaveRecords.filter(rec =>
      rec.employeeId === emp.id &&
      rec.leaveType === "Unpaid Leave" &&
      isWithinInterval(new Date(rec.startDate), { start: payPeriodStart, end: payPeriodEnd })
    );
    employeeUnpaidLeave.forEach(rec => {
      const leaveStart = new Date(rec.startDate);
      const leaveEnd = new Date(rec.endDate);
      const overlapStart = leaveStart > payPeriodStart ? leaveStart : payPeriodStart;
      const overlapEnd = leaveEnd < payPeriodEnd ? leaveEnd : payPeriodEnd;
      unpaidLeaveDaysInPeriod += calculateWorkingDays(overlapStart, overlapEnd);
    });

    if (unpaidLeaveDaysInPeriod > 0) {
      // Assuming 20 working days in a month for daily rate calculation from monthly salary
      // Or if hourly, calculate based on standard daily hours
      let dailyRate = 0;
      if (emp.salary) {
        dailyRate = emp.salary / 20; // Assuming 20 working days in a month
      } else if (emp.hourlyRate && emp.standardDailyHours) {
        dailyRate = emp.hourlyRate * emp.standardDailyHours;
      }
      
      if (dailyRate > 0) {
        basicSalary -= dailyRate * unpaidLeaveDaysInPeriod;
        console.log(`[calculateEarnings] Deducted ${unpaidLeaveDaysInPeriod} unpaid leave days. New basicSalary: ${basicSalary}`);
      }
    }
  }


  // Calculate overtime amount
  if (totalApprovedOvertimeHours > 0) {
    const effectiveHourlyRate = emp.hourlyRate || (emp.salary ? (emp.salary / (20 * (emp.standardDailyHours || 8))) : 0);
    if (effectiveHourlyRate > 0) {
      totalOvertimeAmount = totalApprovedOvertimeHours * effectiveHourlyRate * 1.5; // 1.5x for overtime
      console.log(`[calculateEarnings] Overtime amount calculated: ${totalOvertimeHours} hours * R ${effectiveHourlyRate.toFixed(2)}/hr * 1.5 = R ${totalOvertimeAmount.toFixed(2)}`);
    } else {
      console.log(`[calculateEarnings] No effective hourly rate for overtime calculation.`);
    }
  } else {
    console.log(`[calculateEarnings] No overtime calculated. Total overtime hours: ${totalApprovedOvertimeHours}`);
  }

  const earningsBreakdown = [{ name: "Basic Salary", amount: basicSalary }];
  if (totalOvertimeAmount > 0) {
    earningsBreakdown.push({ name: "Overtime", amount: totalOvertimeAmount });
  }
  if (emp.id === "EMP004" && isSameMonth(payPeriodStart, new Date())) {
    earningsBreakdown.push({ name: "Bonus", amount: 2000 });
  }

  const grossEarnings = earningsBreakdown.reduce((sum, e) => sum + e.amount, 0);
  console.log(`[calculateEarnings] Final Gross Earnings: ${grossEarnings}`);
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
  payPeriodStart: Date,
  payPeriodEnd: Date,
  payPeriodString: string
) => {
  let totalDeductions = 0;
  const deductionsBreakdown: { name: string; amount: number }[] = [];

  const applyPAYEFlag = localStorage.getItem('applyPAYE') === 'true';
  const applySDLFlag = localStorage.getItem('applySDL') === 'true';

  const { payeBrackets, uifSdlRates } = taxTables;

  if (payeBrackets.length > 0 && applyPAYEFlag) {
    const paye = calculatePAYE(grossEarnings, payeBrackets);
    deductionsBreakdown.push({ name: "PAYE", amount: paye });
    totalDeductions += paye;
  }

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
    console.warn("UIF/SDL rates not loaded, using mock values for payslip generation.");
    const uif = Math.min(grossEarnings * 0.01, 177.12);
    deductionsBreakdown.push({ name: "UIF", amount: uif });
    totalDeductions += uif;
    if (applySDLFlag) {
      const sdl = grossEarnings * 0.01;
      deductionsBreakdown.push({ name: "SDL", amount: sdl });
      totalDeductions += sdl;
    }
  }

  const providentFundRate = 0.075;
  const providentFund = grossEarnings * providentFundRate;
  deductionsBreakdown.push({ name: "Provident Fund", amount: providentFund });
  totalDeductions += providentFund;

  if (emp.id === "EMP002" && payPeriodStart.getMonth() % 3 === 0) {
    deductionsBreakdown.push({ name: "Medical Aid", amount: 1200 });
    totalDeductions += 1200;
  }
  if (emp.id === "EMP005" && payPeriodStart.getMonth() % 4 === 1) {
    deductionsBreakdown.push({ name: "Retirement Fund", amount: 800 });
    totalDeductions += 800;
  }

  // Process Loan Deductions
  processingLoans.forEach(loan => { // Use processingLoans
    if (loan.employeeId === emp.id && loan.status !== "completed" && new Date(loan.startDate) <= payPeriodEnd) {
      if (loan.paused) {
        const pauseEntry: LoanDeductionHistoryEntry = {
          date: format(payPeriodEnd, 'yyyy-MM-dd'),
          amount: 0,
          type: "pause",
          notes: `Deduction paused for pay period ${payPeriodString}`,
        };
        loan.deductionHistory.push(pauseEntry);
        loan.paused = false; // Reset paused status after processing
        return;
      }

      let deductionAmount = 0;
      if (loan.frequency === "monthly" && emp.payFrequency === "Monthly") {
        const isFullMonthPeriod = format(payPeriodStart, 'dd') === '01' && isSameMonth(payPeriodStart, payPeriodEnd);
        if (isFullMonthPeriod) {
          deductionAmount = loan.repaymentAmount;
        }
      } else if (loan.frequency === "weekly" && (emp.payFrequency === "Weekly" || emp.payFrequency === "Bi-Weekly")) {
        const isMonthlyPayslipPeriod = format(payPeriodStart, 'dd') === '01' && isSameMonth(payPeriodStart, payPeriodEnd);
        if (isMonthlyPayslipPeriod) {
          deductionAmount = loan.repaymentAmount * 4;
        } else {
            // Check if the period is a full week (7 days inclusive, so 6 difference)
            const isFullWeekPeriod = (payPeriodEnd.getTime() - payPeriodStart.getTime()) / (1000 * 60 * 60 * 24) === 6;
            if (isFullWeekPeriod) {
                deductionAmount = loan.repaymentAmount;
            }
        }
      }

      if (deductionAmount > 0) {
        deductionAmount = Math.min(deductionAmount, loan.remainingBalance);
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

  // Process Savings Deductions
  processingSavingPlans.forEach(plan => { // Use processingSavingPlans
    if (plan.employeeId === emp.id && plan.status === "active" && new Date(plan.startDate) <= payPeriodEnd) {
      if (!plan.endDate || new Date(plan.endDate) >= payPeriodStart) {
        let deductionAmount = 0;
        if (plan.frequency === "monthly" && emp.payFrequency === "Monthly") {
          const isFullMonthPeriod = format(payPeriodStart, 'dd') === '01' && isSameMonth(payPeriodStart, payPeriodEnd);
          if (isFullMonthPeriod) {
            deductionAmount = plan.amount;
          }
        } else if (plan.frequency === "weekly" && (emp.payFrequency === "Weekly" || emp.payFrequency === "Bi-Weekly")) {
          const isMonthlyPayslipPeriod = format(payPeriodStart, 'dd') === '01' && isSameMonth(payPeriodStart, payPeriodEnd);
          if (isMonthlyPayslipPeriod) {
            deductionAmount = plan.amount * 4;
          } else {
            const isFullWeekPeriod = (payPeriodEnd.getTime() - payPeriodStart.getTime()) / (1000 * 60 * 60 * 24) === 6;
            if (isFullWeekPeriod) {
              deductionAmount = plan.amount;
            }
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
    
    if (isWithinInterval(leaveStart, { start: payPeriodStart, end: payPeriodEnd }) || isWithinInterval(leaveEnd, { start: payPeriodStart, end: payPeriodEnd })) {
      const overlapStart = leaveStart > payPeriodStart ? leaveStart : payPeriodStart;
      const overlapEnd = leaveEnd < payPeriodEnd ? leaveEnd : payPeriodEnd;
      const daysInPeriod = calculateWorkingDays(overlapStart, overlapEnd);

      if (rec.leaveType === "Annual Leave") annualLeaveTaken += eachDayOfInterval({start: overlapStart, end: overlapEnd}).filter(day => !isWeekend(day)).length;
      else if (rec.leaveType === "Sick Leave") sickLeaveTaken += eachDayOfInterval({start: overlapStart, end: overlapEnd}).filter(day => !isWeekend(day)).length;
    }
  });

  return {
    annual: 20 - annualLeaveTaken,
    sick: 10 - sickLeaveTaken,
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
 * @param taxTables The fetched tax tables (PAYE brackets, UIF/SDL rates).
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
  taxTables: TaxTables // New parameter for tax tables
): { payslips: MockPayslip[]; updatedLoans: Loan[]; updatedSavingPlans: SavingPlan[] } => {
  console.log(`[generatePayslipsForPeriod] START for period: ${format(payPeriodStart, 'yyyy-MM-dd')} to ${format(payPeriodEnd, 'yyyy-MM-dd')}`);
  console.log(`[generatePayslipsForPeriod] Number of employees: ${employees.length}`);

  const payslipsForPeriod: MockPayslip[] = [];
  const payPeriodString = `${format(payPeriodStart, "yyyy-MM-dd")} - ${format(payPeriodEnd, "yyyy-MM-dd")}`;
  const monthString = format(payPeriodStart, "yyyy-MM");
  const payDateString = format(payPeriodEnd, "dd/MM/yyyy");

  // Create deep copies of loans and saving plans to modify during this run
  const processingLoans: Loan[] = JSON.parse(JSON.stringify(initialLoans));
  const processingSavingPlans: SavingPlan[] = JSON.parse(JSON.stringify(initialSavingPlans));

  employees.forEach(emp => {
    console.log(`[generatePayslipsForPeriod] Processing employee: ${emp.firstName} ${emp.lastName} (ID: ${emp.id}, Custom ID: ${emp.customEmployeeId})`);
    const approvedTimesheetsForPeriod = timesheets.filter(ts =>
      ts.employeeId === emp.id &&
      ts.status === "Approved" &&
      isWithinInterval(parseISO(ts.date), { start: payPeriodStart, end: payPeriodEnd })
    );
    console.log(`[generatePayslipsForPeriod] Employee: ${emp.firstName} ${emp.lastName} (${emp.id}) - Found ${approvedTimesheetsForPeriod.length} approved timesheets for period.`);

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
      processingLoans, // Pass mutable copy
      processingSavingPlans, // Pass mutable copy
      taxTables,
      payPeriodStart,
      payPeriodEnd,
      payPeriodString
    );

    const leaveSummary = calculateLeaveSummary(
      emp,
      leaveRecords,
      payPeriodStart,
      payPeriodEnd,
      unpaidLeaveDaysInPeriod
    );

    const netPay = grossEarnings - totalDeductions;

    payslipsForPeriod.push({
      id: uuidv4(), // Use uuidv4 for generating a valid UUID
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
  console.log(`[generatePayslipsForPeriod] END for period: ${format(payPeriodStart, 'yyyy-MM-dd')} to ${format(payPeriodEnd, 'yyyy-MM-dd')}`);
  return { payslips: payslipsForPeriod, updatedLoans: processingLoans, updatedSavingPlans: processingSavingPlans };
};

/**
 * Generates mock payslips for all employees for all months up to the current month of the current year.
 * This function is used for initial mock data setup.
 *
 * @param employees All mock employees.
 * @param initialLoans Initial mock loans.
 * @param initialSavingPlans Initial mock saving plans.
 * @param leaveRecords All mock leave records.
 * @param timesheets All mock timesheet entries.
 * @param taxTables The fetched tax tables (PAYE brackets, UIF/SDL rates).
 * @returns An array of all generated MockPayslips.
 */
export const generateMockPayslips = (
  employees: MockEmployee[],
  initialLoans: Loan[],
  initialSavingPlans: SavingPlan[],
  leaveRecords: LeaveEntry[],
  timesheets: TimesheetEntry[],
  taxTables: TaxTables // New parameter for tax tables
): MockPayslip[] => {
  const allPayslips: MockPayslip[] = [];
  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth();

  // Create deep copies for the entire mock generation process
  const processingLoansForMock: Loan[] = JSON.parse(JSON.stringify(initialLoans));
  const processingSavingPlansForMock: SavingPlan[] = JSON.parse(JSON.stringify(initialSavingPlans));

  employees.forEach(emp => {
    let ytdGrossEarnings = 0;
    let ytdTotalDeductions = 0;

    for (let month = 0; month <= currentMonthIndex; month++) {
      const monthDate = new Date(currentYear, month, 1);
      const payPeriodStart = monthDate;
      const payPeriodEnd = new Date(currentYear, month + 1, 0);

      const { payslips: monthlyPayslips } = generatePayslipsForPeriod( // Destructure payslips
        [emp],
        processingLoansForMock, // Pass mutable copy
        processingSavingPlansForMock, // Pass mutable copy
        leaveRecords,
        timesheets,
        payPeriodStart,
        payPeriodEnd,
        taxTables
      );

      if (monthlyPayslips.length > 0) {
        const payslip = monthlyPayslips[0];
        ytdGrossEarnings += payslip.grossEarnings;
        ytdTotalDeductions += payslip.totalDeductions;

        allPayslips.push({
          ...payslip,
          ytdGrossEarnings: ytdGrossEarnings,
          ytdTotalDeductions: ytdTotalDeductions,
        });
      }
    }
  });
  return allPayslips;
};