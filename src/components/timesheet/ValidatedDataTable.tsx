"use client";

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, PencilLine, Save, User } from "lucide-react";
import { ParsedTimesheetRow } from "@/hooks/use-timesheet-import";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ValidatedDataTableProps {
  validatedData: ParsedTimesheetRow[];
  employees: MockEmployee[];
  allRowsValid: boolean;
  compact?: boolean;
  onEditRow?: (index: number, updates: Partial<ParsedTimesheetRow>) => void;
  onResolveEmployee?: (index: number, employeeId: string) => void;
}

const ValidatedDataTable: React.FC<ValidatedDataTableProps> = ({
  validatedData,
  employees,
  allRowsValid,
  compact = false,
  onEditRow,
  onResolveEmployee,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  if (validatedData.length === 0) {
    return null;
  }

  const rowClass = compact ? "py-1" : "py-2";
  const cellClass = compact ? "p-2" : "p-4";

  return (
    <>
      <ScrollArea className="border rounded-md w-full h-[55vh]">
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
                <TableHead className={`${cellClass} text-right`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validatedData.map((row, index) => {
                const isEditing = editingIndex === index;
                const employee = employees.find((emp) => emp.id === row.employeeId);
                const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "N/A";

                return (
                  <TableRow key={index} className={`${row._isValid ? "" : "bg-red-50/50"} ${rowClass}`}>
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
                          <Select
                            onValueChange={(value) => onResolveEmployee?.(index, value)}
                            value={row.employeeId || ""}
                          >
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
                          value={row.date}
                          onChange={(e) => onEditRow?.(index, { date: e.target.value })}
                          className="w-40"
                        />
                      ) : (
                        row.date
                      )}
                    </TableCell>

                    {/* Time In */}
                    <TableCell className={cellClass}>
                      {isEditing ? (
                        <Input
                          type="time"
                          value={row.timeIn}
                          onChange={(e) => onEditRow?.(index, { timeIn: e.target.value })}
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
                            type="time"
                            value={row.teaStart || ""}
                            onChange={(e) => onEditRow?.(index, { teaStart: e.target.value })}
                            className="w-24"
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            type="time"
                            value={row.teaEnd || ""}
                            onChange={(e) => onEditRow?.(index, { teaEnd: e.target.value })}
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
                            type="time"
                            value={row.lunchStart || ""}
                            onChange={(e) => onEditRow?.(index, { lunchStart: e.target.value })}
                            className="w-24"
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            type="time"
                            value={row.lunchEnd || ""}
                            onChange={(e) => onEditRow?.(index, { lunchEnd: e.target.value })}
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
                          type="time"
                          value={row.timeOut}
                          onChange={(e) => onEditRow?.(index, { timeOut: e.target.value })}
                          className="w-28"
                        />
                      ) : (
                        row.timeOut
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className={`${cellClass} text-right`}>
                      {isEditing ? (
                        <ButtonIcon
                          icon={<Save className="h-4 w-4" />}
                          label="Save"
                          onClick={() => setEditingIndex(null)}
                        />
                      ) : (
                        <ButtonIcon
                          icon={<PencilLine className="h-4 w-4" />}
                          label="Edit"
                          onClick={() => setEditingIndex(index)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
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