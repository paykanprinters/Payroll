"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, PencilLine, Save, User } from "lucide-react";
import { ParsedTimesheetRow } from "@/hooks/use-timesheet-import";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateTimesheetMetrics } from "@/lib/timesheet-utils";
import { WorkHoursSettings } from "@/hooks/use-work-hours-settings";
import { format, parse, isValid } from "date-fns";
import type { ImportPreviewViewMode } from "@/components/timesheet/FiltersBar";

interface ValidatedDataTableProps {
  validatedData: ParsedTimesheetRow[];
  employees: MockEmployee[];
  allRowsValid: boolean;
  compact?: boolean;
  groupByEmployee?: boolean;
  viewMode?: ImportPreviewViewMode;
  workHoursSettings?: WorkHoursSettings | null;
  onEditRow?: (key: string, updates: Partial<ParsedTimesheetRow>) => void;
  onResolveEmployee?: (key: string, employeeId: string) => void;
  externalIdLabel?: string;
}

const normalizeDate = (d: string) => (d || "").replace(/\//g, "-");

const formatWorkHours = (hours: number) => {
  const safe = Number.isFinite(hours) ? Math.max(0, hours) : 0;
  const totalMinutes = Math.round(safe * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
};

const formatHHmmInput = (raw: string) => {
  let v = (raw || "").replace(/[^\d:]/g, "");
  if (!v.includes(":") && v.length >= 3) v = `${v.slice(0, 2)}:${v.slice(2)}`;
  if (v.length > 5) v = v.slice(0, 5);
  return v;
};

const rowKeyFor = (row: ParsedTimesheetRow) => `${row.employeeId}|${normalizeDate(row.date)}`;

const ValidatedDataTable: React.FC<ValidatedDataTableProps> = ({
  validatedData,
  employees,
  allRowsValid,
  compact = false,
  groupByEmployee = false,
  viewMode = "table",
  workHoursSettings,
  onEditRow,
  onResolveEmployee,
  externalIdLabel = "Personal ID (from CSV)",
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

  const getRowWorkHours = useCallback((row: ParsedTimesheetRow) => {
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
  }, [employeesById, metricOpts]);

  const indexedRows = useMemo(
    () =>
      validatedData.map((row, originalIndex) => ({
        row,
        originalIndex,
        workHours: getRowWorkHours(row),
        key: rowKeyFor(row),
      })),
    [validatedData, getRowWorkHours]
  );

  const rowByKey = useMemo(() => {
    const map = new Map<string, (typeof indexedRows)[number]>();
    indexedRows.forEach((item) => map.set(item.key, item));
    return map;
  }, [indexedRows]);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        employeeId: string;
        name: string;
        customEmployeeId: string;
        csvPersonalId: string;
        items: (typeof indexedRows)[number][];
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
      g.items.sort((a, b) => normalizeDate(a.row.date).localeCompare(normalizeDate(b.row.date)));
    });
    return result;
  }, [indexedRows, employeesById]);

  if (validatedData.length === 0) return null;

  const cellClass = compact ? "p-2" : "p-3";
  const rowClass = compact ? "py-1" : "py-2";

  const renderTimeInput = (
    row: ParsedTimesheetRow,
    key: string,
    field: keyof ParsedTimesheetRow,
    className = "w-full min-w-[4.5rem]"
  ) => (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="HH:mm"
      value={String(row[field] || "")}
      onChange={(e) => onEditRow?.(key, { [field]: formatHHmmInput(e.target.value) })}
      className={className}
    />
  );

  const renderStatusIcon = (row: ParsedTimesheetRow) =>
    row._isValid ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <span title={row._errors.join("; ")}>
        <XCircle className="h-4 w-4 text-red-500" />
      </span>
    );

  const renderCardsView = () => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {indexedRows.map(({ row, originalIndex, workHours, key }) => {
        const employee = employeesById.get(row.employeeId);
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Unknown";
        return (
          <Card
            key={key}
            className={row._isValid ? "border-slate-200" : "border-red-200 bg-red-50/40"}
          >
            <CardHeader className="space-y-2 pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{employeeName}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {format(parse(normalizeDate(row.date), "yyyy-MM-dd", new Date()), "EEE, dd MMM yyyy")}
                  </p>
                </div>
                {renderStatusIcon(row)}
              </div>
              {!row._isValid && (
                <p className="text-xs text-red-600">{row._errors.join(" · ")}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{externalIdLabel}</p>
                <p className="text-sm">{row.csvPersonalId || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Employee match</p>
                <Select onValueChange={(value) => onResolveEmployee?.(key, value)} value={row.employeeId || ""}>
                  <SelectTrigger>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium">Time in</p>
                  {renderTimeInput(row, key, "timeIn")}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">Time out</p>
                  {renderTimeInput(row, key, "timeOut")}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">Tea start</p>
                  {renderTimeInput(row, key, "teaStart")}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">Tea end</p>
                  {renderTimeInput(row, key, "teaEnd")}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">Lunch start</p>
                  {renderTimeInput(row, key, "lunchStart")}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">Lunch end</p>
                  {renderTimeInput(row, key, "lunchEnd")}
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">Work hours</span>
                <span className="font-medium">{formatWorkHours(workHours)}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderGridView = () => (
    <div className="space-y-6">
      {groups.map((group) => {
        const dates = group.items.map((item) => normalizeDate(item.row.date));
        const uniqueDates = [...new Set(dates)].sort();
        const fieldRows: { label: string; field: keyof ParsedTimesheetRow }[] = [
          { label: "Time in", field: "timeIn" },
          { label: "Tea start", field: "teaStart" },
          { label: "Tea end", field: "teaEnd" },
          { label: "Lunch start", field: "lunchStart" },
          { label: "Lunch end", field: "lunchEnd" },
          { label: "Time out", field: "timeOut" },
        ];

        return (
          <Card key={group.employeeId} className="overflow-hidden">
            <CardHeader className="border-b bg-slate-50/80 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{group.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    #{group.customEmployeeId}
                    {group.csvPersonalId ? ` · ${externalIdLabel}: ${group.csvPersonalId}` : ""}
                  </p>
                </div>
                <Badge variant="outline">{group.items.length} day(s)</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-max border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="sticky left-0 z-20 min-w-[120px] border-r bg-muted/30 px-3 py-2 text-left font-medium">
                        Field
                      </th>
                      {uniqueDates.map((date) => {
                        const item = rowByKey.get(`${group.employeeId}|${date}`);
                        return (
                          <th
                            key={date}
                            className={`min-w-[110px] px-2 py-2 text-center font-medium ${item?.row._isValid ? "" : "bg-red-50/80"}`}
                          >
                            <div>{format(parse(date, "yyyy-MM-dd", new Date()), "EEE")}</div>
                            <div className="text-xs font-normal text-muted-foreground">
                              {format(parse(date, "yyyy-MM-dd", new Date()), "dd MMM")}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {fieldRows.map(({ label, field }) => (
                      <tr key={field} className="border-b last:border-b-0">
                        <td className="sticky left-0 z-10 border-r bg-background px-3 py-2 font-medium text-muted-foreground">
                          {label}
                        </td>
                        {uniqueDates.map((date) => {
                          const item = rowByKey.get(`${group.employeeId}|${date}`);
                          if (!item) {
                            return (
                              <td key={date} className="px-2 py-2 text-center text-muted-foreground">
                                —
                              </td>
                            );
                          }
                          return (
                            <td
                              key={date}
                              className={`px-2 py-2 ${item.row._isValid ? "" : "bg-red-50/50"}`}
                            >
                              {renderTimeInput(item.row, item.key, field, "h-8 w-full min-w-[5rem] text-xs")}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="border-t bg-slate-50/50">
                      <td className="sticky left-0 z-10 border-r bg-slate-50/50 px-3 py-2 font-medium">
                        Work hours
                      </td>
                      {uniqueDates.map((date) => {
                        const item = rowByKey.get(`${group.employeeId}|${date}`);
                        return (
                          <td key={date} className="px-2 py-2 text-center font-medium">
                            {item ? formatWorkHours(item.workHours) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="sticky left-0 z-10 border-r bg-background px-3 py-2 font-medium">
                        Status
                      </td>
                      {uniqueDates.map((date) => {
                        const item = rowByKey.get(`${group.employeeId}|${date}`);
                        return (
                          <td key={date} className="px-2 py-2 text-center">
                            {item ? renderStatusIcon(item.row) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderDataRow = (row: ParsedTimesheetRow, originalIndex: number, workHours: number) => {
    const isEditing = editingIndex === originalIndex;
    const rowKey = rowKeyFor(row);
    const employee = employeesById.get(row.employeeId);
    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "N/A";

    return (
      <TableRow key={originalIndex} className={`${row._isValid ? "" : "bg-red-50/50"} ${rowClass}`}>
        <TableCell className={`${cellClass} text-center`}>{renderStatusIcon(row)}</TableCell>
        <TableCell className={cellClass}>{row.csvPersonalId}</TableCell>
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
        <TableCell className={cellClass}>
          {isEditing ? renderTimeInput(row, rowKey, "timeIn", "w-28") : row.timeIn}
        </TableCell>
        <TableCell className={cellClass}>
          {isEditing ? (
            <div className="flex items-center gap-2">
              {renderTimeInput(row, rowKey, "teaStart", "w-24")}
              <span className="text-muted-foreground">–</span>
              {renderTimeInput(row, rowKey, "teaEnd", "w-24")}
            </div>
          ) : (
            row.teaStart && row.teaEnd ? `${row.teaStart}-${row.teaEnd}` : "N/A"
          )}
        </TableCell>
        <TableCell className={cellClass}>
          {isEditing ? (
            <div className="flex items-center gap-2">
              {renderTimeInput(row, rowKey, "lunchStart", "w-24")}
              <span className="text-muted-foreground">–</span>
              {renderTimeInput(row, rowKey, "lunchEnd", "w-24")}
            </div>
          ) : (
            row.lunchStart && row.lunchEnd ? `${row.lunchStart}-${row.lunchEnd}` : "N/A"
          )}
        </TableCell>
        <TableCell className={cellClass}>
          {isEditing ? renderTimeInput(row, rowKey, "timeOut", "w-28") : row.timeOut}
        </TableCell>
        <TableCell className={`${cellClass} whitespace-nowrap`}>
          <span className={row._isValid ? "text-slate-900" : "text-muted-foreground"}>
            {formatWorkHours(workHours)}
          </span>
        </TableCell>
        <TableCell className={`${cellClass} text-right`}>
          {isEditing ? (
            <ButtonIcon icon={<Save className="h-4 w-4" />} label="Done" onClick={() => setEditingIndex(null)} />
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

  const renderTableView = () => {
    const tableGroups = groupByEmployee ? groups : null;

    return (
      <div className="overflow-auto rounded-md border" style={{ maxHeight: "70vh" }}>
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
            <TableRow>
              <TableHead className={cellClass}>Status</TableHead>
              <TableHead className={cellClass}>{externalIdLabel}</TableHead>
              <TableHead className={cellClass}>Employee</TableHead>
              <TableHead className={cellClass}>Date</TableHead>
              <TableHead className={cellClass}>Time In</TableHead>
              <TableHead className={cellClass}>Tea</TableHead>
              <TableHead className={cellClass}>Lunch</TableHead>
              <TableHead className={cellClass}>Time Out</TableHead>
              <TableHead className={cellClass}>Work Hours</TableHead>
              <TableHead className={`${cellClass} text-right`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableGroups
              ? tableGroups.flatMap((g) => {
                  const validItems = g.items.filter((i) => i.row._isValid);
                  const validHoursSum = validItems.reduce((sum, i) => sum + i.workHours, 0);
                  return [
                    <TableRow key={`group-${g.employeeId}`} className="bg-slate-50/80">
                      <TableCell colSpan={10} className={compact ? "p-2" : "p-3"}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-semibold">{g.name}</span>
                            <span className="text-xs text-muted-foreground">#{g.customEmployeeId}</span>
                          </div>
                          <span className="text-xs font-medium">
                            {validItems.length} valid · {formatWorkHours(validHoursSum)}
                          </span>
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
    );
  };

  return (
    <div className="space-y-3">
      {viewMode === "cards" && renderCardsView()}
      {viewMode === "grid" && renderGridView()}
      {viewMode === "table" && renderTableView()}

      {!allRowsValid && (
        <p className="text-sm text-red-600">
          Some rows contain errors and will not be imported. Invalid rows are highlighted in red.
        </p>
      )}
    </div>
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
