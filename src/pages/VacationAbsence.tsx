"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CalendarDays, Activity, Palmtree, Thermometer, Clock3 } from "lucide-react";
import { LeaveEntry } from "@/lib/mock-data-interfaces";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import VacationAbsenceHeader from "@/components/vacation-absence/VacationAbsenceHeader";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import LeaveAnalytics from "@/components/vacation-absence/LeaveAnalytics";
import AbsenceCalendar from "@/components/vacation-absence/AbsenceCalendar";
import LeaveRecordsTable from "@/components/vacation-absence/LeaveRecordsTable";
import LeaveFiltersBar from "@/components/vacation-absence/LeaveFiltersBar";
import LeaveRecordDialog from "@/components/vacation-absence/LeaveRecordDialog";
import LeaveBalancesPanel from "@/components/vacation-absence/LeaveBalancesPanel";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  buildLeaveAdminSummary,
  filterLeaveRecords,
} from "@/lib/leave-admin-summary";

const VacationAbsence: React.FC = () => {
  const {
    employees,
    leaveRecords,
    addLeaveRecord,
    updateLeaveRecord,
    deleteLeaveRecord,
    approveLeaveRecord,
    rejectLeaveRecord,
    isLoadingLeaveRecords,
    isLoadingEmployees,
  } = usePayrollProcessor();

  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LeaveEntry | undefined>();
  const [employeeFilterId, setEmployeeFilterId] = useState("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [search, setSearch] = useState("");

  const getEmployeeName = React.useCallback(
    (employeeId: string) => {
      const employee = employees.find((emp) => emp.id === employeeId);
      return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown employee";
    },
    [employees]
  );

  const getEmployeeCustomId = React.useCallback(
    (employeeId: string) => {
      const employee = employees.find((emp) => emp.id === employeeId);
      return employee?.customEmployeeId || "N/A";
    },
    [employees]
  );

  const filteredLeaveRecords = useMemo(() => {
    const filtered = filterLeaveRecords(leaveRecords, employees, {
      employeeId: employeeFilterId,
      leaveType: leaveTypeFilter,
      status: statusFilter,
      dateStart,
      dateEnd,
      search,
    });
    return [...filtered].sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [leaveRecords, employees, employeeFilterId, leaveTypeFilter, statusFilter, dateStart, dateEnd, search]);

  const summary = useMemo(
    () => buildLeaveAdminSummary(filteredLeaveRecords),
    [filteredLeaveRecords]
  );

  const clearFilters = () => {
    setEmployeeFilterId("all");
    setLeaveTypeFilter("all");
    setStatusFilter("all");
    setDateStart("");
    setDateEnd("");
    setSearch("");
  };

  const openCreateDialog = () => {
    setEditingRecord(undefined);
    setRecordDialogOpen(true);
  };

  const openEditDialog = (record: LeaveEntry) => {
    setEditingRecord(record);
    setRecordDialogOpen(true);
  };

  const handleSubmitLeave = async (payload: Omit<LeaveEntry, "id"> | LeaveEntry) => {
    if ("id" in payload) {
      await updateLeaveRecord(payload);
      return;
    }
    await addLeaveRecord(payload);
  };

  const isLoading = isLoadingLeaveRecords || isLoadingEmployees;
  const addDisabled = !employees || employees.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <VacationAbsenceHeader onRecordAbsence={openCreateDialog} addDisabled={addDisabled} />

      {!isLoading && employees && employees.length > 0 ? (
        <LeaveBalancesPanel
          employees={employees}
          leaveRecords={leaveRecords}
          employeeFilterId={employeeFilterId}
        />
      ) : null}

      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Filter leave records by employee, type, status, date range, or search.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeaveFiltersBar
            employees={employees || []}
            employeeFilterId={employeeFilterId}
            onEmployeeFilterChange={setEmployeeFilterId}
            leaveTypeFilter={leaveTypeFilter}
            onLeaveTypeFilterChange={setLeaveTypeFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            dateStart={dateStart}
            onDateStartChange={setDateStart}
            dateEnd={dateEnd}
            onDateEndChange={setDateEnd}
            search={search}
            onSearchChange={setSearch}
            filteredCount={filteredLeaveRecords.length}
            totalCount={leaveRecords.length}
            onClear={clearFilters}
            onRefresh={() => window.dispatchEvent(new Event("appFocusRefresh"))}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-700" aria-label="Loading leave records" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
              <SummaryAccent variant="sky" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <CalendarDays className="h-4 w-4 text-sky-600" />
                  In view
                </CardTitle>
                <CardDescription className="text-xs">
                  {summary.uniqueEmployees} employee{summary.uniqueEmployees === 1 ? "" : "s"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total}</div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
              <SummaryAccent variant="rose" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Clock3 className="h-4 w-4 text-violet-600" />
                  Pending approval
                </CardTitle>
                <CardDescription className="text-xs">Staff requests awaiting review</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.pendingCount}</div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
              <SummaryAccent variant="emerald" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  Working days
                </CardTitle>
                <CardDescription className="text-xs">Total in filtered records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.workingDays}</div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
              <SummaryAccent variant="orange" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Palmtree className="h-4 w-4 text-orange-600" />
                  Annual leave
                </CardTitle>
                <CardDescription className="text-xs">Working days taken</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.annualDays}</div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
              <SummaryAccent variant="amber" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Thermometer className="h-4 w-4 text-amber-600" />
                  Sick leave
                </CardTitle>
                <CardDescription className="text-xs">Working days taken</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.sickDays}</div>
              </CardContent>
            </Card>
          </div>

          <LeaveAnalytics
            leaveTypeDistribution={summary.leaveTypeDistribution}
            monthlyLeaveData={summary.monthlyLeaveData}
          />

          <AbsenceCalendar leaveRecords={filteredLeaveRecords} recordCount={summary.total} />

          <ErrorBoundary fallbackTitle="Leave records error">
            <LeaveRecordsTable
              leaveRecords={filteredLeaveRecords}
              getEmployeeName={getEmployeeName}
              getEmployeeCustomId={getEmployeeCustomId}
              onEdit={openEditDialog}
              onApprove={approveLeaveRecord}
              onReject={rejectLeaveRecord}
              onDelete={deleteLeaveRecord}
            />
          </ErrorBoundary>
        </>
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Leave workflow</p>
          <p className="mt-2">
            Staff submit requests from the employee portal — they appear here as{" "}
            <strong>Pending</strong>. Approve or reject requests; only <strong>Approved</strong> leave
            affects payroll, timesheets, and balances. Admins can also record leave directly as
            approved. Edit or delete records when corrections are needed.
          </p>
        </CardContent>
      </Card>

      <LeaveRecordDialog
        open={recordDialogOpen}
        onOpenChange={setRecordDialogOpen}
        employees={employees || []}
        mode={editingRecord ? "admin-edit" : "admin-create"}
        editingRecord={editingRecord}
        onSubmit={handleSubmitLeave}
        defaultEmployeeId={employeeFilterId !== "all" ? employeeFilterId : undefined}
      />
    </div>
  );
};

export default VacationAbsence;
