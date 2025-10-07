import { eachDayOfInterval, isWeekend, format, isSameMonth, isSameYear, parseISO } from "date-fns";
import { MockEmployee, Loan, SavingPlan, LeaveEntry, MockPayslip, TimesheetEntry } from "../mock-data-interfaces";

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

export const generateMockPayslips = (
  employees: MockEmployee[],
  loans: Loan[],
  savingPlans: SavingPlan[],
  leaveRecords: LeaveEntry[],
  timesheets: TimesheetEntry[] // New parameter for timesheet data
): MockPayslip[] => {
  const allPayslips: MockPayslip[] = [];
  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth(); // 0 for Jan, 6 for July

  employees.forEach(emp => {
    let ytdGrossEarnings = 0;
    let ytdTotalDeductions = 0;

    for (let month = 0; month <= currentMonthIndex; month++) {
      const monthDate = new Date(currentYear, month, 1);
      const payPeriodStart = format(monthDate, "yyyy-MM-01");
      const payPeriodEnd = format(new Date(currentYear, month + 1, 0), "yyyy-MM-dd"); // Last day of the month
      const payPeriod = `${payPeriodStart} - ${payPeriodEnd}`;
      const monthString = format(monthDate, "yyyy-MM");

      let basicSalary = 0;
      let totalOvertimeAmount = 0;
      let unpaidLeaveDaysInPeriod = 0;

      // Filter approved timesheets for the current employee and pay period
      const approvedTimesheetsForPeriod = timesheets.filter(ts =>
        ts.employeeId === emp.id &&
        ts.status === "Approved" &&
        isSameMonth(parseISO(ts.date), monthDate) &&
        isSameYear(parseISO(ts.date), monthDate)
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
          isSameMonth(new Date(rec.startDate), monthDate) &&
          isSameYear(new Date(rec.startDate), monthDate)
        );
        employeeUnpaidLeave.forEach(rec => {
          const leaveStart = new Date(rec.startDate);
          const leaveEnd = new Date(rec.endDate);
          const periodStart = new Date(payPeriod.split(' - ')[0]);
          const periodEnd = new Date(payPeriod.split(' - ')[1]);

          if (leaveStart <= periodEnd && leaveEnd >= periodStart) {
            const overlapStart = leaveStart > periodStart ? leaveStart : periodStart;
            const overlapEnd = leaveEnd < periodEnd ? leaveEnd : periodEnd;
            unpaidLeaveDaysInPeriod += calculateWorkingDays(overlapStart, overlapEnd);
          }
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
      if (emp.id === "EMP004" && month === currentMonthIndex) { // Sarah Brown gets a bonus this month
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
      if (emp.id === "EMP002" && month % 3 === 0) { // Jane Smith has medical aid every third month
        deductionsBreakdown.push({ name: "Medical Aid", amount: 1200 });
        totalDeductions += 1200;
      }
      if (emp.id === "EMP005" && month % 4 === 1) { // David Green has a retirement fund deduction
        deductionsBreakdown.push({ name: "Retirement Fund", amount: 800 });
        totalDeductions += 800;
      }

      // Loan Deductions for this month
      const employeeLoans = loans.filter(loan => loan.employeeId === emp.id);
      employeeLoans.forEach(loan => {
        let deductionAmount = 0;
        if (loan.status !== "completed" && loan.startDate.substring(0, 7) <= monthString) {
          if (loan.frequency === "monthly") {
            deductionAmount = Math.min(loan.repaymentAmount, loan.remainingBalance);
          } else if (loan.frequency === "weekly") {
            deductionAmount = Math.min(loan.repaymentAmount * 4, loan.remainingBalance); // Approx 4 weeks
          }
        }
        if (deductionAmount > 0) {
          deductionsBreakdown.push({ name: `Loan Repayment (${loan.id})`, amount: deductionAmount });
          totalDeductions += deductionAmount;
        }
      });

      // Savings Deductions for this month
      const employeeSavingPlans = savingPlans.filter(plan => plan.employeeId === emp.id);
      employeeSavingPlans.forEach(plan => {
        let deductionAmount = 0;
        if (plan.status === "active" && plan.startDate.substring(0, 7) <= monthString) {
          if (!plan.endDate || plan.endDate.substring(0, 7) >= monthString) {
            if (plan.frequency === "monthly") {
              deductionAmount = plan.amount;
            } else if (plan.frequency === "weekly") {
              deductionAmount = plan.amount * 4; // Approx 4 weeks
            }
          }
        }
        if (deductionAmount > 0) {
          deductionsBreakdown.push({ name: `Savings (${plan.id})`, amount: deductionAmount });
          totalDeductions += deductionAmount;
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
        const periodStart = new Date(payPeriod.split(' - ')[0]);
        const periodEnd = new Date(payPeriod.split(' - ')[1]);

        if (leaveStart <= periodEnd && leaveEnd >= periodStart) {
          const overlapStart = leaveStart > periodStart ? leaveStart : periodStart;
          const overlapEnd = leaveEnd < periodEnd ? leaveEnd : periodEnd;
          const daysInPeriod = calculateWorkingDays(overlapStart, overlapEnd);

          if (rec.leaveType === "Annual Leave") annualLeaveTaken += daysInPeriod;
          else if (rec.leaveType === "Sick Leave") sickLeaveTaken += daysInPeriod;
        }
      });

      const netPay = grossEarnings - totalDeductions;

      // Update YTD values
      ytdGrossEarnings += grossEarnings;
      ytdTotalDeductions += totalDeductions;

      allPayslips.push({
        id: `PS-${emp.id}-${monthString}`,
        employeeId: emp.id,
        payPeriod: payPeriod,
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
        ytdGrossEarnings: ytdGrossEarnings,
        ytdTotalDeductions: ytdTotalDeductions,
      });
    }
  });
  return allPayslips;
};