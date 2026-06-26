import { eachDayOfInterval, isWeekend, format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths, getDay, getDate, setDate, setDay } from "date-fns";
import { TaxTables } from "@/hooks/use-tax-tables"; // Import TaxTables interface
import { bankersRound } from "@/lib/utils";
import { logger } from "@/lib/logger";

export const calculateWorkingDays = (start: Date, end: Date): number => {
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
 * Calculates PAYE for a given taxable income based on provided tax brackets and applies rebates.
 * @param taxableIncome The employee's taxable income for the period.
 * @param payeBrackets Array of PAYE tax brackets.
 * @param taxYearDetails Details of the tax year, including rebates.
 * @param employeeAge The age of the employee.
 * @param payFrequency The employee's pay frequency ("Monthly", "Weekly", "Bi-Weekly").
 * @returns The calculated PAYE amount.
 */
export const calculatePAYE = (
  taxableIncome: number,
  payeBrackets: TaxTables['payeBrackets'],
  taxYearDetails: TaxTables['taxYearDetails'] | null,
  employeeAge: number | null,
  payFrequency: "Monthly" | "Weekly" | "Bi-Weekly",
  /** Annual Section 6A medical scheme tax credit, subtracted from PAYE after rebates. */
  annualMedicalCredit: number = 0
): number => {
  let annualizationFactor = 1;
  let deAnnualizationFactor = 1;

  switch (payFrequency) {
    case "Weekly":
      annualizationFactor = 52;
      deAnnualizationFactor = 52;
      break;
    case "Bi-Weekly":
      annualizationFactor = 26;
      deAnnualizationFactor = 26;
      break;
    case "Monthly":
    default:
      annualizationFactor = 12;
      deAnnualizationFactor = 12;
      break;
  }

  // Annualize income for PAYE calculation
  const annualIncome = taxableIncome * annualizationFactor;
  let annualPAYE = 0;

  // Ensure payeBrackets is not empty before iterating
  if (payeBrackets.length === 0) {
    logger.warn("[calculatePAYE] No PAYE brackets provided. Returning 0.");
    return 0;
  }

  // SARS marginal formula: tax = deduction + rate * (income - lowerThreshold),
  // where lowerThreshold is the bottom of the bracket (the previous bracket's
  // max_income, or 0 for the first bracket) and `deduction` is the cumulative
  // tax at that threshold. This MUST use the threshold, not bracket.min_income
  // (which is threshold + 1), otherwise PAYE is understated by ~rate per year.
  let lowerThreshold = 0;
  for (const bracket of payeBrackets) {
    if (annualIncome >= bracket.min_income && (bracket.max_income === null || annualIncome <= bracket.max_income)) {
      annualPAYE = (annualIncome - lowerThreshold) * bracket.rate + bracket.deduction;
      break;
    }
    lowerThreshold = bracket.max_income ?? lowerThreshold;
  }

  // Apply rebates if taxYearDetails is available.
  // If age is unknown, default to primary (under-65) rebate to avoid over-taxing.
  if (taxYearDetails && taxYearDetails.rebates) {
    let totalRebate = 0;
    const rebates = taxYearDetails.rebates;

    if (employeeAge === null) {
      totalRebate = rebates.under65;
    } else if (employeeAge < 65) {
      totalRebate = rebates.under65;
    } else if (employeeAge >= 65 && employeeAge < 75) {
      totalRebate = rebates.under65 + rebates.sixtyFiveToSeventyFour;
    } else if (employeeAge >= 75) {
      totalRebate = rebates.under65 + rebates.sixtyFiveToSeventyFour + rebates.seventyFivePlus;
    }

    annualPAYE = Math.max(0, annualPAYE - totalRebate); // Ensure PAYE doesn't go negative
  }

  // Section 6A medical scheme fees tax credit is applied AFTER rebates and
  // cannot create a refund (floored at zero).
  if (annualMedicalCredit > 0) {
    annualPAYE = Math.max(0, annualPAYE - annualMedicalCredit);
  }

  // De-annualize PAYE to get the amount for the current pay period
  const periodPAYERaw = annualPAYE / deAnnualizationFactor;
  const periodPAYE = bankersRound(periodPAYERaw, 2);
  return periodPAYE;
};

/**
 * Calculates the pay period start, end, and check date based on a reference date and pay cycle parameters.
 * This function is designed to be flexible, accepting individual pay cycle parameters.
 * @param referenceDate The date from which to determine the *next* upcoming pay period.
 * @param payCycleType The type of pay cycle ("Monthly", "Weekly", "Bi-Weekly").
 * @param cutOffDay For weekly: 1=Monday, 7=Sunday. For monthly: day of month (1-31).
 * @param payDayOffset Days after cut-off to make payment.
 * @returns An object containing checkDate, payPeriodStart, and payPeriodEnd.
 */
export const calculatePayPeriodDetails = (
  referenceDate: Date,
  payCycleType: "Monthly" | "Weekly" | "Bi-Weekly",
  cutOffDay: number,
  payDayOffset: number
): { checkDate: Date; payPeriodStart: Date; payPeriodEnd: Date } => {
  let payPeriodEnd: Date;

  if (payCycleType === "Monthly") {
    let candidateCutOff = setDate(referenceDate, cutOffDay);
    
    // If the candidate cut-off date is before or on the reference date,
    // and the reference date is *after* the cut-off day of its month,
    // then the next cut-off is in the next month.
    // Otherwise, it's this month's cut-off.
    if (candidateCutOff < referenceDate && getDate(referenceDate) >= cutOffDay) {
      payPeriodEnd = addMonths(candidateCutOff, 1);
    } else {
      payPeriodEnd = candidateCutOff;
    }
    
    // Calculate payPeriodStart: day after previous cut-off
    let previousCutOffDate = subMonths(payPeriodEnd, 1);
    previousCutOffDate = setDate(previousCutOffDate, cutOffDay);
    const payPeriodStart = addDays(previousCutOffDate, 1);
    const checkDate = addDays(payPeriodEnd, payDayOffset);

    return { checkDate, payPeriodStart, payPeriodEnd };

  } else if (payCycleType === "Weekly" || payCycleType === "Bi-Weekly") {
    // date-fns getDay returns 0=Sun, 1=Mon, ..., 6=Sat. We need to convert cutOffDay (1=Mon, 7=Sun)
    const targetDayOfWeek = cutOffDay === 7 ? 0 : cutOffDay; // Convert 7 (Sunday) to 0 for date-fns

    let candidateCutOff = setDay(referenceDate, targetDayOfWeek, { weekStartsOn: 1 }); // weekStartsOn: 1 means Monday is 1

    // If the candidate cut-off date is before or on the reference date,
    // and the reference date is *after* the cut-off day of its week,
    // then the next cut-off is in the next week.
    // Otherwise, it's this week's cut-off.
    if (candidateCutOff < referenceDate && getDay(referenceDate) >= targetDayOfWeek) {
      payPeriodEnd = addWeeks(candidateCutOff, 1);
    } else {
      payPeriodEnd = candidateCutOff;
    }

    const checkDate = addDays(payPeriodEnd, payDayOffset);

    let payPeriodStart: Date;
    if (payCycleType === "Weekly") {
      payPeriodStart = addDays(subWeeks(payPeriodEnd, 1), 1); // Day after previous cut-off
    } else { // Bi-Weekly
      payPeriodStart = addDays(subWeeks(payPeriodEnd, 2), 1); // Day after previous bi-weekly cut-off
    }
    
    return { checkDate, payPeriodStart, payPeriodEnd };
  }

  // Fallback to a default weekly if settings are invalid or not found
  const defaultCheckDate = addDays(startOfWeek(referenceDate, { weekStartsOn: 1 }), 4); // Default to Friday
  const defaultPayPeriodEnd = defaultCheckDate;
  const defaultPayPeriodStart = subDays(defaultPayPeriodEnd, 6);
  return { checkDate: defaultCheckDate, payPeriodStart: defaultPayPeriodStart, payPeriodEnd: defaultPayPeriodEnd };
};