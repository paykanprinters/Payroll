"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import useReportDesignSettings from "@/hooks/use-report-design-settings";
import type { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import ReportDesignPreview from "@/components/settings/report-design/ReportDesignPreview";
import { Loader2 } from "lucide-react";

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 20;

const ReportDesign: React.FC = () => {
  const { settings: liveSettings, isLoading, save } = useReportDesignSettings();
  const { companyDetails } = usePayrollProcessor();
  const [settings, setSettings] = useState<ReportDesignSettings>(liveSettings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSettings(liveSettings);
  }, [liveSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    await save(settings);
    setIsSaving(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Report Design</CardTitle>
          <CardDescription>
            Customize paper size, header content, and typography for report preview, PDF download, and
            print. Changes apply across the Reports library and payroll pack exports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading saved settings…
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Layout Options</h3>
            <div>
              <Label htmlFor="defaultReportPaperSize">Paper Size</Label>
              <Select
                onValueChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    defaultReportPaperSize: value as ReportDesignSettings["defaultReportPaperSize"],
                  }))
                }
                value={settings.defaultReportPaperSize}
              >
                <SelectTrigger id="defaultReportPaperSize" className="mt-1 w-[220px]">
                  <SelectValue placeholder="Select paper size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Letter">US Letter (8.5 x 11 in)</SelectItem>
                  <SelectItem value="A4">A4 (210 x 297 mm)</SelectItem>
                  <SelectItem value="A5">A5 (148 x 210 mm)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Header Content</h3>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="includeCompanyLogo">Show Company Logo</Label>
              <Switch
                id="includeCompanyLogo"
                checked={settings.includeCompanyLogo}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, includeCompanyLogo: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="includeCompanyDetails">Show Company Details</Label>
              <Switch
                id="includeCompanyDetails"
                checked={settings.includeCompanyDetails}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, includeCompanyDetails: checked }))
                }
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Text Appearance</h3>
            <div>
              <Label htmlFor="reportContentFontSize">
                Report Content Font Size ({settings.reportContentFontSize}px)
              </Label>
              <Slider
                id="reportContentFontSize"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                step={1}
                value={[settings.reportContentFontSize]}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, reportContentFontSize: value[0] }))
                }
                className="mt-2"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              IRP5 certificate font size is controlled under Tax Liabilities.
            </p>
          </div>

          <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Report Design"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Live preview</CardTitle>
          <CardDescription>
            Matches the chrome used when you preview, download, or print from Reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto bg-muted/30 p-4">
          <ReportDesignPreview settings={settings} companyDetails={companyDetails} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportDesign;
