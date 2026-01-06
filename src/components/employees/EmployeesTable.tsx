"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Download } from "lucide-react";
import { MockEmployee } from "@/lib/mock-data-interfaces";

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
      <div className="text-center py-8 text-muted-foreground">
        No employee data available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee ID</TableHead>
            <TableHead>Personal ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Job Title</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead className="text-right">Salary/Rate</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium">{employee.customEmployeeId}</TableCell>
              <TableCell>{employee.personalId || "N/A"}</TableCell>
              <TableCell>{employee.firstName} {employee.lastName}</TableCell>
              <TableCell>{employee.jobTitle}</TableCell>
              <TableCell>{employee.department || "N/A"}</TableCell>
              <TableCell>{employee.email}</TableCell>
              <TableCell>{employee.phoneNumber || "N/A"}</TableCell>
              <TableCell>{employee.startDate}</TableCell>
              <TableCell className="text-right">
                {employee.salary ? (
                  <div className="inline-flex items-center gap-2">
                    <Badge variant="secondary">Salary</Badge>
                    <span>{`R ${employee.salary.toLocaleString('en-ZA')}`}</span>
                  </div>
                ) : employee.hourlyRate ? (
                  <div className="inline-flex items-center gap-2">
                    <Badge variant="secondary">Hourly</Badge>
                    <span>{`R ${employee.hourlyRate.toLocaleString('en-ZA')} / hr`}</span>
                  </div>
                ) : (
                  "N/A"
                )}
              </TableCell>
              <TableCell className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onEdit(employee)}
                  disabled={isMutatingEmployee}
                  className="rounded-full"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onDownloadProfile(employee)}
                  disabled={isMutatingEmployee}
                  className="rounded-full"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => onDelete(employee)}
                  disabled={isMutatingEmployee}
                  className="rounded-full"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default EmployeesTable;