"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReportDesignSettings, ReportLogoFit } from "@/lib/report-design-interfaces";
import { resolveCompanyLogoSource } from "@/lib/document-logo";

type Props = {
  settings: ReportDesignSettings;
  companyLogoUrl?: string | null;
  onToggle: (key: "includeCompanyLogo" | "includeCompanyDetails", checked: boolean) => void;
  onChange: (patch: Partial<ReportDesignSettings>) => void;
};

const ReportHeaderOptions: React.FC<Props> = ({
  settings,
  companyLogoUrl,
  onToggle,
  onChange,
}) => {
  const previewUrl = resolveCompanyLogoSource(companyLogoUrl);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Header content</h3>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="includeCompanyLogo">Show company logo</Label>
          <p className="text-xs text-muted-foreground">Uses the logo from Company Details.</p>
        </div>
        <Switch
          id="includeCompanyLogo"
          checked={settings.includeCompanyLogo}
          onCheckedChange={(checked) => onToggle("includeCompanyLogo", checked)}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="includeCompanyDetails">Show company details</Label>
          <p className="text-xs text-muted-foreground">Name, address, reg / VAT, contact.</p>
        </div>
        <Switch
          id="includeCompanyDetails"
          checked={settings.includeCompanyDetails}
          onCheckedChange={(checked) => onToggle("includeCompanyDetails", checked)}
        />
      </div>

      {settings.includeCompanyLogo && (
        <div className="space-y-3 rounded-md border p-3">
          <div>
            <Label>Report logo size</Label>
            <p className="text-xs text-muted-foreground">
              Overrides Company Details size for reports only. Payslips use Payslip Design.
            </p>
          </div>
          {previewUrl ? (
            <div className="flex items-start gap-4">
              <img
                src={previewUrl}
                alt="Report logo preview"
                style={{
                  width: settings.reportLogoWidth,
                  height: settings.reportLogoHeight,
                  objectFit: settings.reportLogoFit,
                }}
                className="shrink-0 rounded-md border bg-muted/30 p-1"
              />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <Label htmlFor="reportLogoWidth">Width ({settings.reportLogoWidth}px)</Label>
                  <Slider
                    id="reportLogoWidth"
                    min={40}
                    max={320}
                    step={1}
                    value={[settings.reportLogoWidth]}
                    onValueChange={(value) => onChange({ reportLogoWidth: value[0] })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="reportLogoHeight">Height ({settings.reportLogoHeight}px)</Label>
                  <Slider
                    id="reportLogoHeight"
                    min={24}
                    max={120}
                    step={1}
                    value={[settings.reportLogoHeight]}
                    onValueChange={(value) => onChange({ reportLogoHeight: value[0] })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="reportLogoFit">Fit</Label>
                  <Select
                    value={settings.reportLogoFit}
                    onValueChange={(value) => onChange({ reportLogoFit: value as ReportLogoFit })}
                  >
                    <SelectTrigger id="reportLogoFit" className="mt-1">
                      <SelectValue placeholder="Select fit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contain">Contain</SelectItem>
                      <SelectItem value="cover">Cover</SelectItem>
                      <SelectItem value="fill">Fill</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="scale-down">Scale Down</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Upload a logo under Settings → Company Details to preview size here.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportHeaderOptions;
