"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Printer, Download, Calculator } from "lucide-react";
import { MockPayslip } from "@/lib/mock-data-interfaces";
import PayeBreakdownDialog from "./PayeBreakdownDialog";

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
  const [showBreakdown, setShowBreakdown] = React.useState(false);
  const disabled = !selectedPayslip;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="w-full" disabled={disabled}>
            Generate Payslip
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="start" sideOffset={8} className="z-50">
          <DropdownMenuItem disabled={disabled} onSelect={onPrint}>
            <Printer className="mr-2 h-4 w-4" /> Print Payslip
          </DropdownMenuItem>
          <DropdownMenuItem disabled={disabled} onSelect={onDownload}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </DropdownMenuItem>
          <DropdownMenuItem disabled={disabled} onSelect={() => setShowBreakdown(true)}>
            <Calculator className="mr-2 h-4 w-4" /> PAYE Breakdown
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedPayslip && (
        <PayeBreakdownDialog
          open={showBreakdown}
          onOpenChange={setShowBreakdown}
          payslip={selectedPayslip}
        />
      )}
    </>
  );
};

export default IndividualPayslipActions;