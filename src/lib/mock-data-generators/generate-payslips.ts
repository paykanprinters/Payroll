import { eachDayOfInterval, isWeekend, format, isSameMonth, isSameYear, parseISO, isWithinInterval } from "date-fns";
import { MockEmployee, Loan, SavingPlan, LeaveEntry, MockPayslip, TimesheetEntry, LoanDeductionHistoryEntry } from "../mock-data-interfaces";

// Helper to calculate working days (excluding weekends) - kept here as it's specific to payslip generation logic
const calculateWorkingDays = (start: Date, end: Date): number => {
  let count = 0;
  const days = eachDayOfInterval({ start, end });
  for (const day of days) {
    if (!isWeekend(day)) {
      count++;
    }
  }
  return count;
};

/**
 * Generates payslips for a specific pay period for all employees.
 * Also updates loan and saving plan balances based on deductions.
 *
 * @param employees All mock employees.
 * @param currentLoans Current state of mock loans (will be modified).
 * @param currentSavingPlans Current state of mock saving plans (will be modified).
 * @param leaveRecords All mock leave records.
 * @param timesheets All mock timesheet entries.
 * @param payPeriodStart The start date of the target pay period (Date object).
 * @param payPeriodEnd The end date of the target pay period (Date object).
 * @returns An array of generated MockPayslips for the period.
 */
export const generatePayslipsForPeriod = (
  employees: MockEmployee[],
  currentLoans: Loan[], // Passed by reference, will be modified
  currentSavingPlans: SavingPlan[], // Passed by reference, will be modified
  leaveRecords: LeaveEntry[],
  timesheets: TimesheetEntry[],
  payPeriodStart: Date,
  payPeriodEnd: Date,
): MockPayslip[] => {
  const payslipsForPeriod: MockPayslip[] = [];
  const payPeriodString = `${format(payPeriodStart, "yyyy-MM-dd")} - ${format(payPeriodEnd, "yyyy-MM-dd")}`;
  const monthString = format(payPeriodStart, "yyyy-MM");
  const payDateString = format(payPeriodEnd, "dd/MM/yyyy"); // Pay date is the end of the period

  employees.forEach(emp => {
    let basicSalary = 0;
    let totalOvertimeAmount = 0;
    let unpaidLeaveDaysInPeriod = 0;

    // Filter approved timesheets for the current employee and pay period
    const approvedTimesheetsForPeriod = timesheets.filter(ts =>
      ts.employeeId === emp.id &&
      ts.status === "Approved" &&
      isWithinInterval(parseISO(ts.date), { start: payPeriodStart, end: payPeriodEnd })
    );

    // Calculate total regular hours and overtime hours from approved timesheets
    const totalApprovedRegularHours = approvedTimesheetsForPeriod.reduce((sum, ts) => sum + (ts.totalWorkHours - ts.overtimeHours), 0);
    const totalApprovedOvertimeHours = approvedTimesheetsForPeriod.reduce((sum, ts) => sum + ts.overtimeHours, 0);

    // Determine basic salary based on employment type and timesheet data
    if (emp.employmentType === "Permanent" || emp.employmentType === "Contract") {
      // For salaried employees, use their fixed salary, but adjust for unpaid leave
      basicSalary = emp.salary || 0;

      // Calculate unpaid leave days within this pay period
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

      // Deduct for unpaid leave (simplified: assume monthly salary / 20 working days)
      if (unpaidLeaveDaysInPeriod > 0 && basicSalary > 0) {
        const dailyRate = basicSalary / 20; // Assuming 20 working days in a month
        basicSalary -= dailyRate * unpaidLeaveDaysInPeriod;
      }

    } else if (emp.employmentType === "Temporary" && emp.hourlyRate) {
      // For hourly employees, calculate basic pay from approved regular hours
      basicSalary = totalApprovedRegularHours * emp.hourlyRate;
    } else {
      // Fallback if salary/hourly rate not defined or employment type unknown
      basicSalary = emp.salary || (emp.hourlyRate ? emp.hourlyRate * (emp.standardDailyHours || 8) * 20 : 0);
    }

    // Calculate overtime pay from approved overtime hours
    if (emp.hourlyRate && totalApprovedOvertimeHours > 0) {
      // Assume 1.5x overtime rate for simplicity
      totalOvertimeAmount = totalApprovedOvertimeHours * emp.hourlyRate * 1.5;
    } else if (emp.salary && totalApprovedOvertimeHours > 0) {
      // For salaried employees, a simplified overtime calculation (e.g., 1/160th of monthly salary per hour * 1.5)
      const hourlyEquivalent = (emp.salary / (20 * (emp.standardDailyHours || 8)));
      totalOvertimeAmount = totalApprovedOvertimeHours * hourlyEquivalent * 1.5;
    }

    const earningsBreakdown = [{ name: "Basic Salary", amount: basicSalary }];
    if (totalOvertimeAmount > 0) {
      earningsBreakdown.push({ name: "Overtime", amount: totalOvertimeAmount });
    }
    // Add mock Bonus for some employees/months (kept for variety)
    if (emp.id === "EMP004" && isSameMonth(payPeriodStart, new Date())) { // Sarah Brown gets a bonus this month
      earningsBreakdown.push({ name: "Bonus", amount: 2000 });
    }

    const grossEarnings = earningsBreakdown.reduce((sum, e) => sum + e.amount, 0);

    let totalDeductions = 0;
    const deductionsBreakdown: { name: string; amount: number }[] = [];

    // Statutory Deductions (simplified)
    const payeRate = 0.15; // Simplified PAYE rate
    const uifCap = 177.12; // Simplified UIF cap
    const sdlRate = 0.01; // Simplified SDL rate
    const providentFundRate = 0.075; // Simplified Provident Fund rate

    const paye = grossEarnings * payeRate;
    const uif = Math.min(grossEarnings * 0.01, uifCap);
    const sdl = grossEarnings * sdlRate;
    const providentFund = grossEarnings * providentFundRate;

    if (localStorage.getItem('applyPAYE') === 'true') {
      deductionsBreakdown.push({ name: "PAYE", amount: paye });
      totalDeductions += paye;
    }
    deductionsBreakdown.push({ name: "UIF", amount: uif });
    totalDeductions += uif;
    if (localStorage.getItem('applySDL') === 'true') {
      deductionsBreakdown.push({ name: "SDL", amount: sdl });
      totalDeductions += sdl;
    }
    deductionsBreakdown.push({ name: "Provident Fund", amount: providentFund });
    totalDeductions += providentFund;

    // Add mock Benefit Deductions for some employees/months
    if (emp.id === "EMP002" && payPeriodStart.getMonth() % 3 === 0) { // Jane Smith has medical aid every third month
      deductionsBreakdown.push({ name: "Medical Aid", amount: 1200 });
      totalDeductions += 1200;
    }
    if (emp.id === "EMP005" && payPeriodStart.getMonth() % 4 === 1) { // David Green has a retirement fund deduction
      deductionsBreakdown.push({ name: "Retirement Fund", amount: 800 });
      totalDeductions += 800;
    }

    // Loan Deductions for this period
    currentLoans.forEach(loan => {
      // Check if loan is active and its start date is before or within the current pay period
      if (loan.employeeId === emp.id && loan.status !== "completed" && new Date(loan.startDate) <= payPeriodEnd) {
        if (loan.paused) {
          // If paused, record a pause entry and then unpause for the next cycle
          const pauseEntry: LoanDeductionHistoryEntry = {
            date: format(payPeriodEnd, 'yyyy-MM-dd'),
            amount: 0,
            type: "pause",
            notes: `Deduction paused for pay period ${payPeriodString}`,
          };
          loan.deductionHistory.push(pauseEntry);
          loan.paused = false; // Auto-resume after one skipped period
          return; // Skip deduction for this period
        }

        let deductionAmount = 0;
        
        // Determine if a deduction is due for THIS pay period based on frequency
        if (loan.frequency === "monthly" && emp.payFrequency === "Monthly") {
          // For monthly loans, deduct if the current pay period is a full month period.
          const isFullMonthPeriod = format(payPeriodStart, 'dd') === '01' && isSameMonth(payPeriodStart, payPeriodEnd);
          if (isFullMonthPeriod) {
            deductionAmount = loan.repaymentAmount;
          }
        } else if (loan.frequency === "weekly" && (emp.payFrequency === "Weekly" || emp.payFrequency === "Bi-Weekly")) {
          // If the employee is paid weekly/bi-weekly and the loan is weekly,
          // and the current payslip period is a monthly one (as generated by generateMockPayslips),
          // we'll aggregate weekly deductions for the month.
          const isMonthlyPayslipPeriod = format(payPeriodStart, 'dd') === '01' && isSameMonth(payPeriodStart, payPeriodEnd);
          if (isMonthlyPayslipPeriod) {
            // For mock purposes, assume 4 weekly deductions in a month
            deductionAmount = loan.repaymentAmount * 4;
          } else {
            // If it's a true weekly pay period (e.g., from UpcomingPayrollCard),
            // then apply the single weekly deduction.
            const isFullWeekPeriod = (payPeriodEnd.getTime() - payPeriodStart.getTime()) / (1000 * 60 * 60 * 24) === 6; // 7 days interval
            if (isFullWeekPeriod) {
              deductionAmount = loan.repaymentAmount;
            }
          }
        }

        if (deductionAmount > 0) {
          deductionAmount = Math.min(deductionAmount, loan.remainingBalance); // Ensure not to over-deduct
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

    // Savings Deductions for this period
    currentSavingPlans.forEach(plan => {
      // Check if plan is active and its start date is before or within the current pay period
      if (plan.employeeId === emp.id && plan.status === "active" && new Date(plan.startDate) <= payPeriodEnd) {
        // Check if plan has an end date and if the current period is before or within it
        if (!plan.endDate || new Date(plan.endDate) >= payPeriodStart) {
          let deductionAmount = 0;
          
          // Determine if a deduction is due for THIS pay period based on frequency
          if (plan.frequency === "monthly" && emp.payFrequency === "Monthly") {
            // For monthly plans, deduct if the current pay period is a full month period.
            const isFullMonthPeriod = format(payPeriodStart, 'dd') === '01' && isSameMonth(payPeriodStart, payPeriodEnd);
            if (isFullMonthPeriod) {
              deductionAmount = plan.amount;
            }
          } else if (plan.frequency === "weekly" && (emp.payFrequency === "Weekly" || emp.payFrequency === "Bi-Weekly")) {
            // If the employee is paid weekly/bi-weekly and the plan is weekly,
            // and the current payslip period is a monthly one (as generated by generateMockPayslips),
            // we'll aggregate weekly deductions for the month.
            const isMonthlyPayslipPeriod = format(payPeriodStart, 'dd') === '01' && isSameMonth(payPeriodStart, payPeriodEnd);
            if (isMonthlyPayslipPeriod) {
              // For mock purposes, assume 4 weekly deductions in a month
              deductionAmount = plan.amount * 4;
            } else {
              // If it's a true weekly pay period (e.g., from UpcomingPayrollCard),
              // then apply the single weekly deduction.
              const isFullWeekPeriod = (payPeriodEnd.getTime() - payPeriodStart.getTime()) / (1000 * 60 * 60 * 24) === 6; // 7 days interval
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

    // Leave Summary (simplified for mock)
    let annualLeaveTaken = 0;
    let sickLeaveTaken = 0;
    // unpaidLeaveTaken is already calculated above

    const employeeLeave = leaveRecords.filter(rec => rec.employeeId === emp.id);
    employeeLeave.forEach(rec => {
      const leaveStart = new Date(rec.startDate);
      const leaveEnd = new Date(rec.endDate);
      
      if (isWithinInterval(leaveStart, { start: payPeriodStart, end: payPeriodEnd }) || isWithinInterval(leaveEnd, { start: payPeriodStart, end: payPeriodEnd })) {
        const overlapStart = leaveStart > payPeriodStart ? leaveStart : payPeriodStart;
        const overlapEnd = leaveEnd < payPeriodEnd ? leaveEnd : payPeriodEnd;
        const daysInPeriod = calculateWorkingDays(overlapStart, overlapEnd);

        if (rec.leaveType === "Annual Leave") annualLeaveTaken += daysInPeriod;
        else if (rec.leaveType === "Sick Leave") sickLeaveTaken += daysInPeriod;
      }
    });

    const netPay = grossEarnings - totalDeductions;

    // YTD calculations are handled by the calling function (generateMockPayslips)
    // For single period generation, we don't calculate YTD here.

    payslipsForPeriod.push({
      id: `PS-${emp.id}-${monthString}-${Date.now()}`, // Unique ID for each payslip
      employeeId: emp.id,
      payPeriod: payPeriodString,
      payDate: payDateString, // Assign the calculated pay date
      grossEarnings: grossEarnings,
      totalDeductions: totalDeductions,
      netPay: netPay,
      earningsBreakdown: earningsBreakdown,
      deductionsBreakdown: deductionsBreakdown,
      leaveSummary: {
        annual: 20 - annualLeaveTaken, // Mock total annual leave 20 days
        sick: 10 - sickLeaveTaken,   // Mock total sick leave 10 days
        unpaid: unpaidLeaveDaysInPeriod, // Use calculated unpaid leave
      },
      ytdGrossEarnings: 0, // Placeholder, will be filled by generateMockPayslips
      ytdTotalDeductions: 0, // Placeholder, will be filled by generateMockPayslips
    });
  });
  return payslipsForPeriod;
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
 * @returns An array of all generated MockPayslips.
 */
export const generateMockPayslips = (
  employees: MockEmployee[],
  initialLoans: Loan[],
  initialSavingPlans: SavingPlan[],
  leaveRecords: LeaveEntry[],
  timesheets: TimesheetEntry[]
): MockPayslip[] => {
  const allPayslips: MockPayslip[] = [];
  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth(); // 0 for Jan, 6 for July

  // Create deep copies of loans and saving plans for YTD calculation
  // This ensures that the original mock data isn't modified during initial generation
  const loansCopy: Loan[] = JSON.parse(JSON.stringify(initialLoans));
  const savingPlansCopy: SavingPlan[] = JSON.parse(JSON.stringify(initialSavingPlans));

  employees.forEach(emp => {
    let ytdGrossEarnings = 0;
    let ytdTotalDeductions = 0;

    for (let month = 0; month <= currentMonthIndex; month++) {
      const monthDate = new Date(currentYear, month, 1);
      const payPeriodStart = monthDate;
      const payPeriodEnd = new Date(currentYear, month + 1, 0); // Last day of the month

      // Generate payslip for this specific month using the helper
      const monthlyPayslips = generatePayslipsForPeriod(
        [emp], // Pass only the current employee
        loansCopy, // Pass the mutable copy
        savingPlansCopy, // Pass the mutable copy
        leaveRecords,
        timesheets,
        payPeriodStart,
        payPeriodEnd
      );

      if (monthlyPayslips.length > 0) {
        const payslip = monthlyPayslips[0]; // Should only be one for a single employee
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