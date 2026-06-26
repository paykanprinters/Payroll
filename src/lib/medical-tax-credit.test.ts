import { describe, expect, it } from "vitest";
import {
  computeMonthlyMedicalTaxCredit,
  getSarsMedicalTaxCredits,
} from "@/lib/sars-tax-tables";

describe("Section 6A medical scheme tax credit (COMP-07)", () => {
  const credits2027 = getSarsMedicalTaxCredits(2027)!;

  it("exposes curated monthly credit amounts for TY2027", () => {
    expect(credits2027).toEqual({
      mainMember: 376,
      firstDependant: 376,
      additionalDependant: 252,
    });
  });

  it("returns 0 when the employee is not a medical-scheme member", () => {
    expect(computeMonthlyMedicalTaxCredit(false, 3, credits2027)).toBe(0);
  });

  it("gives only the main-member credit with no dependants", () => {
    expect(computeMonthlyMedicalTaxCredit(true, 0, credits2027)).toBe(376);
  });

  it("adds the first-dependant credit (main + 1)", () => {
    // 376 + 376 = 752
    expect(computeMonthlyMedicalTaxCredit(true, 1, credits2027)).toBe(752);
  });

  it("adds the additional-dependant credit beyond the first", () => {
    // 376 + 376 + 252 + 252 = 1256 for main + 3 dependants
    expect(computeMonthlyMedicalTaxCredit(true, 3, credits2027)).toBe(1256);
  });

  it("guards against negative/fractional dependant counts", () => {
    expect(computeMonthlyMedicalTaxCredit(true, -2, credits2027)).toBe(376);
    expect(computeMonthlyMedicalTaxCredit(true, 1.9, credits2027)).toBe(752);
  });

  it("returns 0 when no credits are available for the year", () => {
    expect(computeMonthlyMedicalTaxCredit(true, 2, null)).toBe(0);
    expect(getSarsMedicalTaxCredits(1999)).toBeNull();
  });
});
