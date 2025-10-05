"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Printer, Download } from "lucide-react";
import { MockPayslip } from "@/lib/mock-data-interfaces";

interface IndividualPayslipActionsProps {
  selectedPayslip: MockPayslip | undefined;
  onPrint: () => void;
  onDownload: () => void;
}

const IndividualPayslipActions: React.FC<IndividualPayslipActionsProps> = ({
  selectedPayslip,
  onPrint,
  onDownload,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="w-full" disabled={!selectedPayslip}>
          Generate Payslip
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onPrint} disabled={!selectedPayslip}>
          <Printer className="mr-2 h-4 w-4" /> Print Payslip
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDownload} disabled={!selectedPayslip}>
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default IndividualPayslipActions;