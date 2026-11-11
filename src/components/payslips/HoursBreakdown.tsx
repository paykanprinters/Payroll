"use client";

import React, { useMemo } from "react";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { MockEmployee, TimesheetEntry } from "@/lib/mock-data-interfaces";
import type { WorkHoursSettings } from "@/hooks/use-work-hours-settings";
import type { PublicHoliday } from "@/hooks/use-public-holidays";
import { leaveDayLabel } from "@/lib/leave-timesheet-rows";
import { dayIsHolidayForEmployee } from "@/lib/payroll-calculations/helpers/earnings-helpers";
import { buildHolidayPlaceholders, publicHolidayTitle } from "@/lib/timesheet-holidays";

type Props = {
  employeeId: string;
  timesheets: TimesheetEntry[];
  periodStart: Date;
  periodEnd: Date;
  workHoursSettings: WorkHoursSettings | null;
  weeklyThreshold?: number;
  employee?: MockEmployee;
  holidays?: PublicHoliday[];
};

type BreakdownRow = {
  date: string;
  onSiteHours: number;
  breakDeducted: number;
  paidHours: number;
  classification: string;
  isLeave: boolean;
  isHoliday: boolean;
};

const HoursBreakdown: React.FC<Props> = ({
  employeeId,
  timesheets,
  periodStart,
  periodEnd,
  workHoursSettings,
  weeklyThreshold = 41.25,
  employee,
  holidays = [],
}) => {
  const workDaysSet = useMemo(
    () => new Set((workHoursSettings?.workDays || []).map((d) => d.toLowerCase())),
    [workHoursSettings]
  );
  const fixedBreakHours = (workHoursSettings?.breakDurationMinutes ?? 45) / 60;
  const paidLunch = workHoursSettings?.paidLunch === true;

  const filtered = useMemo(() => {
    const start = startOfDay(periodStart);
    const end = endOfDay(periodEnd);
    return timesheets
      .filter((ts) => ts.employeeId === employeeId)
      .filter((ts) => {
        const tsDate = parseISO(ts.date);
        return isWithinInterval(tsDate, { start, end });
      })
      .filter(
        (ts) =>
          ts.status === "Submitted" || ts.status === "Approved" || ts.status === "Locked"
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [employeeId, periodStart, periodEnd, timesheets]);

  const rows = useMemo((): BreakdownRow[] => {
    const worked = filtered.map((ts): BreakdownRow => {
      const tsDate = parseISO(ts.date);
      const dow = tsDate.getDay(); // 0 Sun ... 6 Sat
      const isSatNonWork = dow === 6 && !workDaysSet.has("saturday");
      const isSunNonWork = dow === 0 && !workDaysSet.has("sunday");

      // totalWorkHours already has unpaid break applied in our logic; reconstruct on-site hours only for display
      const onSiteHours = Math.max(
        0,
        (ts.totalWorkHours || 0) + (paidLunch ? 0 : fixedBreakHours)
      );
      const breakDeducted = paidLunch ? 0 : fixedBreakHours;
      const paidHours = ts.totalWorkHours || 0;

      const leaveLabel = leaveDayLabel(ts.leaveType);
      const holiday = !leaveLabel && employee ? dayIsHolidayForEmployee(ts.date, employee, holidays) : null;
      const classification = leaveLabel
        ? `${leaveLabel} (paid, not worked)`
        : holiday
        ? `${publicHolidayTitle(holiday.name)} (worked)`
        : isSatNonWork
        ? "Weekend (Sat)"
        : isSunNonWork
        ? "Weekend (Sun)"
        : "Normal";

      return {
        date: ts.date,
        onSiteHours,
        breakDeducted,
        paidHours,
        classification,
        isLeave: !!leaveLabel,
        isHoliday: !!holiday,
      };
    });

    const notWorked = employee
      ? buildHolidayPlaceholders({
          holidays,
          employees: [employee],
          existingKeys: new Set(filtered.map((ts) => `${ts.employeeId}|${ts.date}`)),
          from: format(periodStart, "yyyy-MM-dd"),
          to: format(periodEnd, "yyyy-MM-dd"),
          workDays: workHoursSettings?.workDays,
        }).map(
          (p): BreakdownRow => ({
            date: p.date,
            onSiteHours: 0,
            breakDeducted: 0,
            paidHours: 0,
            classification: `${publicHolidayTitle(p.holidayName)} (not worked)`,
            isLeave: false,
            isHoliday: true,
          })
        )
      : [];

    return [...worked, ...notWorked].sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered, workDaysSet, fixedBreakHours, paidLunch, employee, holidays, periodStart, periodEnd, workHoursSettings?.workDays]);

  const totals = useMemo(() => {
    let normalPaid = 0;
    let satPrem = 0;
    let sunPrem = 0;
    let leavePaid = 0;
    let holidayWorked = 0;
    rows.forEach((r) => {
      if (r.isHoliday) holidayWorked += r.paidHours;
      else if (r.isLeave) leavePaid += r.paidHours;
      else if (r.classification === "Normal") normalPaid += r.paidHours;
      else if (r.classification.startsWith("Weekend (Sat")) satPrem += r.paidHours;
      else if (r.classification.startsWith("Weekend (Sun")) sunPrem += r.paidHours;
    });
    const totalPaid = normalPaid + satPrem + sunPrem;
    const regular = Math.min(totalPaid, weeklyThreshold);
    const weeklyOT = Math.max(0, totalPaid - weeklyThreshold);
    return { normalPaid, satPrem, sunPrem, regular, weeklyOT, leavePaid, holidayWorked };
  }, [rows, weeklyThreshold]);

  return (
    <div className="mt-6 border rounded-md">
      <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/50">
        <h4 className="font-semibold">
          Hours breakdown ({format(periodStart, "yyyy-MM-dd")} → {format(periodEnd, "yyyy-MM-dd")})
        </h4>
        <div className="text-sm text-muted-foreground">
          Fixed unpaid break: {fixedBreakHours.toFixed(2)}h • Threshold: {weeklyThreshold.toFixed(2)}h
        </div>
      </div>
      <div className="p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">On-site</th>
              <th className="py-2 pr-4">Break</th>
              <th className="py-2 pr-4">Paid</th>
              <th className="py-2 pr-4">Type</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-muted-foreground">
                  No eligible timesheets in this window.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.date} className={r.isHoliday ? "border-t bg-amber-50/60" : "border-t"}>
                  <td className="py-2 pr-4">{format(parseISO(r.date), "EEE, yyyy-MM-dd")}</td>
                  <td className="py-2 pr-4">{r.onSiteHours.toFixed(2)}h</td>
                  <td className="py-2 pr-4">{r.breakDeducted.toFixed(2)}h</td>
                  <td className="py-2 pr-4">{r.paidHours.toFixed(2)}h</td>
                  <td className="py-2 pr-4">{r.classification}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-900/30">
            <div className="text-xs text-muted-foreground">Normal paid hours</div>
            <div className="font-semibold">{totals.normalPaid.toFixed(2)}h</div>
          </div>
          <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-900/30">
            <div className="text-xs text-muted-foreground">Saturday hours</div>
            <div className="font-semibold">{totals.satPrem.toFixed(2)}h</div>
          </div>
          <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-900/30">
            <div className="text-xs text-muted-foreground">Sunday hours</div>
            <div className="font-semibold">{totals.sunPrem.toFixed(2)}h</div>
          </div>
          <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-900/30">
            <div className="text-xs text-muted-foreground">Regular</div>
            <div className="font-semibold">{totals.regular.toFixed(2)}h</div>
          </div>
          <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-900/30">
            <div className="text-xs text-muted-foreground">Weekly OT</div>
            <div className="font-semibold">{totals.weeklyOT.toFixed(2)}h</div>
          </div>
          {totals.holidayWorked > 0 && (
            <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-900/30">
              <div className="text-xs text-muted-foreground">Public holiday worked</div>
              <div className="font-semibold">{totals.holidayWorked.toFixed(2)}h</div>
            </div>
          )}
          {totals.leavePaid > 0 && (
            <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-900/30">
              <div className="text-xs text-muted-foreground">Leave / sick paid</div>
              <div className="font-semibold">{totals.leavePaid.toFixed(2)}h</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HoursBreakdown;