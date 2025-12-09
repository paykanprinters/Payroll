"use client";

import React, { useMemo } from "react";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { TimesheetEntry } from "@/lib/mock-data-interfaces";
import type { WorkHoursSettings } from "@/hooks/use-work-hours-settings";

type Props = {
  employeeId: string;
  timesheets: TimesheetEntry[];
  periodStart: Date;
  periodEnd: Date;
  workHoursSettings: WorkHoursSettings | null;
  weeklyThreshold?: number;
};

const HoursBreakdown: React.FC<Props> = ({
  employeeId,
  timesheets,
  periodStart,
  periodEnd,
  workHoursSettings,
  weeklyThreshold = 41.25,
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

  const rows = useMemo(() => {
    return filtered.map((ts) => {
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

      const classification = isSatNonWork
        ? "Weekend (Sat @1.5x)"
        : isSunNonWork
        ? "Weekend (Sun @2.0x)"
        : "Normal";

      return {
        date: ts.date,
        onSiteHours,
        breakDeducted,
        paidHours,
        classification,
      };
    });
  }, [filtered, workDaysSet, fixedBreakHours, paidLunch]);

  const totals = useMemo(() => {
    let normalPaid = 0;
    let satPrem = 0;
    let sunPrem = 0;
    rows.forEach((r) => {
      if (r.classification === "Normal") normalPaid += r.paidHours;
      else if (r.classification.startsWith("Weekend (Sat")) satPrem += r.paidHours;
      else if (r.classification.startsWith("Weekend (Sun")) sunPrem += r.paidHours;
    });
    const regular = Math.min(normalPaid, weeklyThreshold);
    const weeklyOT = Math.max(0, normalPaid - weeklyThreshold);
    return { normalPaid, satPrem, sunPrem, regular, weeklyOT };
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
                <tr key={r.date} className="border-t">
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
            <div className="text-xs text-muted-foreground">Sat premium</div>
            <div className="font-semibold">{totals.satPrem.toFixed(2)}h</div>
          </div>
          <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-900/30">
            <div className="text-xs text-muted-foreground">Sun premium</div>
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
        </div>
      </div>
    </div>
  );
};

export default HoursBreakdown;