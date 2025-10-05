"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileText, Printer, Download } from "lucide-react";
import { MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";

interface IndividualIrp5ActionsProps {
  isIrp5ExportEnabled: boolean;
  selectedEmployee: MockEmployee | undefined;
  selectedPayslip: MockPayslip | undefined;
  onPrintIrp5: () => void;
  onDownloadIrp5: () => void;
}

const IndividualIrp5Actions: React.FC<IndividualIrp5ActionsProps> = ({
  isIrp5ExportEnabled,
  selectedEmployee,
  selectedPayslip,
  onPrintIrp5,
  onDownloadIrp5,
}) => {
  if (!isIrp5ExportEnabled) {
    return null;
  }

  const isDisabled = !selectedEmployee || !selectedPayslip;

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2 items-end">
      <div className="md:col-span-1">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Individual IRP5 Export
        </label>
        <p className="text-xs text-muted-foreground mt-1">
          Generate IRP5 for the selected employee and payslip.
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="w-full" variant="outline" disabled={isDisabled}>
            <FileText className="mr-2 h-4 w-4" /> Generate IRP5 Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onPrintIrp5} disabled={isDisabled}>
            <Printer className="mr-2 h-4 w-4" /> Print IRP5
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDownloadIrp5} disabled={isDisabled}>
            <Download className="mr-2 h-4 w-4" /> Download IRP5 PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default IndividualIrp5Actions;