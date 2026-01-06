"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarCheck } from "lucide-react";
import IndividualPayslipActions from "./IndividualPayslipActions";
import { MockPayslip } from "@/lib/mock-data-interfaces";

interface IndividualActionsPanelProps {
  selectedPayslip: MockPayslip | undefined;
  selectedEmployeeId: string;
  onSelectCurrentPeriodPayslip: () => void;
  onPrint: () => void;
  onDownload: () => void;
}

const IndividualActionsPanel: React.FC<IndividualActionsPanelProps> = ({
  selectedPayslip,
  selectedEmployeeId,
  onSelectCurrentPeriodPayslip,
  onPrint,
  onDownload,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="outline"
        onClick={onSelectCurrentPeriodPayslip}
        disabled={!selectedEmployeeId}
      >
        <CalendarCheck className="mr-2 h-4 w-4" /> Select Current Period Payslip
      </Button>

      <IndividualPayslipActions
        selectedPayslip={selectedPayslip}
        onPrint={onPrint}
        onDownload={onDownload}
      />
    </div>
  );
};

export default IndividualActionsPanel;