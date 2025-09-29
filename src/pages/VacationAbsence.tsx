"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLeaveData } from "@/hooks/use-leave-data";
import VacationAbsenceForm from "@/components/vacation-absence/VacationAbsenceForm";
import AbsenceCalendar from "@/components/vacation-absence/AbsenceCalendar";
import LeaveAnalytics from "@/components/vacation-absence/LeaveAnalytics";
import LeaveRecordsTable from "@/components/vacation-absence/LeaveRecordsTable";

const VacationAbsence: React.FC = () => {
  const {
    employees,
    leaveRecords,
    leaveTypeDistribution,
    monthlyLeaveData,
    getEmployeeName,
    addLeaveRecord,
  } = useLeaveData();

  const handleAddLeave = (newLeaveData: Omit<LeaveEntry, 'id'>) => {
    const newRecordWithId = { ...newLeaveData, id: `LEAVE-${Date.now()}` };
    addLeaveRecord(newRecordWithId);
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Vacation & Absence Calendar</h1>
      <p className="text-lg text-muted-foreground">
        Manage employee vacation, sick leave, and other absences.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Record New Absence</CardTitle>
            <CardDescription>
              Enter details for an employee's leave or absence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VacationAbsenceForm employees={employees} onAddLeave={handleAddLeave} />
          </CardContent>
        </Card>

        <AbsenceCalendar leaveRecords={leaveRecords} />
      </div>

      <LeaveAnalytics
        leaveTypeDistribution={leaveTypeDistribution}
        monthlyLeaveData={monthlyLeaveData}
      />

      <LeaveRecordsTable leaveRecords={leaveRecords} getEmployeeName={getEmployeeName} />

      <div className="mt-4 p-4 border rounded-lg bg-blue-50 text-blue-800">
        <h3 className="font-semibold text-lg mb-2">Important Note on Leave Management:</h3>
        <p className="text-sm">
          This interface provides the front-end for recording and visualizing employee leave. In a real-world system, leave balances (e.g., remaining annual leave days) would be managed by a backend service, which would also handle complex rules for leave accrual, approval workflows, and integration with payroll for unpaid leave deductions. Document uploads would typically go to secure cloud storage.
        </p>
      </div>
    </div>
  );
};

export default VacationAbsence;