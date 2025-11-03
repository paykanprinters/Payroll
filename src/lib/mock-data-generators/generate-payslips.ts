import { MockEmployee, Loan, SavingPlan, LeaveEntry, MockPayslip, TimesheetEntry } from "../mock-data-interfaces";
import { TaxTables } from "@/hooks/use-tax-tables"; // Import TaxTables interface
import { generatePayslipsForPeriod } from "@/lib/payroll-calculations/payslip-generator"; // Import from new location
import { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries"; // New import
import { bankersRound } from "@/lib/utils";

/**
 * Generates mock payslips for all employees for all months up to the current month of the current year.
 * This function is used for initial mock data setup.
 *
 * @param employees All mock employees.
 * @param initialLoans Initial mock loans (immutable input).
 * @param initialSavingPlans Initial mock saving plans (immutable input).
 * @param leaveRecords All mock leave records.
 * @param timesheets All mock timesheet entries.
 * @param taxTables The fetched tax tables (PAYE brackets, UIF/SDL rates, taxYearDetails).
 * @param userTaxSettings The user-specific tax settings (apply PAYE/SDL flags).
 * @returns An array of all generated MockPayslips.
 */
export const generateMockPayslips = (
  employees: MockEmployee[],
  initialLoans: Loan[],
  initialSavingPlans: SavingPlan[],
  leaveRecords: LeaveEntry[],
  timesheets: TimesheetEntry[],
  taxTables: TaxTables, // New parameter for tax tables
  userTaxSettings: UserTaxSettings | null // New parameter for user tax settings
): MockPayslip[] => {
  const allPayslips: MockPayslip[] = [];
  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth();

  // Create deep copies for the entire mock generation process
  const processingLoansForMock: Loan[] = JSON.parse(JSON.stringify(initialLoans));
  const processingSavingPlansForMock: SavingPlan[] = JSON.parse(JSON.stringify(initialSavingPlans));

  // Iterate through each month
  for (let month = 0; month <= currentMonthIndex; month++) {
    const monthDate = new Date(currentYear, month, 1);
    const payPeriodStart = monthDate;
    const payPeriodEnd = new Date(currentYear, month + 1, 0);

    // Call generatePayslipsForPeriod ONCE for all employees for this month
    const { payslips: monthlyPayslips } = generatePayslipsForPeriod(
      employees, // Pass ALL employees
      processingLoansForMock,
      processingSavingPlansForMock,
      leaveRecords,
      timesheets,
      payPeriodStart,
      payPeriodEnd,
      taxTables,
      userTaxSettings // Pass user tax settings
    );

    // Now, process the payslips generated for this month to calculate YTD values
    monthlyPayslips.forEach(payslip => {
      // Find the last payslip for this specific employee to get previous YTD
      const employeePreviousPayslips = allPayslips.filter(p => p.employeeId === payslip.employeeId)
                                                  .sort((a, b) => a.payPeriod.localeCompare(b.payPeriod));
      const lastPayslipForEmployee = employeePreviousPayslips.length > 0 ? employeePreviousPayslips[employeePreviousPayslips.length - 1] : null;

      const ytdGrossEarnings = bankersRound((lastPayslipForEmployee?.ytdGrossEarnings || 0) + payslip.grossEarnings, 2);
      const ytdTotalDeductions = bankersRound((lastPayslipForEmployee?.ytdTotalDeductions || 0) + payslip.totalDeductions, 2);

      allPayslips.push({
        ...payslip,
        ytdGrossEarnings: ytdGrossEarnings,
        ytdTotalDeductions: ytdTotalDeductions,
      });
    });
  }
  return allPayslips;
};