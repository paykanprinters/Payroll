import { describe, expect, it } from "vitest";
import {
  fitPaperScaleToA4Reference,
  getReportPaper,
  getReportPreviewPageClasses,
} from "@/lib/report-paper";

describe("report-paper", () => {
  it("returns physical dimensions per size", () => {
    expect(getReportPaper("A4").width).toBe(210);
    expect(getReportPaper("A5").height).toBe(210);
    expect(getReportPaper("Letter").label).toBe("US Letter");
  });

  it("maps preview page classes", () => {
    expect(getReportPreviewPageClasses("A5")).toContain("w-a5");
    expect(getReportPreviewPageClasses("Letter")).toContain("w-letter");
  });

  it("keeps A5 footprint smaller than A4 under a shared A4 reference scale", () => {
    const scale = fitPaperScaleToA4Reference(400, 600);
    const a4 = getReportPaper("A4");
    const a5 = getReportPaper("A5");
    const letter = getReportPaper("Letter");

    expect(a5.width * scale).toBeLessThan(a4.width * scale);
    expect(a5.height * scale).toBeLessThan(a4.height * scale);
    // Letter is slightly wider, slightly shorter than A4
    expect(letter.width * scale).toBeGreaterThan(a4.width * scale);
    expect(letter.height * scale).toBeLessThan(a4.height * scale);
  });
});
