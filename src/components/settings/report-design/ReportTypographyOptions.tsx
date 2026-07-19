"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { ReportDesignSettings } from "@/lib/report-design-interfaces";

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 20;

type Props = {
  settings: ReportDesignSettings;
  onFontSizeChange: (size: number) => void;
};

const ReportTypographyOptions: React.FC<Props> = ({ settings, onFontSizeChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Typography</h3>
      <div>
        <Label htmlFor="reportContentFontSize">
          Report body font size ({settings.reportContentFontSize}px)
        </Label>
        <Slider
          id="reportContentFontSize"
          min={MIN_FONT_SIZE}
          max={MAX_FONT_SIZE}
          step={1}
          value={[settings.reportContentFontSize]}
          onValueChange={(value) => onFontSizeChange(value[0])}
          className="mt-3"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Affects table and body text in Reports preview, PDF, and print. IRP5 certificate font is
          set under Tax Liabilities.
        </p>
      </div>
    </div>
  );
};

export default ReportTypographyOptions;
