import {
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
  format,
} from "date-fns";
import {
  MockEmployee,
  Loan,
  SavingPlan,
  LeaveEntry,
  MockPayslip,
  TimesheetEntry,
} from "../mock-data-interfaces";
import { PayrollSavingsEntry, savingsSavedToDate } from "@/lib/savings-types";
import { loanPayslipFigures } from "@/lib/payroll-calculations/helpers/loan-payslip";
import { TaxTables } from "@/hooks/use-tax-tables";
import { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries";
import { bankersRound } from "@/lib/utils";
import { calculateLeaveSummary } from "@/lib/leave-summary";
import { v4 as uuidv4 } from "uuid";
import type { WorkHoursSettings } from "@/hooks/use-work-hours-settings";
import type { PublicHoliday } from "@/hooks/use-public-holidays";
import type { OvertimePremiumRules } from "./helpers/earnings-helpers";
import { filterEmployeesActiveInPeriod } from "@/lib/employee-active-period";
import { formatPayrollPeriod } from "@/lib/payroll-period-guard";

import {
  getWeeklyThreshold,
  deriveHourlyRate,
  computeThresholdForPeriod,
  collectHolidayBuckets,
  collectNonHolidayBuckets,
  allocateOvertime,
  computeBasicSalary,
  computeHolidayAmounts,
  computeOvertimeAmounts,
  buildEarningsBreakdown,
  applyAssignedEarnings,
} from "./helpers/earnings-helpers";

import { buildDeductions } from "./helpers/deductions-helpers";

const calculateEarnings = (
  emp: MockEmployee,
  approvedTimesheetsForPeriod: TimesheetEntry[],
  leaveRecords: LeaveEntry[],
  payPeriodStart: Date,
  payPeriodEnd: Date,
  workHoursSettings?: WorkHoursSettings | null,
  holidays: PublicHoliday[] = [],
  overtimeRules?: OvertimePremiumRules
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

  const { basic: basicSalary, unpaidLeaveDaysInPeriod } = computeBasicSalary(
    emp,
    overtimeAlloc.regularHours,
    hourlyRate,
    leaveRecords,
    payPeriodStart,
    payPeriodEnd,
    workHoursSettings
  );

  const holidayAmounts = computeHolidayAmounts(
    holidayBuckets.holidayWorkedHours,
    holidayBuckets.holidayNonWorkedHours,
    hourlyRate,
    overtimeRules
  );

  const overtimeAmounts = computeOvertimeAmounts(
    hourlyRate,
    overtimeAlloc.overtimeWeekdayHours,
    overtimeAlloc.overtimeSaturdayHours,
    overtimeAlloc.overtimeSundayHours,
    overtimeRules
  );

  const { earningsBreakdown, grossEarnings } = buildEarningsBreakdown(
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

  return { earningsBreakdown, grossEarnings, unpaidLeaveDaysInPeriod };
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
  holidays: PublicHoliday[] = [],
  earningComponents: { id: string; name?: string; amount?: number; amountType?: string }[] = [],
  deductionComponents: { id: string; name?: string; amount?: number; amountType?: string }[] = [],
  assignments: {
    componentType?: string;
    employeeId?: string;
    componentId?: string;
    overrideAmount?: number | null;
    effectiveStart?: string | null;
    effectiveEnd?: string | null;
  }[] = [],
  overtimeRules?: OvertimePremiumRules
): {
  payslips: MockPayslip[];
  updatedLoans: Loan[];
  updatedSavingPlans: SavingPlan[];
  savingPaymentsToRecord: { planId: string; employeeId: string; amount: number }[];
} => {
  const payslipsForPeriod: MockPayslip[] = [];
  const payPeriodString = formatPayrollPeriod(payPeriodStart, payPeriodEnd);
  const payDateString = format(payPeriodEnd, "dd/MM/yyyy");

  const processingLoans: Loan[] = JSON.parse(JSON.stringify(initialLoans));
  const processingSavingPlans: SavingPlan[] = JSON.parse(JSON.stringify(initialSavingPlans));
  const savingPaymentsToRecord: { planId: string; employeeId: string; amount: number }[] = [];

  const activeEmployees = filterEmployeesActiveInPeriod(employees, payPeriodStart, payPeriodEnd);

  activeEmployees.forEach((emp) => {
    const approvedTimesheetsForPeriod = timesheets.filter((ts) => {
      const isEmployeeMatch = ts.employeeId === emp.id;
      const eligibleStatus = ts.status === "Approved" || ts.status === "Locked";
      const tsDate = parseISO(ts.date);
      const inRange = isWithinInterval(tsDate, {
        start: startOfDay(payPeriodStart),
        end: endOfDay(payPeriodEnd),
      });
      return isEmployeeMatch && eligibleStatus && inRange;
    });

    const earningsResult = calculateEarnings(
      emp,
      approvedTimesheetsForPeriod,
      leaveRecords,
      payPeriodStart,
      payPeriodEnd,
      workHoursSettings,
      holidays,
      overtimeRules
    );

    const withComponents = applyAssignedEarnings(
      emp,
      earningsResult.grossEarnings,
      earningsResult.earningsBreakdown,
      earningComponents,
      assignments,
      payPeriodStart,
      payPeriodEnd
    );

    const {
      deductionsBreakdown,
      totalDeductions,
      savingPaymentsToRecord: empSavingPayments,
      employerSdl,
    } = buildDeductions(
        emp,
        withComponents.grossEarnings,
        processingLoans,
        processingSavingPlans,
        taxTables,
        userTaxSettings,
        payPeriodStart,
        payPeriodEnd,
        payPeriodString,
        payrollSavingsEntries,
        earningComponents,
        deductionComponents,
        assignments
      );

    if (empSavingPayments.length > 0) {
      savingPaymentsToRecord.push(...empSavingPayments);
    }

    const rawNet = withComponents.grossEarnings - totalDeductions;
    const netPay = bankersRound(Math.max(0, rawNet), 2);
    const finalDeductions = [...deductionsBreakdown];
    if (rawNet < 0) {
      finalDeductions.push({
        name: "Deductions exceed gross (capped at zero net)",
        amount: bankersRound(rawNet, 2),
      });
    }

    const leaveSummary = calculateLeaveSummary(
      emp,
      leaveRecords,
      payPeriodStart,
      payPeriodEnd,
      earningsResult.unpaidLeaveDaysInPeriod
    );

    const periodSavings = finalDeductions
      .filter((line) => (line.name || "").trim() === "Savings")
      .reduce((sum, line) => sum + (line.amount || 0), 0);
    const periodLoan = finalDeductions
      .filter((line) => (line.name || "").trim() === "Loan Repayment")
      .reduce((sum, line) => sum + (line.amount || 0), 0);
    const loanFigures = loanPayslipFigures(processingLoans, emp.id, periodLoan);

    payslipsForPeriod.push({
      id: uuidv4(),
      employeeId: emp.id,
      payPeriod: payPeriodString,
      payDate: payDateString,
      grossEarnings: withComponents.grossEarnings,
      totalDeductions,
      netPay,
      employerSdl,
      earningsBreakdown: withComponents.earningsBreakdown,
      deductionsBreakdown: finalDeductions,
      leaveSummary,
      ytdGrossEarnings: 0,
      ytdTotalDeductions: 0,
      savingsBalance: savingsSavedToDate(payrollSavingsEntries, emp.id, periodSavings),
      loanDeduction: loanFigures.loanDeduction,
      loanBalance: loanFigures.loanBalance,
    });
  });

  return {
    payslips: payslipsForPeriod,
    updatedLoans: processingLoans,
    updatedSavingPlans: processingSavingPlans,
    savingPaymentsToRecord,
  };
};
