"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CalendarIcon, Printer, Download } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { MockPayslip } from "@/lib/mock-data-interfaces";

interface BulkPayslipActionsProps {
  payslips: MockPayslip[];
  selectedPayPeriodDate: Date | undefined;
  setSelectedPayPeriodDate: (date: Date | undefined) => void;
  onPrintAll: () => void;
  onDownloadAll: () => void;
}

const BulkPayslipActions: React.FC<BulkPayslipActionsProps> = ({
  payslips,
  selectedPayPeriodDate,
  setSelectedPayPeriodDate,
  onPrintAll,
  onDownloadAll,
}) => {
  return (
    <>
      <div>
        <label htmlFor="pay-period-select" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Select Pay Period for Bulk Payslips
        </label>
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
              {selectedPayPeriodDate ? format(selectedPayPeriodDate, "MMM yyyy") : <span>Pick a month</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedPayPeriodDate}
              onSelect={setSelectedPayPeriodDate}
              initialFocus
              captionLayout="dropdown-buttons" // Allows month/year selection
              fromYear={2020}
              toYear={2030}
            />
          </PopoverContent>
        </Popover>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="w-full" variant="outline" disabled={!selectedPayPeriodDate || payslips.length === 0}>
            Bulk Payslips
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onPrintAll} disabled={!selectedPayPeriodDate || payslips.length === 0}>
            <Printer className="mr-2 h-4 w-4" /> Print All Payslips
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDownloadAll} disabled={!selectedPayPeriodDate || payslips.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Download All Payslips PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default BulkPayslipActions;