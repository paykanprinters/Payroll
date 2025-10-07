"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle } from "lucide-react";
import { ParsedTimesheetRow } from "@/hooks/use-timesheet-import";
import { MockEmployee } from "@/lib/mock-data-interfaces";

interface ValidatedDataTableProps {
  validatedData: ParsedTimesheetRow[];
  employees: MockEmployee[];
  allRowsValid: boolean;
}

const ValidatedDataTable: React.FC<ValidatedDataTableProps> = ({ validatedData, employees, allRowsValid }) => {
  if (validatedData.length === 0) {
    return null;
  }

  return (
    <>
      <ScrollArea className="border rounded-md flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Personal ID (from CSV)</TableHead>
              <TableHead>Employee Name (Resolved)</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time In</TableHead>
              <TableHead>Tea Break</TableHead>
              <TableHead>Lunch Break</TableHead>
              <TableHead>Time Out</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validatedData.map((row, index) => (
              <TableRow key={index} className={!row._isValid ? "bg-red-50/50" : ""}>
                <TableCell className="text-center">
                  {row._isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                  ) : (
                    <div className="flex items-center justify-center text-red-500" title={row._errors.join("; ")}>
                      <XCircle className="h-4 w-4" />
                    </div>
                  )}
                </TableCell>
                <TableCell>{row.csvPersonalId}</TableCell>
                <TableCell>
                  {employees.find(emp => emp.id === row.employeeId)?.firstName}{" "}
                  {employees.find(emp => emp.id === row.employeeId)?.lastName || "N/A"}
                </TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.timeIn}</TableCell>
                <TableCell>{row.teaStart && row.teaEnd ? `${row.teaStart}-${row.teaEnd}` : "N/A"}</TableCell>
                <TableCell>{row.lunchStart && row.lunchEnd ? `${row.lunchStart}-${row.lunchEnd}` : "N/A"}</TableCell>
                <TableCell>{row.timeOut}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      {!allRowsValid && (
        <p className="text-sm text-red-500">Some rows contain errors and will not be imported. Hover over <XCircle className="inline h-3 w-3" /> for details.</p>
      )}
    </>
  );
};

export default ValidatedDataTable;