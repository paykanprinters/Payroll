"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Settings, Eye } from "lucide-react";
import { useDashboardSettings, DashboardWidgetVisibility } from "@/hooks/use-dashboard-settings";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardVisibilityDropdownProps {
  isMockDataEnabled: boolean;
}

const widgetLabels: Record<keyof DashboardWidgetVisibility, string> = {
  summaryCards: "Summary Cards (Top Row)",
  upcomingPayrollCard: "Upcoming Payroll Card",
  toDoListCard: "To-Do List Card",
  payrollRunCard: "Payroll Run Card",

  monthlyPayrollOverviewChart: "Monthly Payroll Overview Chart",
  averageNetPayTrendChart: "Average Net Pay Trend Chart",
  totalDeductionsBreakdownChart: "Total Deductions Breakdown Chart",

  employeeJobTitleDistributionChart: "Employee Job Title Distribution Chart",
  employeeSalaryDistributionChart: "Employee Salary Distribution Chart",
  monthlyLeaveDaysTakenChart: "Monthly Leave Days Taken Chart",

  timesheetStatusChart: "Timesheet Status Chart",
  savingsStatusChart: "Savings Status Chart",
  loansOverviewCard: "Loans Overview Card",

  currentDateCalendar: "Current Date Calendar",
  quickActionsCard: "Quick Actions Card",
};

const DashboardVisibilityDropdown: React.FC<DashboardVisibilityDropdownProps> = ({ isMockDataEnabled }) => {
  const { visibleWidgets, toggleWidgetVisibility, resetToDefaults, isLoadingSettings } = useDashboardSettings({ isMockDataEnabled });
  const { user } = useAuth();

  if (isLoadingSettings || !visibleWidgets) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  const isAdmin = user?.role === "Admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Customize View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <ScrollArea className="h-72 max-h-[calc(100vh-120px)]">
          <DropdownMenuLabel>Dashboard Widgets</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.entries(widgetLabels).map(([key, label]) => (
            <DropdownMenuCheckboxItem
              key={key}
              checked={visibleWidgets[key as keyof DashboardWidgetVisibility]}
              onCheckedChange={() => toggleWidgetVisibility(key as keyof DashboardWidgetVisibility)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={false}
            onCheckedChange={resetToDefaults}
            disabled={!isAdmin}
          >
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start p-0 h-auto"
              disabled={!isAdmin}
            >
              <Settings className="mr-2 h-4 w-4" /> Reset to Default
            </Button>
          </DropdownMenuCheckboxItem>
          {!isAdmin && (
            <DropdownMenuLabel className="text-xs text-muted-foreground mt-2">
              Only Admins can reset to default settings.
            </DropdownMenuLabel>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DashboardVisibilityDropdown;