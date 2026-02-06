"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CalendarIcon, Printer, Download } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { calculatePayPeriodDetails } from "@/lib/payroll-calculations";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { MockPayslip } from "@/lib/mock-data-interfaces";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface BulkPayslipActionsProps {
  payslips: MockPayslip[];
  selectedPayPeriodDate: Date | undefined;
  setSelectedPayPeriodDate: (date: Date | undefined) => void;
  bulkGenerationMode: "monthly" | "weekly";
  setBulkGenerationMode: (mode: "monthly" | "weekly") => void;
  onPrintAll: (action: 'print' | 'download', mode: "monthly" | "weekly", auditLevel: "minimal" | "standard" | "detailed") => void;
  onDownloadAll: (action: 'print' | 'download', mode: "monthly" | "weekly", auditLevel: "minimal" | "standard" | "detailed") => void;
  auditLevel: "minimal" | "standard" | "detailed";
  setAuditLevel: (level: "minimal" | "standard" | "detailed") => void;
}

const BulkPayslipActions: React.FC<BulkPayslipActionsProps> = ({
  payslips,
  selectedPayPeriodDate,
  setSelectedPayPeriodDate,
  bulkGenerationMode,
  setBulkGenerationMode,
  onPrintAll,
  onDownloadAll,
  auditLevel,
  setAuditLevel,
}) => {
  const { payCycleSettings } = usePayrollProcessor({ silent: true });

  const periodHint = React.useMemo(() => {
    if (!selectedPayPeriodDate) return null;

    const cutOffDay = payCycleSettings?.cutOffDay ?? 2; // Default Tuesday
    const payDayOffset = payCycleSettings?.payDayOffset ?? 0;
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const cutOffName = dayNames[cutOffDay === 7 ? 0 : cutOffDay];

    if (bulkGenerationMode === "weekly") {
      const { payPeriodStart, payPeriodEnd } = calculatePayPeriodDetails(
        selectedPayPeriodDate,
        "Weekly",
        cutOffDay,
        payDayOffset
      );
      return `Window: ${format(payPeriodStart, "yyyy-MM-dd")} → ${format(payPeriodEnd, "yyyy-MM-dd")} (cut-off: ${cutOffName})`;
    }

    // Monthly
    const start = startOfMonth(selectedPayPeriodDate);
    const end = endOfMonth(selectedPayPeriodDate);
    return `Window: ${format(start, "yyyy-MM-dd")} → ${format(end, "yyyy-MM-dd")}`;
  }, [selectedPayPeriodDate, bulkGenerationMode, payCycleSettings]);

  return (
    <>
      {/* Bulk Generation Mode first */}
      <div>
        <Label htmlFor="bulk-mode-select" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Bulk Generation Mode
        </Label>
        <Select onValueChange={(value) => setBulkGenerationMode(value as "monthly" | "weekly")} value={bulkGenerationMode}>
          <SelectTrigger id="bulk-mode-select" className="mt-1">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent side="bottom" align="start" sideOffset={8}>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Select Pay Period second */}
      <div>
        <Label htmlFor="pay-period-select" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Select Pay Period for Bulk Payslips
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal mt-1",
                !selectedPayPeriodDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedPayPeriodDate ? format(selectedPayPeriodDate, bulkGenerationMode === "monthly" ? "MMM yyyy" : "PPP") : <span>Pick a {bulkGenerationMode === "monthly" ? "month" : "date"}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50" sideOffset={8}>
            <Calendar
              mode="single"
              selected={selectedPayPeriodDate}
              onSelect={setSelectedPayPeriodDate}
              initialFocus
              captionLayout="dropdown-buttons"
              fromYear={2020}
              toYear={2030}
            />
          </PopoverContent>
        </Popover>
        {periodHint && (
          <p className="text-xs text-muted-foreground mt-2">{periodHint}</p>
        )}
      </div>

      {/* Audit Level */}
      <div>
        <Label htmlFor="audit-level-select" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Audit Level (for report sections)
        </Label>
        <Select onValueChange={(value) => setAuditLevel(value as "minimal" | "standard" | "detailed")} value={auditLevel}>
          <SelectTrigger id="audit-level-select" className="mt-1">
            <SelectValue placeholder="Select level" />
          </SelectTrigger>
          <SelectContent side="bottom" align="start" sideOffset={8}>
            <SelectItem value="minimal">Minimal</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="detailed">Detailed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="w-full" variant="outline" disabled={!selectedPayPeriodDate || payslips.length === 0}>
            Bulk Payslips
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-50">
          <DropdownMenuItem onClick={() => onPrintAll('print', bulkGenerationMode, auditLevel)} disabled={!selectedPayPeriodDate || payslips.length === 0}>
            <Printer className="mr-2 h-4 w-4" /> Print All Payslips
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDownloadAll('download', bulkGenerationMode, auditLevel)} disabled={!selectedPayPeriodDate || payslips.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Download All Payslips PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default BulkPayslipActions;