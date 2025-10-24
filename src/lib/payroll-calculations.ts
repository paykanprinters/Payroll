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
 * @param payFrequency The employee's pay frequency ("Monthly", "Weekly", "Bi-Weekly").
 * @returns The calculated PAYE amount.
 */
export const calculatePAYE = (
  taxableIncome: number,
  payeBrackets: TaxTables['payeBrackets'],
  taxYearDetails: TaxTables['taxYearDetails'] | null,
  employeeAge: number | null,
  payFrequency: "Monthly" | "Weekly" | "Bi-Weekly"
): number => {
  console.log(`[calculatePAYE] START - taxableIncome: ${taxableIncome}, payFrequency: ${payFrequency}, employeeAge: ${employeeAge}`);
  console.log(`[calculatePAYE] taxYearDetails:`, taxYearDetails);

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

  console.log(`[calculatePAYE] Annualization Factor: ${annualizationFactor}, Annualized Income: ${annualIncome}`);

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

  // De-annualize PAYE to get the amount for the current pay period
  const periodPAYE = annualPAYE / deAnnualizationFactor;
  console.log(`[calculatePAYE] Annual PAYE (after rebates): ${annualPAYE}, Period PAYE: ${periodPAYE}`);
  console.log(`[calculatePAYE] END - Returning periodPAYE: ${periodPAYE}`);
  return periodPAYE;
};