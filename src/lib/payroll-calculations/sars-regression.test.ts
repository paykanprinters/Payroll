/**
 * COMP-18 — Permanent SARS parallel regression suite.
 *
 * Runs the full golden-master matrix (11 scenarios × every curated tax year)
 * against hand-calculated SARS figures. This is the final compliance gate:
 * any drift in PAYE, UIF, SDL treatment, or net pay fails CI.
 *
 * Run: pnpm check:sars-compliance
 */
import { describe, it, expect } from "vitest";
import { SUPPORTED_SARS_TAX_YEARS } from "@/lib/sars-tax-tables";
import {
  assertRegressionMatrixComplete,
  runRegressionScenario,
  scenariosForTaxYear,
} from "@/lib/payroll-calculations/sars-regression";

describe("COMP-18 SARS parallel regression — matrix integrity", () => {
  it("has 11 scenarios for every curated SARS tax year", () => {
    expect(() => assertRegressionMatrixComplete()).not.toThrow();
  });

  it("covers all supported years in the regression matrix", () => {
    for (const year of SUPPORTED_SARS_TAX_YEARS) {
      expect(scenariosForTaxYear(year)).toHaveLength(11);
    }
  });
});

describe.each(SUPPORTED_SARS_TAX_YEARS)("COMP-18 SARS parallel regression — TY%s", (taxYear) => {
  const scenarios = scenariosForTaxYear(taxYear);

  for (const scenario of scenarios) {
    describe(`${scenario.id} — ${scenario.label}`, () => {
      it("UIF matches SARS (1% capped at monthly ceiling)", () => {
        expect(runRegressionScenario(scenario, taxYear).uif).toBeCloseTo(
          scenario.sars.uif,
          2
        );
      });

      it("PAYE matches SARS tables", () => {
        expect(runRegressionScenario(scenario, taxYear).paye).toBeCloseTo(
          scenario.sars.paye,
          2
        );
      });

      it("SDL is NOT deducted from the employee (employer levy)", () => {
        expect(runRegressionScenario(scenario, taxYear).hasSdlDeduction).toBe(false);
      });

      it("employer SDL (1% of remuneration) is tracked as an employer cost", () => {
        expect(runRegressionScenario(scenario, taxYear).employerSdl).toBeCloseTo(
          scenario.sars.sdlEmployer,
          2
        );
      });

      it("net pay matches SARS-correct take-home", () => {
        expect(runRegressionScenario(scenario, taxYear).net).toBeCloseTo(
          scenario.sars.net,
          2
        );
      });
    });
  }
});

describe("COMP-18 SARS parallel regression — combined feature interactions", () => {
  it("TY2027 E11 applies retirement pre-rebate and medical credit post-rebate", () => {
    const scenario = scenariosForTaxYear(2027).find((s) => s.id === "E11")!;
    const result = runRegressionScenario(scenario, 2027);
    expect(
      result.breakdown.find((d) => d.name === "Retirement Fund")?.amount
    ).toBeCloseTo(3_750, 2);
    expect(result.paye).toBeCloseTo(scenario.sars.paye, 2);
    expect(result.net).toBeCloseTo(scenario.sars.net, 2);
  });

  it("TY2026 E11 applies retirement pre-rebate and medical credit post-rebate", () => {
    const scenario = scenariosForTaxYear(2026).find((s) => s.id === "E11")!;
    const result = runRegressionScenario(scenario, 2026);
    expect(
      result.breakdown.find((d) => d.name === "Retirement Fund")?.amount
    ).toBeCloseTo(3_750, 2);
    expect(result.paye).toBeCloseTo(scenario.sars.paye, 2);
    expect(result.net).toBeCloseTo(scenario.sars.net, 2);
  });
});
