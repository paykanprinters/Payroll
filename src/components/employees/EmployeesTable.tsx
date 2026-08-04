"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Edit, Mail, Trash2, UserPlus } from "lucide-react";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EmployeesTableProps {
  employees: MockEmployee[];
  isMutatingEmployee: boolean;
  onEdit: (employee: MockEmployee) => void;
  onDownloadProfile: (employee: MockEmployee) => void;
  onSendWelcome: (employee: MockEmployee) => void;
  onDelete: (employee: MockEmployee) => void;
}

const EmployeesTable: React.FC<EmployeesTableProps> = ({
  employees,
  isMutatingEmployee,
  onEdit,
  onDownloadProfile,
  onSendWelcome,
  onDelete,
}) => {
  if (employees.length === 0) {
    return (
      <Card className="rounded-2xl border bg-white p-10 shadow-sm">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="rounded-2xl bg-muted p-3 ring-1 ring-border">
            <UserPlus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No employees found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try clearing filters or add your first employee to start running payroll.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Employee directory</CardTitle>
        <CardDescription>
          {employees.length} employee{employees.length === 1 ? "" : "s"} in the current view.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="hidden md:table-cell">Role</TableHead>
                <TableHead className="hidden lg:table-cell">Department</TableHead>
                <TableHead className="hidden xl:table-cell">Contact</TableHead>
                <TableHead className="hidden sm:table-cell">Start</TableHead>
                <TableHead>Portal</TableHead>
                <TableHead className="text-right">Pay</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => {
                const hasSalary = !!employee.salary && employee.salary > 0;
                const hasHourly = !!employee.hourlyRate && employee.hourlyRate > 0;
                const portalEnabled = employee.portalAccess === true;
                const portalLinked = !!employee.userId;

                return (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      <div className="flex min-w-[160px] flex-col">
                        <span>
                          {employee.firstName} {employee.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {employee.customEmployeeId}
                          {employee.personalId ? ` · Clock ${employee.personalId}` : ""}
                        </span>
                        <span className="mt-1 text-xs text-muted-foreground md:hidden">
                          {employee.jobTitle || "—"}
                          {employee.department ? ` · ${employee.department}` : ""}
                        </span>
                        <span className="mt-1 text-xs text-muted-foreground xl:hidden">
                          {employee.email || employee.phoneNumber || "—"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">{employee.jobTitle || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{employee.department || "—"}</TableCell>

                    <TableCell className="hidden xl:table-cell">
                      <div className="flex min-w-[180px] flex-col">
                        <span className="text-sm">{employee.email || "—"}</span>
                        <span className="text-xs text-muted-foreground">{employee.phoneNumber || "—"}</span>
                      </div>
                    </TableCell>

                    <TableCell className="hidden sm:table-cell">{employee.startDate || "—"}</TableCell>

                    <TableCell>
                      <div className="flex min-w-[88px] flex-col gap-1">
                        <Badge variant={portalEnabled ? "default" : "secondary"} className="w-fit">
                          {portalEnabled ? "Enabled" : "Off"}
                        </Badge>
                        {portalEnabled && (
                          <Badge variant={portalLinked ? "outline" : "secondary"} className="w-fit text-[10px]">
                            {portalLinked ? "Linked" : "Unlinked"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      {hasSalary ? (
                        <div className="inline-flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                          <Badge variant="secondary">Salary</Badge>
                          <span className="text-sm">{`R ${employee.salary!.toLocaleString("en-ZA")}`}</span>
                        </div>
                      ) : hasHourly ? (
                        <div className="inline-flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                          <Badge variant="secondary">Hourly</Badge>
                          <span className="text-sm">{`R ${employee.hourlyRate!.toLocaleString("en-ZA")}/hr`}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1 sm:gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onEdit(employee)}
                          disabled={isMutatingEmployee}
                          className="h-8 w-8 bg-white sm:h-9 sm:w-9"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onDownloadProfile(employee)}
                          disabled={isMutatingEmployee}
                          className="hidden h-8 w-8 bg-white sm:inline-flex sm:h-9 sm:w-9"
                          title="Download profile"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onSendWelcome(employee)}
                          disabled={isMutatingEmployee}
                          className="h-8 w-8 bg-white sm:h-9 sm:w-9"
                          title="Send Welcome Package (email/SMS)"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => onDelete(employee)}
                          disabled={isMutatingEmployee}
                          className="h-8 w-8 sm:h-9 sm:w-9"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeesTable;
