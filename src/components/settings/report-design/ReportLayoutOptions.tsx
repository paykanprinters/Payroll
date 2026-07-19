"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { REPORT_PAPER_MM } from "@/lib/report-paper";

type Props = {
  settings: ReportDesignSettings;
  onPaperSizeChange: (value: ReportDesignSettings["defaultReportPaperSize"]) => void;
};

const ReportLayoutOptions: React.FC<Props> = ({ settings, onPaperSizeChange }) => {
  const paper = REPORT_PAPER_MM[settings.defaultReportPaperSize];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Layout</h3>
      <div>
        <Label htmlFor="defaultReportPaperSize">Paper size</Label>
        <Select
          value={settings.defaultReportPaperSize}
          onValueChange={(value) =>
            onPaperSizeChange(value as ReportDesignSettings["defaultReportPaperSize"])
          }
        >
          <SelectTrigger id="defaultReportPaperSize" className="mt-1 w-full max-w-[280px]">
            <SelectValue placeholder="Select paper size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="A4">A4 — {REPORT_PAPER_MM.A4.subtitle}</SelectItem>
            <SelectItem value="Letter">US Letter — {REPORT_PAPER_MM.Letter.subtitle}</SelectItem>
            <SelectItem value="A5">A5 — {REPORT_PAPER_MM.A5.subtitle}</SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-2 text-xs text-muted-foreground">
          Preview page: <span className="font-medium text-foreground">{paper.label}</span> ({paper.subtitle}).
          A5 is noticeably smaller; Letter is slightly wider and shorter than A4.
        </p>
      </div>
    </div>
  );
};

export default ReportLayoutOptions;
