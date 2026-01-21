"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLeaveData } from "@/hooks/use-leave-data";
import VacationAbsenceForm from "@/components/vacation-absence/VacationAbsenceForm";
import AbsenceCalendar from "@/components/vacation-absence/AbsenceCalendar";
import LeaveAnalytics from "@/components/vacation-absence/LeaveAnalytics";
import LeaveRecordsTable from "@/components/vacation-absence/LeaveRecordsTable";
import { LeaveEntry } from "@/lib/mock-data-interfaces";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import VacationAbsenceHeader from "@/components/vacation-absence/VacationAbsenceHeader";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import { CalendarDays, CheckCircle, Activity } from "lucide-react";

const VacationAbsence: React.FC = () => {
  const { employees, leaveRecords: initialLeaveRecords, isMockDataEnabled, isAuthenticated, isLoadingAuth } = usePayrollProcessor();

  const {
    leaveRecords,
    leaveTypeDistribution,
    monthlyLeaveData,
    getEmployeeName,
    getEmployeeCustomId,
    addLeaveRecord,
  } = useLeaveData({ initialLeaveRecords, employees, isMockDataEnabled, isAuthenticated, isLoadingAuth });

  const handleAddLeave = (newLeaveData: Omit<LeaveEntry, 'id'>) => {
    const newRecordWithId = { ...newLeaveData, id: `LEAVE-${Date.now()}` };
    addLeaveRecord(newRecordWithId);
  };

  // KPI calculations
  const totalRecords = leaveRecords.length;
  const totalWorkingDaysThisMonth = useMemo(
    () => monthlyLeaveData.reduce((sum, m) => sum + (m.days || 0), 0),
    [monthlyLeaveData]
  );
  const annualLeaveCount = useMemo(
    () => leaveTypeDistribution.find(d => d.name === "Annual Leave")?.value || 0,
    [leaveTypeDistribution]
  );
  const sickLeaveCount = useMemo(
    () => leaveTypeDistribution.find(d => d.name === "Sick Leave")?.value || 0,
    [leaveTypeDistribution]
  );

  return (
    <div className="flex flex-col gap-4">
      <VacationAbsenceHeader />

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="sky" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-600">
                <CalendarDays className="h-4 w-4" />
              </span>
              Total Leave Records
            </CardTitle>
            <CardDescription className="text-xs">All recorded absences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecords}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="emerald" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                <CheckCircle className="h-4 w-4" />
              </span>
              Working Days Taken (Monthly)
            </CardTitle>
            <CardDescription className="text-xs">Sum for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWorkingDaysThisMonth}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="orange" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-orange-100 text-orange-600">
                <CalendarDays className="h-4 w-4" />
              </span>
              Annual Leave
            </CardTitle>
            <CardDescription className="text-xs">Total working days taken</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{annualLeaveCount}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="amber" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-600">
                <Activity className="h-4 w-4" />
              </span>
              Sick Leave
            </CardTitle>
            <CardDescription className="text-xs">Total working days taken</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sickLeaveCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics */}
      <LeaveAnalytics
        leaveTypeDistribution={leaveTypeDistribution}
        monthlyLeaveData={monthlyLeaveData}
      />

      {/* Form + Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="sky" />
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

      <LeaveRecordsTable leaveRecords={leaveRecords} getEmployeeName={getEmployeeName} getEmployeeCustomId={getEmployeeCustomId} />

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