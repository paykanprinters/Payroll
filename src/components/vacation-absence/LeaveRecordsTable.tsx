"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MockEmployee, LeaveEntry } from "@/lib/mock-data-interfaces"; // Updated import

interface LeaveRecordsTableProps {
  leaveRecords: LeaveEntry[];
  getEmployeeName: (employeeId: string) => string;
}

const LeaveRecordsTable: React.FC<LeaveRecordsTableProps> = ({ leaveRecords, getEmployeeName }) => {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>All Leave Records</CardTitle>
      </CardHeader>
      <CardContent>
        {leaveRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Total Days</TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Document</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{getEmployeeName(record.employeeId)}</TableCell>
                    <TableCell>{record.leaveType}</TableCell>
                    <TableCell>{record.startDate}</TableCell>
                    <TableCell>{record.endDate}</TableCell>
                    <TableCell>{record.totalDays}</TableCell>
                    <TableCell>{record.workingDays}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{record.reason || "N/A"}</TableCell>
                    <TableCell>
                      {record.documentUrl ? (
                        <a href={record.documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View</a>
                      ) : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No leave records found.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaveRecordsTable;