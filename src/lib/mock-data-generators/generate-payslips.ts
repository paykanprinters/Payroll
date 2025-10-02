import { eachDayOfInterval, isWeekend, format } from "date-fns";
import { MockEmployee, Loan, SavingPlan, LeaveEntry, MockPayslip } from "../mock-data-interfaces";

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

export const generateMockPayslips = (employees: MockEmployee[], loans: Loan[], savingPlans: SavingPlan[], leaveRecords: LeaveEntry[]): MockPayslip[] => {
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
      if (emp.salary !== undefined) {
        basicSalary = emp.salary;
      } else if (emp.hourlyRate !== undefined) {
        // For hourly employees, estimate monthly basic pay (e.g., 8 hours/day * 20 working days/month)
        basicSalary = emp.hourlyRate * (emp.standardDailyHours || 8) * 20;
      }

      let grossEarnings = basicSalary;
      const earningsBreakdown = [{ name: "Basic Salary", amount: basicSalary }];

      // Add mock Overtime and Bonus for some employees/months
      if (emp.id === "EMP001" && month % 2 === 0) { // John Doe gets overtime every other month
        earningsBreakdown.push({ name: "Overtime", amount: 1500 });
        grossEarnings += 1500;
      }
      if (emp.id === "EMP004" && month === currentMonthIndex) { // Sarah Brown gets a bonus this month
        earningsBreakdown.push({ name: "Bonus", amount: 2000 });
        grossEarnings += 2000;
      }

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
      let unpaidLeaveTaken = 0;

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
          else if (rec.leaveType === "Unpaid Leave") unpaidLeaveTaken += daysInPeriod;
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
          unpaid: unpaidLeaveTaken,
        },
        ytdGrossEarnings: ytdGrossEarnings,
        ytdTotalDeductions: ytdTotalDeductions,
      });
    }
  });
  return allPayslips;
};