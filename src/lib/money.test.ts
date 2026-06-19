import { describe, it, expect } from "vitest";
import { sumMoney } from "@/lib/money";

describe("sumMoney", () => {
  it("returns 0 for an empty list", () => {
    expect(sumMoney([])).toBe(0);
  });

  it("sums and rounds to two decimals", () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney([10.005, 10.005])).toBe(20.01);
  });
});
