"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";

interface EmployeePayslipSelectorProps {
  employees: MockEmployee[];
  payslips: MockPayslip[];
  selectedEmployeeId: string;
  setSelectedEmployeeId: (id: string) => void;
  selectedPayslipId: string;
  setSelectedPayslipId: (id: string) => void;
  filteredPayslipsForEmployee: MockPayslip[];
}

const EmployeePayslipSelector: React.FC<EmployeePayslipSelectorProps> = ({
  employees,
  payslips,
  selectedEmployeeId,
  setSelectedEmployeeId,
  selectedPayslipId,
  setSelectedPayslipId,
  filteredPayslipsForEmployee,
}) => {
  return (
    <>
      <div className="lg:col-span-2">
        <label htmlFor="employee-select" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Select Employee
        </label>
        <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId}>
          <SelectTrigger id="employee-select" className="mt-1">
            <SelectValue placeholder="Select an employee" />
          </SelectTrigger>
          <SelectContent side="bottom" align="start" sideOffset={8}>
            {employees.length > 0 ? (
              employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.customEmployeeId})
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-employees" disabled>
                No employees available (enable mock data)
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="payslip-select" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Select Payslip
        </label>
        <Select onValueChange={setSelectedPayslipId} value={selectedPayslipId} disabled={!selectedEmployeeId || filteredPayslipsForEmployee.length === 0}>
          <SelectTrigger id="payslip-select" className="mt-1">
            <SelectValue placeholder="Select a payslip" />
          </SelectTrigger>
          <SelectContent side="bottom" align="start" sideOffset={8}>
            {filteredPayslipsForEmployee.length > 0 ? (
              filteredPayslipsForEmployee.map((payslip) => (
                <SelectItem key={payslip.id} value={payslip.id}>
                  {payslip.payPeriod}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-payslips" disabled>
                No payslips for this employee
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </>
  );
};

export default EmployeePayslipSelector;