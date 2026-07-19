"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ReportDesignSettings } from "@/lib/report-design-interfaces";

type Props = {
  settings: ReportDesignSettings;
  onToggle: (key: "includeCompanyLogo" | "includeCompanyDetails", checked: boolean) => void;
};

const ReportHeaderOptions: React.FC<Props> = ({ settings, onToggle }) => {
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
    </div>
  );
};

export default ReportHeaderOptions;
