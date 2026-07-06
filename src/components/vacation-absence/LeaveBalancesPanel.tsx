"use client";

import React, { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { LeaveEntry, MockEmployee } from "@/lib/mock-data-interfaces";
import { computeEmployeeLeaveBalance } from "@/lib/leave-accrual";

interface LeaveBalancesPanelProps {
  employees: MockEmployee[];
  leaveRecords: LeaveEntry[];
  employeeFilterId?: string;
}

const LeaveBalancesPanel: React.FC<LeaveBalancesPanelProps> = ({
  employees,
  leaveRecords,
  employeeFilterId = "all",
}) => {
  const rows = useMemo(() => {
    const list =
      employeeFilterId === "all"
        ? employees
        : employees.filter((employee) => employee.id === employeeFilterId);

    return list
      .map((employee) => ({
        employee,
        balance: computeEmployeeLeaveBalance(employee, leaveRecords, new Date()),
      }))
      .sort((a, b) =>
        `${a.employee.firstName} ${a.employee.lastName}`.localeCompare(
          `${b.employee.firstName} ${b.employee.lastName}`
        )
      );
  }, [employees, leaveRecords, employeeFilterId]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <Card className="rounded-xl border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Leave balances (BCEA accrual)</CardTitle>
        <CardDescription>
          Entitlements accrue from each employee&apos;s leave cycle. Balances reflect approved leave
          only; pending requests are not deducted until approved.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Annual cycle</TableHead>
              <TableHead className="text-right">Annual remaining</TableHead>
              <TableHead className="text-right">Sick remaining</TableHead>
              <TableHead className="text-right">Family remaining</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ employee, balance }) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <div className="font-medium">
                    {employee.firstName} {employee.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">{employee.customEmployeeId}</div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(parseISO(balance.annual.cycleStart), "dd MMM yyyy")} –{" "}
                  {format(parseISO(balance.annual.cycleEnd), "dd MMM yyyy")}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {balance.annual.remaining}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {balance.annual.taken} of {balance.annual.entitled} used
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {balance.sick.remaining}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {balance.sick.taken} of {balance.sick.entitled} used
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {balance.familyResponsibility.remaining}
                </TableCell>
                <TableCell>
                  {balance.sick.inQualifyingPeriod ? (
                    <Badge variant="secondary">Sick qualifying</Badge>
                  ) : (
                    <Badge variant="outline">Active</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default LeaveBalancesPanel;
