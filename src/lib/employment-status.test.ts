import { describe, expect, it } from "vitest";
import {
  formatEmployeePickerLabel,
  formatEmploymentStatusDetail,
  getEmploymentStatus,
} from "@/lib/employment-status";

describe("employment status", () => {
  it("treats a missing exit date as active", () => {
    expect(getEmploymentStatus({ terminationDate: undefined })).toBe("Active");
  });

  it("maps resignation and termination, and treats a date-only record as terminated", () => {
    expect(
      getEmploymentStatus({ terminationDate: "2026-08-01", employmentExitType: "Resignation" })
    ).toBe("Resigned");
    expect(
      getEmploymentStatus({ terminationDate: "2026-08-01", employmentExitType: "Termination" })
    ).toBe("Terminated");
    expect(getEmploymentStatus({ terminationDate: "2026-08-01" })).toBe("Terminated");
  });

  it("includes status on picker labels and detail text", () => {
    const resigned = {
      firstName: "Mogamat",
      lastName: "Safodien",
      customEmployeeId: "KP010",
      terminationDate: "2026-08-15",
      employmentExitType: "Resignation" as const,
      employmentExitReason: "Relocated",
    };
    expect(formatEmployeePickerLabel(resigned, { includeCode: true })).toBe(
      "Mogamat Safodien (KP010) · Resigned"
    );
    expect(formatEmploymentStatusDetail(resigned)).toContain("Resigned");
    expect(formatEmploymentStatusDetail(resigned)).toContain("Relocated");
  });
});
