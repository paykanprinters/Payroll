// Helper to calculate working days (excluding weekends)
import { eachDayOfInterval, isWeekend } from "date-fns";
import { TaxTables } from "@/hooks/use-tax-tables"; // Import TaxTables interface

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
 * Calculates PAYE for a given taxable income based on provided tax brackets.
 * @param taxableIncome The employee's taxable income for the period.
 * @param payeBrackets Array of PAYE tax brackets.
 * @returns The calculated PAYE amount.
 */
export const calculatePAYE = (taxableIncome: number, payeBrackets: TaxTables['payeBrackets']): number => {
  // Annualize income for PAYE calculation (assuming monthly income * 12)
  const annualIncome = taxableIncome * 12;
  let annualPAYE = 0;

  for (const bracket of payeBrackets) {
    if (annualIncome > bracket.min_income && (bracket.max_income === null || annualIncome <= bracket.max_income)) {
      annualPAYE = (annualIncome - bracket.min_income) * bracket.rate + bracket.deduction;
      break;
    }
  }
  // De-annualize PAYE to get monthly amount
  return annualPAYE / 12;
};