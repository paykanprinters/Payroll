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
 * Calculates PAYE for a given taxable income based on provided tax brackets and applies rebates.
 * @param taxableIncome The employee's taxable income for the period.
 * @param payeBrackets Array of PAYE tax brackets.
 * @param taxYearDetails Details of the tax year, including rebates.
 * @param employeeAge The age of the employee.
 * @returns The calculated PAYE amount.
 */
export const calculatePAYE = (
  taxableIncome: number,
  payeBrackets: TaxTables['payeBrackets'],
  taxYearDetails: TaxTables['taxYearDetails'] | null,
  employeeAge: number | null
): number => {
  console.log(`[calculatePAYE] START - taxableIncome: ${taxableIncome}, payeBrackets length: ${payeBrackets.length}, employeeAge: ${employeeAge}`);
  console.log(`[calculatePAYE] taxYearDetails:`, taxYearDetails);

  // Annualize income for PAYE calculation (assuming monthly income * 12)
  const annualIncome = taxableIncome * 12;
  let annualPAYE = 0;

  console.log(`[calculatePAYE] Annualized Income: ${annualIncome}`);

  // Ensure payeBrackets is not empty before iterating
  if (payeBrackets.length === 0) {
    console.warn("[calculatePAYE] No PAYE brackets provided. Returning 0.");
    return 0;
  }

  for (const bracket of payeBrackets) {
    console.log(`[calculatePAYE] Checking bracket: min_income=${bracket.min_income}, max_income=${bracket.max_income}, rate=${bracket.rate}, deduction=${bracket.deduction}`);
    if (annualIncome >= bracket.min_income && (bracket.max_income === null || annualIncome <= bracket.max_income)) {
      annualPAYE = (annualIncome - bracket.min_income) * bracket.rate + bracket.deduction;
      console.log(`[calculatePAYE] Matched bracket. Calculation: (${annualIncome} - ${bracket.min_income}) * ${bracket.rate} + ${bracket.deduction} = ${annualPAYE}`);
      break;
    }
  }

  // Apply rebates if taxYearDetails and employeeAge are available
  if (taxYearDetails && taxYearDetails.rebates && employeeAge !== null) {
    let totalRebate = 0;
    const rebates = taxYearDetails.rebates;

    if (employeeAge < 65) {
      totalRebate = rebates.under65;
    } else if (employeeAge >= 65 && employeeAge < 75) {
      totalRebate = rebates.under65 + rebates.sixtyFiveToSeventyFour;
    } else if (employeeAge >= 75) {
      totalRebate = rebates.under65 + rebates.sixtyFiveToSeventyFour + rebates.seventyFivePlus;
    }
    
    console.log(`[calculatePAYE] Applying total rebate: ${totalRebate} based on age ${employeeAge}`);
    annualPAYE = Math.max(0, annualPAYE - totalRebate); // Ensure PAYE doesn't go negative
  }

  // De-annualize PAYE to get monthly amount
  const monthlyPAYE = annualPAYE / 12;
  console.log(`[calculatePAYE] Annual PAYE (after rebates): ${annualPAYE}, Monthly PAYE: ${monthlyPAYE}`);
  console.log(`[calculatePAYE] END - Returning monthlyPAYE: ${monthlyPAYE}`);
  return monthlyPAYE;
};