"use client";

import React, { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, PencilLine, Save, User } from "lucide-react";
import { ParsedTimesheetRow } from "@/hooks/use-timesheet-import";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateTimesheetMetrics } from "@/lib/timesheet-utils";
import { WorkHoursSettings } from "@/hooks/use-work-hours-settings";
import { parse, isValid } from "date-fns";

interface ValidatedDataTableProps {
  validatedData: ParsedTimesheetRow[];
  employees: MockEmployee[];
  allRowsValid: boolean;
  compact?: boolean;
  groupByEmployee?: boolean;
  workHoursSettings?: WorkHoursSettings | null;
  onEditRow?: (key: string, updates: Partial<ParsedTimesheetRow>) => void;
  onResolveEmployee?: (key: string, employeeId: string) => void;
}

const normalizeDate = (d: string) => (d || "").replace(/\//g, "-");

const formatWorkHours = (hours: number) => {
  const safe = Number.isFinite(hours) ? Math.max(0, hours) : 0;
  const totalMinutes = Math.round(safe * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
};

// Light formatter: allow free typing, auto-insert ":" after HH, keep only digits/colon, clamp length
const formatHHmmInput = (raw: string) => {
  let v = (raw || "").replace(/[^\d:]/g, "");
  // Auto insert colon after two digits if none
  if (!v.includes(":") && v.length >= 3) {
    v = `${v.slice(0, 2)}:${v.slice(2)}`;
  }
  // Clamp to HH:mm length
  if (v.length > 5) v = v.slice(0, 5);
  return v;
};

const ValidatedDataTable: React.FC<ValidatedDataTableProps> = ({
  validatedData,
  employees,
  allRowsValid,
  compact = false,
  groupByEmployee = false,
  workHoursSettings,
  onEditRow,
  onResolveEmployee,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const employeesById = useMemo(() => {
    const map = new Map<string, MockEmployee>();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const metricOpts = useMemo(() => {
    if (!workHoursSettings) return undefined;
    return {
      breakDurationMinutes: workHoursSettings.breakDurationMinutes,
      paidLunch: workHoursSettings.paidLunch,
      dailyStartTime: workHoursSettings.dailyStartTime,
      dailyEndTime: workHoursSettings.dailyEndTime,
      fridayStartTime: workHoursSettings.fridayStartTime,
      fridayEndTime: workHoursSettings.fridayEndTime,
      overtimeThresholdHours: workHoursSettings.overtimeThresholdHours,
    };
  }, [workHoursSettings]);

  const getRowWorkHours = (row: ParsedTimesheetRow) => {
    const dateObj = parse(normalizeDate(row.date), "yyyy-MM-dd", new Date());
    if (!isValid(dateObj)) return 0;
    const employee = employeesById.get(row.employeeId);
    const { totalWorkHours } = calculateTimesheetMetrics(
      {
        employeeId: row.employeeId,
        date: dateObj,
        timeIn: row.timeIn,
        teaStart: row.teaStart,
        teaEnd: row.teaEnd,
        lunchStart: row.lunchStart,
        lunchEnd: row.lunchEnd,
        timeOut: row.timeOut,
      },
      employee,
      metricOpts
    );

    return totalWorkHours;
  };

  const indexedRows = useMemo(
    () =>
      validatedData.map((row, originalIndex) => ({
        row,
        originalIndex,
        workHours: getRowWorkHours(row),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [validatedData, employeesById, metricOpts]
  );

  const groups = useMemo(() => {
    if (!groupByEmployee) return null;

    const map = new Map<
      string,
      {
        employeeId: string;
        name: string;
        customEmployeeId: string;
        csvPersonalId: string;
        items: { row: ParsedTimesheetRow; originalIndex: number; workHours: number }[];
      }
    >();

    for (const item of indexedRows) {
      const employee = employeesById.get(item.row.employeeId);
      const name = employee ? `${employee.firstName} ${employee.lastName}`.trim() : "Unknown employee";
      const customEmployeeId = employee?.customEmployeeId || "N/A";
      const key = item.row.employeeId || "Unknown";
      if (!map.has(key)) {
        map.set(key, {
          employeeId: key,
          name,
          customEmployeeId,
          csvPersonalId: String(item.row.csvPersonalId || ""),
          items: [],
        });
      }
      map.get(key)!.items.push(item);
    }

    const result = Array.from(map.values());
    result.sort((a, b) => a.name.localeCompare(b.name));
    result.forEach((g) => {
      g.items.sort((a, b) => {
        const da = normalizeDate(a.row.date);
        const db = normalizeDate(b.row.date);
        const byDate = da.localeCompare(db);
        if (byDate !== 0) return byDate;
        return (a.row.timeIn || "").localeCompare(b.row.timeIn || "");
      });
    });

    return result;
  }, [groupByEmployee, indexedRows, employeesById]);

  if (validatedData.length === 0) {
    return null;
  }

  const rowClass = compact ? "py-1" : "py-2";
  const cellClass = compact ? "p-2" : "p-4";

  const renderDataRow = (row: ParsedTimesheetRow, originalIndex: number, workHours: number) => {
    const isEditing = editingIndex === originalIndex;
    const rowKey = `${row.employeeId}|${normalizeDate(row.date)}`;
    const employee = employeesById.get(row.employeeId);
    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "N/A";

    return (
      <TableRow
        key={originalIndex}
        className={`${row._isValid ? "" : "bg-red-50/50"} ${rowClass}`}
      >
        <TableCell className={`${cellClass} text-center`}>
          {row._isValid ? (
            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
          ) : (
            <div className="flex items-center justify-center text-red-500" title={row._errors.join("; ")}>
              <XCircle className="h-4 w-4" />
            </div>

          )}
        </TableCell>

        {/* CSV Personal ID (read-only display) */}
        <TableCell className={cellClass}>{row.csvPersonalId}</TableCell>

        {/* Employee Resolver */}
        <TableCell className={cellClass}>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Select onValueChange={(value) => onResolveEmployee?.(rowKey, value)} value={row.employeeId || ""}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Resolve employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.customEmployeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            employeeName
          )}
        </TableCell>

        {/* Date */}
        <TableCell className={cellClass}>
          {isEditing ? (
            <Input
              type="date"
              value={normalizeDate(row.date)}
              onChange={(e) => onEditRow?.(rowKey, { date: e.target.value })}
              className="w-40"
            />
          ) : (
            normalizeDate(row.date)
          )}
        </TableCell>

        {/* Time In */}
        <TableCell className={cellClass}>
          {isEditing ? (
            <Input
              type="text"
              inputMode="numeric"
              placeholder="HH:mm"
              value={row.timeIn || ""}
              onChange={(e) => onEditRow?.(rowKey, { timeIn: formatHHmmInput(e.target.value) })}
              className="w-28"
            />
          ) : (
            row.timeIn
          )}
        </TableCell>

        {/* Tea Break */}
        <TableCell className={cellClass}>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="HH:mm"
                value={row.teaStart || ""}
                onChange={(e) => onEditRow?.(rowKey, { teaStart: formatHHmmInput(e.target.value) })}
                className="w-24"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="HH:mm"
                value={row.teaEnd || ""}
                onChange={(e) => onEditRow?.(rowKey, { teaEnd: formatHHmmInput(e.target.value) })}
                className="w-24"
              />
            </div>
          ) : (
            row.teaStart && row.teaEnd ? `${row.teaStart}-${row.teaEnd}` : "N/A"
          )}
        </TableCell>

        {/* Lunch Break */}
        <TableCell className={cellClass}>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="HH:mm"
                value={row.lunchStart || ""}
                onChange={(e) => onEditRow?.(rowKey, { lunchStart: formatHHmmInput(e.target.value) })}
                className="w-24"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="HH:mm"
                value={row.lunchEnd || ""}
                onChange={(e) => onEditRow?.(rowKey, { lunchEnd: formatHHmmInput(e.target.value) })}
                className="w-24"
              />
            </div>
          ) : (
            row.lunchStart && row.lunchEnd ? `${row.lunchStart}-${row.lunchEnd}` : "N/A"
          )}
        </TableCell>

        {/* Time Out */}
        <TableCell className={cellClass}>
          {isEditing ? (
            <Input
              type="text"
              inputMode="numeric"
              placeholder="HH:mm"
              value={row.timeOut || ""}
              onChange={(e) => onEditRow?.(rowKey, { timeOut: formatHHmmInput(e.target.value) })}
              className="w-28"
            />
          ) : (
            row.timeOut
          )}
        </TableCell>

        {/* Work Hours */}
        <TableCell className={`${cellClass} whitespace-nowrap`}>
          <span className={row._isValid ? "text-slate-900" : "text-muted-foreground"}>{formatWorkHours(workHours)}</span>
        </TableCell>

        {/* Actions */}
        <TableCell className={`${cellClass} text-right`}>
          {isEditing ? (
            <ButtonIcon icon={<Save className="h-4 w-4" />} label="Save" onClick={() => setEditingIndex(null)} />
          ) : (
            <ButtonIcon
              icon={<PencilLine className="h-4 w-4" />}
              label="Edit"
              onClick={() => setEditingIndex(originalIndex)}
            />
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <>
      <ScrollArea className="border rounded-md w-full h-[70vh] md:h-[65vh]">
        <div className="min-w-full">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className={cellClass}>Status</TableHead>
                <TableHead className={cellClass}>Personal ID (from CSV)</TableHead>
                <TableHead className={cellClass}>Employee Name (Resolved)</TableHead>
                <TableHead className={cellClass}>Date</TableHead>
                <TableHead className={cellClass}>Time In</TableHead>
                <TableHead className={cellClass}>Tea Break</TableHead>
                <TableHead className={cellClass}>Lunch Break</TableHead>
                <TableHead className={cellClass}>Time Out</TableHead>
                <TableHead className={cellClass}>Work Hours</TableHead>
                <TableHead className={`${cellClass} text-right`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups
                ? groups.flatMap((g) => {
                    const validHoursSum = g.items.reduce((sum, i) => sum + (i.row._isValid ? i.workHours : 0), 0);
                    const invalidCount = g.items.filter((i) => !i.row._isValid).length;
                    return [
                      <TableRow key={`group-${g.employeeId}`} className="bg-slate-50/80">
                        <TableCell colSpan={10} className={compact ? "p-2" : "p-3"}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="font-semibold text-slate-900">{g.name}</span>
                              <span className="text-xs text-muted-foreground">#{g.customEmployeeId}</span>
                              {g.csvPersonalId ? (
                                <span className="text-xs text-muted-foreground">Personal ID: {g.csvPersonalId}</span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-muted-foreground">{g.items.length} day(s)</span>
                              <span className="font-medium text-slate-900">Total: {formatWorkHours(validHoursSum)}</span>
                              {invalidCount > 0 ? (
                                <span className="text-red-600">{invalidCount} invalid</span>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>,
                      ...g.items.map((i) => renderDataRow(i.row, i.originalIndex, i.workHours)),
                    ];
                  })
                : indexedRows.map((i) => renderDataRow(i.row, i.originalIndex, i.workHours))}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>

      {!allRowsValid && (
        <p className="text-sm text-red-500 mt-2">
          Some rows contain errors and will not be imported. Hover over <XCircle className="inline h-3 w-3" /> for details.
        </p>
      )}
    </>
  );
};

const ButtonIcon = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm hover:bg-accent hover:text-accent-foreground"
    aria-label={label}
    title={label}
  >
    {icon}
    <span className="hidden md:inline">{label}</span>
  </button>
);

export default ValidatedDataTable;