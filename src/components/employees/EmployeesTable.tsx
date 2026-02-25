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
import { Download, Edit, Trash2, UserPlus } from "lucide-react";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { Card } from "@/components/ui/card";

interface EmployeesTableProps {
  employees: MockEmployee[];
  isMutatingEmployee: boolean;
  onEdit: (employee: MockEmployee) => void;
  onDownloadProfile: (employee: MockEmployee) => void;
  onDelete: (employee: MockEmployee) => void;
}

const EmployeesTable: React.FC<EmployeesTableProps> = ({
  employees,
  isMutatingEmployee,
  onEdit,
  onDownloadProfile,
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
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Start date</TableHead>
              <TableHead className="text-right">Pay basis</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => {
              const hasSalary = !!employee.salary && employee.salary > 0;
              const hasHourly = !!employee.hourlyRate && employee.hourlyRate > 0;

              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>
                        {employee.firstName} {employee.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {employee.customEmployeeId}
                        {employee.personalId ? ` • Clock ID ${employee.personalId}` : ""}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>{employee.jobTitle || "—"}</TableCell>
                  <TableCell>{employee.department || "—"}</TableCell>

                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{employee.email || "—"}</span>
                      <span className="text-xs text-muted-foreground">{employee.phoneNumber || "—"}</span>
                    </div>
                  </TableCell>

                  <TableCell>{employee.startDate || "—"}</TableCell>

                  <TableCell className="text-right">
                    {hasSalary ? (
                      <div className="inline-flex items-center gap-2">
                        <Badge variant="secondary">Salary</Badge>
                        <span>{`R ${employee.salary!.toLocaleString("en-ZA")}`}</span>
                      </div>
                    ) : hasHourly ? (
                      <div className="inline-flex items-center gap-2">
                        <Badge variant="secondary">Hourly</Badge>
                        <span>{`R ${employee.hourlyRate!.toLocaleString("en-ZA")} / hr`}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onEdit(employee)}
                        disabled={isMutatingEmployee}
                        className="bg-white"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onDownloadProfile(employee)}
                        disabled={isMutatingEmployee}
                        className="bg-white"
                        title="Download profile"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => onDelete(employee)}
                        disabled={isMutatingEmployee}
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
    </Card>
  );
};

export default EmployeesTable;