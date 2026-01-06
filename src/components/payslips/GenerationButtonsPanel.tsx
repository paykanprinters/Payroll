"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FileStack } from "lucide-react";

interface GenerationButtonsPanelProps {
  onGenerateSelectedPeriod: () => void;
  onGenerateAllCurrentPeriodDownload: () => void;
  disabledSelectedPeriod: boolean;
  disabledCurrentPeriod: boolean;
}

const GenerationButtonsPanel: React.FC<GenerationButtonsPanelProps> = ({
  onGenerateSelectedPeriod,
  onGenerateAllCurrentPeriodDownload,
  disabledSelectedPeriod,
  disabledCurrentPeriod,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <Button
        className="w-full"
        onClick={onGenerateSelectedPeriod}
        disabled={disabledSelectedPeriod}
      >
        <FileStack className="mr-2 h-4 w-4" /> Generate Payslips for Selected Period
      </Button>
      <Button
        className="w-full"
        onClick={onGenerateAllCurrentPeriodDownload}
        disabled={disabledCurrentPeriod}
      >
        <FileStack className="mr-2 h-4 w-4" /> Generate All for Current Period (Download)
      </Button>
    </div>
  );
};

export default GenerationButtonsPanel;