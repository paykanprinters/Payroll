"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Mail } from "lucide-react";
import IndividualPayslipActions from "./IndividualPayslipActions";
import { MockPayslip } from "@/lib/mock-data-interfaces";

interface IndividualActionsPanelProps {
  selectedPayslip: MockPayslip | undefined;
  selectedEmployeeId: string;
  onSelectCurrentPeriodPayslip: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onEmail?: () => void;
}

const IndividualActionsPanel: React.FC<IndividualActionsPanelProps> = ({
  selectedPayslip,
  selectedEmployeeId,
  onSelectCurrentPeriodPayslip,
  onPrint,
  onDownload,
  onEmail,
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

      {onEmail && (
        <Button variant="outline" onClick={onEmail} disabled={!selectedPayslip}>
          <Mail className="mr-2 h-4 w-4" /> Email Payslip to Employee
        </Button>
      )}
    </div>
  );
};

export default IndividualActionsPanel;