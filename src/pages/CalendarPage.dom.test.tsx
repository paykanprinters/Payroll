import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { waitFor } from "@testing-library/react";
import { render, screen, fireEvent } from "@/test/render";
import CalendarPage from "@/pages/CalendarPage";

vi.mock("@/hooks/use-payroll-processor-context", () => ({
  usePayrollProcessor: () => ({
    employees: [{ id: "e1", firstName: "Thandi", lastName: "Nkosi", startDate: "2020-01-01" }],
    leaveRecords: [
      { id: "l1", employeeId: "e1", leaveType: "Annual Leave", startDate: "2026-12-08", endDate: "2026-12-09", totalDays: 2, workingDays: 2, status: "Approved" },
    ],
    publicHolidays: [{ userId: "u", name: "Day of Reconciliation", date: "2025-12-16", recurring: true }],
    payCycleSettings: { payCycleType: "Weekly", cutOffDay: 2, payDayOffset: 0 },
    isLoadingEmployees: false,
    isLoadingLeaveRecords: false,
  }),
}));

vi.mock("@/integrations/supabase/closure-queries", () => ({
  fetchClosures: () =>
    Promise.resolve([
      { id: "c1", name: "December shutdown", startDate: "2026-12-18", endDate: "2027-01-10", payoutDate: "2026-12-17", status: "draft", excludedEmployeeIds: [] },
    ]),
}));

vi.mock("@/integrations/supabase/payroll-run-queries", () => ({
  fetchPayrollRuns: () => Promise.resolve([]),
}));

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

vi.mock("@/hooks/use-company-banner-name", () => ({ useCompanyBannerName: () => "Kan Printers" }));

describe("CalendarPage", () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 11, 1, 9, 0));
  });
  afterAll(() => vi.useRealTimers());

  it("shows the month with holidays, leave, pay days and the closure", async () => {
    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>
    );
    expect(screen.getAllByText("December 2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Day of Reconciliation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Thandi Nkosi: Annual Leave").length).toBeGreaterThan(0);
    expect(screen.getAllByText("EMP201 due").length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getAllByText("December shutdown (draft)").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: /Leave\s*\d/ }));
    expect(screen.queryAllByText("Thandi Nkosi: Annual Leave")).toHaveLength(0);
  });
});
