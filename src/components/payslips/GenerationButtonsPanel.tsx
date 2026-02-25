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
        className="w-full h-auto whitespace-normal py-3 text-sm leading-snug"
        onClick={onGenerateSelectedPeriod}
        disabled={disabledSelectedPeriod}
      >
        <FileStack className="mr-2 h-4 w-4 shrink-0" />
        <span>Generate payslips for selected period</span>
      </Button>
      <Button
        className="w-full h-auto whitespace-normal py-3 text-sm leading-snug"
        onClick={onGenerateAllCurrentPeriodDownload}
        disabled={disabledCurrentPeriod}
      >
        <FileStack className="mr-2 h-4 w-4 shrink-0" />
        <span>Export current period (ZIP)</span>
      </Button>
    </div>
  );
};

export default GenerationButtonsPanel;