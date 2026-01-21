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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="w-full" disabled={!selectedPayslip}>
            Generate Payslip
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-50">
          <DropdownMenuItem onClick={onPrint} disabled={!selectedPayslip}>
            <Printer className="mr-2 h-4 w-4" /> Print Payslip
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDownload} disabled={!selectedPayslip}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowBreakdown(true)} disabled={!selectedPayslip}>
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