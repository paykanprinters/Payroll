"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { ReportDesignSettings } from "@/lib/report-design-interfaces";

type Props = {
  settings: ReportDesignSettings;
  onChange: (patch: Partial<ReportDesignSettings>) => void;
};

const ReportPageChromeOptions: React.FC<Props> = ({ settings, onChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Page frame</h3>
      <p className="text-xs text-muted-foreground">
        Controls the rounded sheet used in preview, print, and PDF — including how far the border sits
        from the paper edge.
      </p>

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="showPageBorder">Show page border</Label>
          <p className="text-xs text-muted-foreground">Outline around each sheet.</p>
        </div>
        <Switch
          id="showPageBorder"
          checked={settings.showPageBorder}
          onCheckedChange={(checked) => onChange({ showPageBorder: checked })}
        />
      </div>

      <div>
        <Label htmlFor="pageBorderRadiusPx">
          Corner radius ({settings.pageBorderRadiusPx}px)
        </Label>
        <Slider
          id="pageBorderRadiusPx"
          min={0}
          max={28}
          step={1}
          value={[settings.pageBorderRadiusPx]}
          onValueChange={(value) => onChange({ pageBorderRadiusPx: value[0] })}
          className="mt-3"
        />
        <p className="mt-2 text-xs text-muted-foreground">0 = square corners. Applies to the sheet clip.</p>
      </div>

      <div>
        <Label htmlFor="pageSheetInsetMm">
          Border to page edge ({settings.pageSheetInsetMm} mm)
        </Label>
        <Slider
          id="pageSheetInsetMm"
          min={2}
          max={24}
          step={1}
          value={[settings.pageSheetInsetMm]}
          onValueChange={(value) => onChange({ pageSheetInsetMm: value[0] })}
          className="mt-3"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          How far the sheet border sits inside the paper edge.
        </p>
      </div>

      <div>
        <Label htmlFor="pageContentPaddingMm">
          Content padding ({settings.pageContentPaddingMm} mm)
        </Label>
        <Slider
          id="pageContentPaddingMm"
          min={4}
          max={20}
          step={1}
          value={[settings.pageContentPaddingMm]}
          onValueChange={(value) => onChange({ pageContentPaddingMm: value[0] })}
          className="mt-3"
        />
        <p className="mt-2 text-xs text-muted-foreground">Space inside the border before report content.</p>
      </div>

      <div>
        <Label htmlFor="pageBorderWidthPx">
          Border width ({settings.pageBorderWidthPx}px)
        </Label>
        <Slider
          id="pageBorderWidthPx"
          min={0.5}
          max={4}
          step={0.5}
          value={[settings.pageBorderWidthPx]}
          onValueChange={(value) => onChange({ pageBorderWidthPx: value[0] })}
          className="mt-3"
          disabled={!settings.showPageBorder}
        />
      </div>
    </div>
  );
};

export default ReportPageChromeOptions;
