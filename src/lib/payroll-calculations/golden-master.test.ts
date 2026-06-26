/**
 * COMP-00 / COMP-18 — Golden master characterization snapshots.
 *
 * Snapshots the engine's CURRENT output for the TY2027 matrix so unintended
 * drift is caught during refactors. SARS-correct assertions live in
 * `sars-regression.test.ts` (the permanent parallel-run gate).
 */

import { describe, it, expect } from "vitest";
import {
  SCENARIOS_TY2027,
  SCENARIO_COMBINED_TY2027,
  runRegressionScenario,
} from "@/lib/payroll-calculations/sars-regression";

const TY2027_SCENARIOS = [...SCENARIOS_TY2027, SCENARIO_COMBINED_TY2027];

describe("COMP-00 golden master — fixture integrity", () => {
  it("covers the full 11-scenario TY2027 matrix", () => {
    expect(TY2027_SCENARIOS).toHaveLength(11);
    expect(new Set(TY2027_SCENARIOS.map((s) => s.id)).size).toBe(11);
  });
});

describe("COMP-00 golden master — characterization (current engine output, TY2027)", () => {
  for (const scenario of TY2027_SCENARIOS) {
    it(`${scenario.id} (${scenario.label}) current statutory output`, () => {
      const r = runRegressionScenario(scenario, 2027);
      expect({
        paye: r.paye,
        uif: r.uif,
        sdl: r.sdl,
        hasSdlDeduction: r.hasSdlDeduction,
        totalDeductions: r.totalDeductions,
        net: r.net,
      }).toMatchSnapshot();
    });
  }
});
