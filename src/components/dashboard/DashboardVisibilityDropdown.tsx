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

interface DashboardVisibilityDropdownProps {
  // No props needed as it uses the hook directly
}

const widgetLabels: Record<keyof DashboardWidgetVisibility, string> = {
  summaryCards: "Summary Cards (Top Row)",
  upcomingPayrollCard: "Upcoming Payroll Card",
  toDoListCard: "To-Do List Card",
  monthlyPayrollOverviewChart: "Monthly Payroll Overview Chart",
  currentDateCalendar: "Current Date Calendar",
  employeeJobTitleDistributionChart: "Employee Job Title Distribution Chart",
  totalDeductionsBreakdownChart: "Total Deductions Breakdown Chart",
  averageNetPayTrendChart: "Average Net Pay Trend Chart",
  employeeSalaryDistributionChart: "Employee Salary Distribution Chart",
  monthlyLeaveDaysTakenChart: "Monthly Leave Days Taken Chart",
  quickActionsCard: "Quick Actions Card",
};

const DashboardVisibilityDropdown: React.FC<DashboardVisibilityDropdownProps> = () => {
  const { visibleWidgets, toggleWidgetVisibility, resetToDefaults, isLoadingSettings } = useDashboardSettings();
  const { user } = useAuth();

  if (isLoadingSettings || !visibleWidgets) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  // Determine if the current user is an Admin to enable/disable reset button
  const isAdmin = user?.role === 'Admin';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Customize View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
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
          checked={false} // This is a dummy item for the button, always unchecked
          onCheckedChange={resetToDefaults}
          disabled={!isAdmin} // Only Admin can reset to defaults
        >
          <Button variant="ghost" size="sm" className="w-full justify-start p-0 h-auto" disabled={!isAdmin}>
            <Settings className="mr-2 h-4 w-4" /> Reset to Default
          </Button>
        </DropdownMenuCheckboxItem>
        {!isAdmin && (
          <DropdownMenuLabel className="text-xs text-muted-foreground mt-2">
            Only Admins can reset to default settings.
          </DropdownMenuLabel>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DashboardVisibilityDropdown;