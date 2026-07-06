import { describe, it, expect } from "vitest";
import {
  ALL_TRAINING_MANUALS,
  ADMIN_TRAINING_MANUALS,
  STAFF_TRAINING_MANUALS,
  filterTrainingManuals,
  getDefaultTrainingManualId,
  getTrainingCategories,
  getTrainingManualById,
} from "@/lib/training-content";

describe("training manuals", () => {
  it("includes admin and staff manuals", () => {
    expect(ADMIN_TRAINING_MANUALS.length).toBeGreaterThanOrEqual(10);
    expect(STAFF_TRAINING_MANUALS.length).toBeGreaterThanOrEqual(5);
    expect(ALL_TRAINING_MANUALS.length).toBe(
      ADMIN_TRAINING_MANUALS.length + STAFF_TRAINING_MANUALS.length
    );
  });

  it("each manual has required training fields", () => {
    for (const manual of ALL_TRAINING_MANUALS) {
      expect(manual.objectives.length).toBeGreaterThan(0);
      expect(manual.beforeYouStart.length).toBeGreaterThan(0);
      expect(manual.procedures.length).toBeGreaterThan(0);
      expect(manual.procedures.every((p) => p.steps.length > 0)).toBe(true);
      expect(manual.commonMistakes.length).toBeGreaterThan(0);
      expect(manual.practiceExercise.length).toBeGreaterThan(10);
      expect(manual.href.startsWith("/")).toBe(true);
    }
  });

  it("filters manuals by role", () => {
    const staffOnly = filterTrainingManuals(ALL_TRAINING_MANUALS, "Staff");
    expect(staffOnly.every((m) => m.audience.includes("Staff"))).toBe(true);
    expect(staffOnly.some((m) => m.id === "staff-payslips")).toBe(true);
    expect(staffOnly.some((m) => m.id === "settings")).toBe(false);

    const manager = filterTrainingManuals(ALL_TRAINING_MANUALS, "Manager");
    expect(manager.some((m) => m.id === "payroll-runs")).toBe(true);
    expect(manager.some((m) => m.id === "settings")).toBe(false);

    const admin = filterTrainingManuals(ALL_TRAINING_MANUALS, "Admin");
    expect(admin.some((m) => m.id === "settings")).toBe(true);
  });

  it("returns default manual id by role", () => {
    expect(getDefaultTrainingManualId("Staff")).toBe("staff-getting-started");
    expect(getDefaultTrainingManualId("Admin")).toBe("dashboard-todos");
  });

  it("looks up manual by id", () => {
    expect(getTrainingManualById("timesheets")?.title).toMatch(/Timesheet/i);
    expect(getTrainingCategories(ADMIN_TRAINING_MANUALS)).toContain("Payroll");
  });
});
